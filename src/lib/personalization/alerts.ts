/**
 * Hatsi360 Markets — the price alert evaluation engine.
 *
 * Phase 08 §6.4 lists ten integrity rules. This file is those rules, as pure
 * logic with no database and no network access, so every one of them can be
 * tested directly rather than inferred from a UI.
 *
 * The design decision that shapes everything here: **an alert that cannot be
 * evaluated must say so.** §6.4 rule 10 requires an explanation, and the reason
 * is not politeness — an engine that silently returns "no trigger" is
 * indistinguishable from one that is broken, and the user cannot tell the
 * difference between "your condition is not met" and "we have no data to check".
 *
 * Comparability is not redefined here. `areCompatible` and `seriesKeyId` from
 * `src/lib/trade/series.ts` are the platform's single definition of which prices
 * may be compared, and §15 forbids a second one. The one exception is the
 * spread alert, whose entire purpose is to cross markets — and even then every
 * dimension except market is still checked.
 */

import {
  areCompatible,
  calculateSpread,
  type OpportunityObservation,
  type SeriesKey,
} from '@/lib/trade';

/* ------------------------------------------------------------ the alert -- */

/**
 * The six conditions §6.1 specifies.
 *
 * §6.1F (market spread) is deliberately gated: it requires two compatible
 * markets, and `calculateSpread` already refuses to produce a number otherwise.
 */
export const ALERT_CONDITIONS = [
  'price_above',
  'price_below',
  'percent_increase',
  'percent_decrease',
  'new_price_published',
  'market_spread',
] as const;

export type AlertCondition = (typeof ALERT_CONDITIONS)[number];

/**
 * Whether a threshold alert fires on a crossing or on any qualifying
 * observation.
 *
 * §6.3: *"Default to a crossing-based trigger where appropriate to prevent
 * notification spam."* `crossing` is that default and is what the interface
 * should offer unless the user explicitly opts into the noisier mode.
 */
export const TRIGGER_MODES = ['crossing', 'qualifying_observation'] as const;
export type TriggerMode = (typeof TRIGGER_MODES)[number];

export const DEFAULT_TRIGGER_MODE: TriggerMode = 'crossing';

export interface AlertDefinition {
  id: string;
  name: string;
  condition: AlertCondition;
  /**
   * The series the alert watches. Carries market, grade, unit, currency and
   * price type, so §6.4 rule 3's compatibility check has something to check.
   *
   * For `market_spread` this is the *first* market of the pair; the second is
   * `comparisonSeriesKey`.
   */
  seriesKey: SeriesKey;
  thresholdAmount: number | null;
  thresholdPercent: number | null;
  /** Required for percentage conditions; ignored by the others. */
  comparisonPeriodHours: number | null;
  triggerMode: TriggerMode;
  isActive: boolean;
  expiresAt: string | null;
  /** For `market_spread`: the second market of the pair, when the user chose one. */
  comparisonSeriesKey?: SeriesKey | null;
}

/** The persisted evaluation state. §6.4 rule 6. */
export interface AlertState {
  lastEvaluatedObservationId: string | null;
  lastEvaluatedAt: string | null;
  /** The observation that last produced a notification. §6.4 rule 4. */
  lastTriggeredObservationId: string | null;
  lastTriggeredAt: string | null;
  /**
   * The value the condition was last measured against, for crossing detection.
   *
   * This holds whatever the condition measures — a price, a percentage, or a
   * spread — never a different unit. A percentage alert whose baseline held a
   * price would compare ₦30,000 against a 10% threshold and conclude the
   * condition had always been met.
   */
  baselineValue: number | null;
  baselineObservationId: string | null;
  baselineAt: string | null;
}

export function emptyState(): AlertState {
  return {
    lastEvaluatedObservationId: null,
    lastEvaluatedAt: null,
    lastTriggeredObservationId: null,
    lastTriggeredAt: null,
    baselineValue: null,
    baselineObservationId: null,
    baselineAt: null,
  };
}

/** One observation as the engine needs to see it. */
export interface EvaluableObservation {
  id: string;
  seriesKey: SeriesKey;
  amount: number;
  /** When the price was recorded in the market. Not when it was published. */
  observedAt: string;
  publishedAt: string | null;
  verificationStatus: string;
  marketId: number;
  marketName: string;
  commodityId: number;
  commodityName: string;
  availability?: string | null;
}

/* --------------------------------------------------------- eligibility -- */

/**
 * Which verification statuses may be evaluated.
 *
 * §6.4 rule 2: *"Respect observation verification and publication status."*
 * A withdrawn or corrected observation is not merely stale — it has been
 * retracted or superseded, and alerting on it would tell a user something the
 * platform has already decided is not true.
 */
export const ELIGIBLE_VERIFICATION_STATUSES = ['verified'] as const;

/** Why an observation was excluded, in the platform's own words. */
export const EXCLUSION_REASONS: Record<string, string> = {
  not_published: 'The observation has not been published, so it is not eligible for alerts.',
  withdrawn: 'The observation was withdrawn, so it must not trigger an alert.',
  rejected: 'The observation was rejected during verification.',
  corrected:
    'The observation was corrected and superseded by a later record, so it is not the current figure.',
  pending: 'The observation is still awaiting verification.',
  incompatible:
    'The observation is not comparable with the alert series — the currency, unit, grade or price type differs.',
};

export function exclusionReason(observation: EvaluableObservation): string | null {
  if (observation.publishedAt === null) return EXCLUSION_REASONS.not_published;
  const status = observation.verificationStatus;
  if (status === 'withdrawn') return EXCLUSION_REASONS.withdrawn;
  if (status === 'rejected') return EXCLUSION_REASONS.rejected;
  if (status === 'corrected') return EXCLUSION_REASONS.corrected;
  if (status === 'pending') return EXCLUSION_REASONS.pending;
  if (!(ELIGIBLE_VERIFICATION_STATUSES as readonly string[]).includes(status)) {
    return `The observation's verification status is "${status}", which is not eligible for alerts.`;
  }
  return null;
}

export function isEligible(observation: EvaluableObservation): boolean {
  return exclusionReason(observation) === null;
}

/**
 * Comparability, with the market dimension optionally ignored.
 *
 * Every condition except `market_spread` compares within one market, and uses
 * `areCompatible` unchanged. A spread alert exists to cross markets, so it
 * compares every *other* dimension — commodity, price type, grade, unit,
 * currency, variety — and lets market differ. That is the only relaxation, and
 * it is exactly the one §6.1F permits.
 */
function comparable(
  alert: AlertDefinition,
  observation: EvaluableObservation,
): boolean {
  if (alert.condition !== 'market_spread') {
    return areCompatible(alert.seriesKey, observation.seriesKey);
  }
  // Normalising the market away is safe because every other dimension is still
  // compared by `areCompatible` afterwards.
  const ignoreMarket = (key: SeriesKey): SeriesKey => ({ ...key, marketId: null });
  return areCompatible(ignoreMarket(alert.seriesKey), ignoreMarket(observation.seriesKey));
}

/* ---------------------------------------------------------- evaluation -- */

export type EvaluationOutcome = 'triggered' | 'not_triggered' | 'cannot_evaluate';

export interface ObservationSummary {
  id: string;
  amount: number;
  currency: string;
  unit: string | null;
  observedAt: string;
  publishedAt: string | null;
  marketId: number;
  marketName: string;
  commodityId: number;
  commodityName: string;
  verificationStatus: string;
}

export type MeasuredKind = 'price' | 'percent' | 'spread';

export interface EvaluationResult {
  outcome: EvaluationOutcome;
  /** Always present. §6.4 rule 10. */
  reason: string;
  /** The observation that triggered, when one did. */
  triggeringObservationId: string | null;
  currentObservation: ObservationSummary | null;
  previousObservation: ObservationSummary | null;
  threshold: number | null;
  /** What was actually measured — a price, a percentage, or a spread. */
  observedValue: number | null;
  observedValueKind: MeasuredKind | 'none';
  /** The state to persist. §6.4 rule 6. */
  nextState: AlertState;
  evaluatedAt: string;
  /** How many observations were considered and how many excluded, and why. */
  considered: { eligible: number; excluded: number; exclusionReasons: string[] };
}

export interface EvaluateInput {
  alert: AlertDefinition;
  state: AlertState;
  /** Every observation the caller holds for this series. Not just the newest. */
  observations: EvaluableObservation[];
  now: Date;
}

/** The single value a condition is measured against, in the condition's unit. */
interface Measurement {
  value: number;
  kind: MeasuredKind;
  current: EvaluableObservation;
  previous: EvaluableObservation | null;
  threshold: number | null;
}

/**
 * Evaluate one alert against the observations available to it.
 *
 * The order of the checks is the order of the rules, and each early return
 * carries the rule that produced it. Nothing here is allowed to fail silently.
 */
export function evaluateAlert(input: EvaluateInput): EvaluationResult {
  const { alert, state, observations, now } = input;
  const evaluatedAt = now.toISOString();
  const threshold = alert.thresholdAmount ?? alert.thresholdPercent ?? null;

  const base = (reason: string, extra: Partial<EvaluationResult> = {}): EvaluationResult => ({
    outcome: 'cannot_evaluate',
    reason,
    triggeringObservationId: null,
    currentObservation: null,
    previousObservation: null,
    threshold,
    observedValue: null,
    observedValueKind: 'none',
    nextState: { ...state, lastEvaluatedAt: evaluatedAt },
    evaluatedAt,
    considered: { eligible: 0, excluded: 0, exclusionReasons: [] },
    ...extra,
  });

  /* An inactive or expired alert is not evaluated at all. ----------------- */
  if (!alert.isActive) {
    return base('The alert is paused, so its condition was not evaluated.', {
      outcome: 'not_triggered',
    });
  }
  if (alert.expiresAt && new Date(alert.expiresAt).getTime() <= now.getTime()) {
    return base('The alert has expired, so its condition was not evaluated.', {
      outcome: 'not_triggered',
    });
  }

  /* Rules 1, 2, 8: eligibility and comparability. ------------------------ */
  const eligible: EvaluableObservation[] = [];
  const exclusionReasons: string[] = [];
  for (const observation of observations) {
    const reason = exclusionReason(observation);
    if (reason) {
      exclusionReasons.push(reason);
      continue;
    }
    // Rule 3: comparability, decided by the platform's single definition.
    if (!comparable(alert, observation)) {
      exclusionReasons.push(EXCLUSION_REASONS.incompatible);
      continue;
    }
    eligible.push(observation);
  }

  const considered = {
    eligible: eligible.length,
    excluded: observations.length - eligible.length,
    exclusionReasons: [...new Set(exclusionReasons)],
  };

  if (eligible.length === 0) {
    const detail =
      considered.excluded === 0
        ? 'No observations have been recorded for this series yet.'
        : (considered.exclusionReasons[0] ??
          'Every observation for this series was excluded as ineligible.');
    return base(
      `This alert cannot be evaluated: ${detail} An alert is only evaluated against ` +
        'eligible published observations with a matching currency, unit, grade and price type.',
      { considered },
    );
  }

  /* Rule 7: out-of-order and delayed observations. ----------------------- */
  // Selection is by observation time, never by arrival order, so a late
  // observation cannot displace a fresher one.
  const ordered = [...eligible].sort(compareByObservedAt);

  /* The measurement itself, in the unit the condition is expressed in. ---- */
  const measured = measure(alert, ordered);
  if ('reason' in measured) {
    return base(measured.reason, { considered });
  }
  const { value, kind, current, previous, threshold: measuredThreshold } = measured;

  const finish = (
    outcome: EvaluationOutcome,
    reason: string,
    stateOverride?: Partial<AlertState>,
  ): EvaluationResult => ({
    outcome,
    reason,
    triggeringObservationId: outcome === 'triggered' ? current.id : null,
    currentObservation: summarise(current),
    previousObservation: previous ? summarise(previous) : null,
    threshold: measuredThreshold,
    observedValue: value,
    observedValueKind: kind,
    nextState: {
      ...state,
      lastEvaluatedAt: evaluatedAt,
      lastEvaluatedObservationId: current.id,
      ...stateOverride,
    },
    evaluatedAt,
    considered,
  });

  const withBaseline = (): Partial<AlertState> => ({
    baselineValue: value,
    baselineObservationId: current.id,
    baselineAt: current.observedAt,
  });

  /** A trigger must also record itself, or rule 4 cannot suppress a repeat. */
  const asTriggered = (): Partial<AlertState> => ({
    ...withBaseline(),
    lastTriggeredObservationId: current.id,
    lastTriggeredAt: evaluatedAt,
  });

  /* `new_price_published` is an event on publication, not on value. ------- */
  if (alert.condition === 'new_price_published') {
    // Rule 4: never twice for the same observation.
    if (state.lastTriggeredObservationId === current.id) {
      return finish(
        'not_triggered',
        'A notification has already been sent for this observation, so it was not sent again.',
      );
    }
    // Rule 5: nothing new published since the last evaluation.
    const nothingNew =
      state.lastEvaluatedAt !== null &&
      current.publishedAt !== null &&
      new Date(current.publishedAt).getTime() <= new Date(state.lastEvaluatedAt).getTime();
    if (nothingNew) {
      return finish(
        'not_triggered',
        'No new observation has been published for this series since the last evaluation.',
      );
    }
    return finish(
      'triggered',
      'A new eligible observation was published for this series.',
      asTriggered(),
    );
  }

  const satisfied = satisfies(alert, value);

  if (!satisfied) {
    return finish(
      'not_triggered',
      describeUnsatisfied(alert, value, measuredThreshold),
      // The condition is not met, but this observation is now the baseline, so
      // the next evaluation can detect a crossing away from it.
      withBaseline(),
    );
  }

  /* Rule 4: no duplicate notification for the triggering observation. ----- */
  if (state.lastTriggeredObservationId === current.id) {
    return finish(
      'not_triggered',
      'A notification has already been sent for this observation, so it was not sent again.',
    );
  }

  /* Crossing semantics. §6.3. -------------------------------------------- */
  if (alert.triggerMode === 'crossing') {
    // No baseline means no crossing can be established. This is what stops an
    // alert created while the price is already above the threshold from firing
    // immediately — §6.3's explicit requirement.
    if (state.baselineValue === null) {
      return finish(
        'not_triggered',
        'The condition is met, but no baseline has been established yet, so no crossing ' +
          'can be confirmed. The alert will notify when the condition is newly met after ' +
          'this evaluation.',
        withBaseline(),
      );
    }
    // Rule 5: the condition was already met and has not changed.
    if (satisfies(alert, state.baselineValue)) {
      return finish(
        'not_triggered',
        'The condition remains met from the previous evaluation, so it has not newly been ' +
          'crossed and no notification was sent.',
        withBaseline(),
      );
    }
  }

  return finish(
    'triggered',
    describeTriggered(alert, value, measuredThreshold),
    asTriggered(),
  );
}

/* ------------------------------------------------------------ measuring -- */

/**
 * Turn the ordered observations into the single value the condition is about.
 *
 * Returns a `{ reason }` — never a fabricated number — when the condition
 * cannot be measured.
 */
function measure(
  alert: AlertDefinition,
  ordered: EvaluableObservation[],
): Measurement | { reason: string } {
  const latest = ordered[ordered.length - 1];
  const previous = ordered.length > 1 ? ordered[ordered.length - 2] : null;
  const threshold = alert.thresholdAmount ?? alert.thresholdPercent ?? null;

  switch (alert.condition) {
    case 'price_above':
    case 'price_below':
    case 'new_price_published': {
      if (alert.condition !== 'new_price_published' && alert.thresholdAmount === null) {
        return { reason: 'This alert has no amount threshold configured, so it cannot be evaluated.' };
      }
      return { value: latest.amount, kind: 'price', current: latest, previous, threshold };
    }

    case 'percent_increase':
    case 'percent_decrease': {
      if (alert.thresholdPercent === null) {
        return {
          reason:
            'This alert has no percentage threshold configured, so it cannot be evaluated.',
        };
      }
      if (!previous) {
        return {
          reason:
            'A percentage movement needs a prior comparable observation, and none exists for ' +
            'this series, so no movement can be calculated.',
        };
      }
      const windowHours = alert.comparisonPeriodHours;
      if (windowHours !== null) {
        const gapHours =
          (new Date(latest.observedAt).getTime() - new Date(previous.observedAt).getTime()) /
          3_600_000;
        if (gapHours > windowHours) {
          return {
            reason:
              `The prior comparable observation is ${Math.round(gapHours)}h before the latest, ` +
              `outside the ${windowHours}h comparison period, so the movement cannot be ` +
              'measured as configured.',
          };
        }
      }
      if (previous.amount === 0) {
        return {
          reason:
            'The prior observation recorded a zero amount, so a percentage change cannot be ' +
            'calculated from it.',
        };
      }
      const change = ((latest.amount - previous.amount) / previous.amount) * 100;
      return { value: round(change), kind: 'percent', current: latest, previous, threshold };
    }

    case 'market_spread': {
      if (alert.thresholdAmount === null) {
        return {
          reason: 'This spread alert has no threshold configured, so it cannot be evaluated.',
        };
      }
      // §6.1F: never a spread from incompatible grades, currencies, units or
      // price types. `calculateSpread` enforces exactly that, and refuses to
      // return a number when it cannot.
      const asOpportunity: OpportunityObservation[] = ordered.map((observation) => ({
        id: observation.id,
        seriesKey: observation.seriesKey,
        amount: observation.amount,
        collectedAt: observation.observedAt,
        marketId: observation.marketId,
        marketName: observation.marketName,
        commodityId: observation.commodityId,
        commodityName: observation.commodityName,
        verificationStatus: observation.verificationStatus,
        publishedAt: observation.publishedAt,
        availability: observation.availability ?? null,
      }));
      const spread = calculateSpread(asOpportunity, { publishedOnly: true });
      if (!spread.available || spread.spread === null) {
        return {
          reason: `This spread alert cannot be evaluated: ${
            spread.reason ?? 'no comparable pair exists.'
          }`,
        };
      }
      // A spread is between two markets, so the observation shown alongside the
      // current one is the *other* side of the pair, not an earlier row in
      // time. Without it a notification would name one market and imply a
      // movement, when what moved is the gap between two.
      const pairMarkets = [spread.buyMarket?.marketId, spread.sellMarket?.marketId];
      const other = ordered.find(
        (observation) =>
          observation.marketId !== latest.marketId && pairMarkets.includes(observation.marketId),
      );
      return {
        value: round(spread.spread),
        kind: 'spread',
        current: latest,
        previous: other ?? null,
        threshold,
      };
    }
  }
}

function satisfies(alert: AlertDefinition, value: number): boolean {
  switch (alert.condition) {
    case 'price_above':
      return alert.thresholdAmount !== null && value > alert.thresholdAmount;
    case 'price_below':
      return alert.thresholdAmount !== null && value < alert.thresholdAmount;
    case 'percent_increase':
      return alert.thresholdPercent !== null && value >= alert.thresholdPercent;
    case 'percent_decrease':
      return alert.thresholdPercent !== null && value <= -alert.thresholdPercent;
    case 'market_spread':
      return alert.thresholdAmount !== null && value >= alert.thresholdAmount;
    case 'new_price_published':
      return true;
  }
}

/* ------------------------------------------------------------- results -- */

function summarise(observation: EvaluableObservation): ObservationSummary {
  return {
    id: observation.id,
    amount: observation.amount,
    currency: observation.seriesKey.currencyCode,
    unit: observation.seriesKey.unitId === null ? null : String(observation.seriesKey.unitId),
    observedAt: observation.observedAt,
    publishedAt: observation.publishedAt,
    marketId: observation.marketId,
    marketName: observation.marketName,
    commodityId: observation.commodityId,
    commodityName: observation.commodityName,
    verificationStatus: observation.verificationStatus,
  };
}

/* ---------------------------------------------------------- baselines -- */

/**
 * Establish the baseline an alert is measured against.
 *
 * §6.3 is explicit: *"if an alert is set to ₦X and the latest eligible price is
 * already above the threshold when the alert is created, do not immediately
 * notify unless the user explicitly selects immediate-condition
 * notifications."*
 *
 * The way to honour that is to record the current value as the baseline at
 * creation, so the first evaluation sees the condition as already met rather
 * than newly met. This function does that, and returns the state to persist.
 *
 * The baseline holds whatever the condition measures — a price, a percentage or
 * a spread — because the crossing test compares it against the same threshold
 * the condition uses.
 */
export function establishBaseline(
  alert: AlertDefinition,
  observations: EvaluableObservation[],
  now: Date,
): AlertState {
  const evaluatedAt = now.toISOString();
  const eligible = observations.filter(
    (observation) => exclusionReason(observation) === null && comparable(alert, observation),
  );
  const ordered = [...eligible].sort(compareByObservedAt);

  if (ordered.length === 0) {
    return { ...emptyState(), lastEvaluatedAt: evaluatedAt };
  }

  const measured = measure(alert, ordered);
  if ('reason' in measured) {
    // Not measurable yet — for example a percentage alert with only one
    // observation. The baseline stays empty, and the first measurable evaluation
    // establishes it.
    return { ...emptyState(), lastEvaluatedAt: evaluatedAt };
  }

  return {
    ...emptyState(),
    lastEvaluatedAt: evaluatedAt,
    lastEvaluatedObservationId: measured.current.id,
    baselineValue: measured.value,
    baselineObservationId: measured.current.id,
    baselineAt: measured.current.observedAt,
  };
}

/* ------------------------------------------------------ the payload -- */

/**
 * The notification an alert trigger produces.
 *
 * §6.3 lists what a triggered alert must contain. This is that list, as a
 * structure, so no delivery channel can omit part of it.
 */
export interface AlertNotificationPayload {
  alertId: string;
  alertName: string;
  condition: AlertCondition;
  commodityId: number;
  commodityName: string;
  marketId: number;
  marketName: string;
  currency: string;
  previousObservation: ObservationSummary | null;
  currentObservation: ObservationSummary | null;
  threshold: number | null;
  observedValue: number | null;
  observedValueKind: MeasuredKind;
  reason: string;
  evaluatedAt: string;
  /** Where the notification should take the user. §6.3's last requirement. */
  linkPath: string;
}

export function buildAlertNotification(
  alert: AlertDefinition,
  result: EvaluationResult,
): AlertNotificationPayload | null {
  const current = result.currentObservation;
  if (result.outcome !== 'triggered' || !current || result.observedValueKind === 'none') {
    return null;
  }
  return {
    alertId: alert.id,
    alertName: alert.name,
    condition: alert.condition,
    commodityId: alert.seriesKey.commodityId,
    commodityName: current.commodityName,
    marketId: current.marketId,
    marketName: current.marketName,
    currency: alert.seriesKey.currencyCode,
    previousObservation: result.previousObservation,
    currentObservation: current,
    threshold: result.threshold,
    observedValue: result.observedValue,
    observedValueKind: result.observedValueKind,
    reason: result.reason,
    evaluatedAt: result.evaluatedAt,
    linkPath: `/commodities/${alert.seriesKey.commodityId}`,
  };
}

/* ------------------------------------------------------------ helpers -- */

function compareByObservedAt(a: EvaluableObservation, b: EvaluableObservation): number {
  const diff = new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime();
  // A stable tie-break, so two observations stamped identically still order
  // deterministically rather than by insertion luck.
  return diff !== 0 ? diff : a.id.localeCompare(b.id);
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function describeUnsatisfied(
  alert: AlertDefinition,
  value: number,
  threshold: number | null,
): string {
  switch (alert.condition) {
    case 'price_above':
      return `The latest eligible price is ${value}, which is not above the ${threshold} threshold.`;
    case 'price_below':
      return `The latest eligible price is ${value}, which is not below the ${threshold} threshold.`;
    case 'percent_increase':
      return `The latest comparable movement is ${value}%, which has not reached the ${threshold}% increase threshold.`;
    case 'percent_decrease':
      return `The latest comparable movement is ${value}%, which has not reached the ${threshold}% decrease threshold.`;
    case 'market_spread':
      return `The observed spread is ${value}, which is below the ${threshold} threshold.`;
    default:
      return 'The condition is not met.';
  }
}

function describeTriggered(
  alert: AlertDefinition,
  value: number,
  threshold: number | null,
): string {
  switch (alert.condition) {
    case 'price_above':
      return `The latest eligible price is ${value}, which is above the ${threshold} threshold.`;
    case 'price_below':
      return `The latest eligible price is ${value}, which is below the ${threshold} threshold.`;
    case 'percent_increase':
      return `The comparable price increased by ${value}%, meeting the ${threshold}% threshold.`;
    case 'percent_decrease':
      return `The comparable price decreased by ${Math.abs(value)}%, meeting the ${threshold}% threshold.`;
    case 'market_spread':
      return `The observed spread is ${value}, meeting the ${threshold} threshold.`;
    default:
      return 'The condition is met.';
  }
}
