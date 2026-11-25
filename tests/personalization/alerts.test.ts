import { describe, expect, it } from 'vitest';
import {
  ALERT_CONDITIONS,
  buildAlertNotification,
  establishBaseline,
  evaluateAlert,
  exclusionReason,
  isEligible,
  emptyState,
  type AlertDefinition,
  type AlertState,
  type EvaluableObservation,
} from '@/lib/personalization/alerts';
import type { SeriesKey } from '@/lib/trade';

/**
 * The ten §6.4 integrity rules, as tests.
 *
 * Each describe block below is one rule from the brief. The tests are written
 * against the rule, not against the implementation, so a refactor that breaks a
 * rule fails here rather than in production.
 *
 * The rule that matters most is the last one: an alert that cannot be evaluated
 * must say so. An engine that returns "not triggered" when it has no data is
 * indistinguishable from one that is broken, and the user has no way to tell.
 */

const NOW = new Date('2026-11-14T12:00:00.000Z');

const SERIES: SeriesKey = {
  commodityId: 1,
  marketId: 5,
  priceType: 'wholesale_asking',
  gradeId: null,
  unitId: 1,
  currencyCode: 'NGN',
  varietyId: null,
};

function alert(overrides: Partial<AlertDefinition> = {}): AlertDefinition {
  return {
    id: 'alert-1',
    name: 'Maize above threshold',
    condition: 'price_above',
    seriesKey: SERIES,
    thresholdAmount: 30000,
    thresholdPercent: null,
    comparisonPeriodHours: null,
    triggerMode: 'crossing',
    isActive: true,
    expiresAt: null,
    ...overrides,
  };
}

function observation(
  id: string,
  amount: number,
  observedAt: string,
  overrides: Partial<EvaluableObservation> = {},
): EvaluableObservation {
  return {
    id,
    seriesKey: SERIES,
    amount,
    observedAt,
    publishedAt: observedAt,
    verificationStatus: 'verified',
    marketId: SERIES.marketId!,
    marketName: 'Dawanau',
    commodityId: SERIES.commodityId,
    commodityName: 'Maize',
    ...overrides,
  };
}

function evaluate(
  a: AlertDefinition,
  observations: EvaluableObservation[],
  state: AlertState = emptyState(),
  now: Date = NOW,
) {
  return evaluateAlert({ alert: a, state, observations, now });
}

/* --------------------------------------------------- rule 1 and 2 -------- */

describe('rule 1 and 2 — only eligible published observations are evaluated', () => {
  it('an unpublished observation cannot trigger an alert', () => {
    const result = evaluate(alert(), [
      observation('o1', 45000, '2026-11-10T00:00:00.000Z', { publishedAt: null }),
    ]);
    expect(result.outcome).toBe('cannot_evaluate');
    expect(result.reason).toContain('has not been published');
  });

  it('a withdrawn observation cannot trigger an alert', () => {
    const result = evaluate(alert(), [
      observation('o1', 45000, '2026-11-10T00:00:00.000Z', { verificationStatus: 'withdrawn' }),
    ]);
    expect(result.outcome).toBe('cannot_evaluate');
    expect(result.reason).toContain('withdrawn');
  });

  it('a rejected observation cannot trigger an alert', () => {
    const result = evaluate(alert(), [
      observation('o1', 45000, '2026-11-10T00:00:00.000Z', { verificationStatus: 'rejected' }),
    ]);
    expect(result.outcome).toBe('cannot_evaluate');
    expect(result.reason).toContain('rejected');
  });

  it('a corrected observation is superseded and does not trigger', () => {
    const result = evaluate(alert(), [
      observation('o1', 45000, '2026-11-10T00:00:00.000Z', { verificationStatus: 'corrected' }),
    ]);
    expect(result.outcome).toBe('cannot_evaluate');
    expect(result.reason).toContain('corrected');
  });

  it('a pending observation cannot trigger an alert', () => {
    const result = evaluate(alert(), [
      observation('o1', 45000, '2026-11-10T00:00:00.000Z', { verificationStatus: 'pending' }),
    ]);
    expect(result.outcome).toBe('cannot_evaluate');
    expect(result.reason).toContain('awaiting verification');
  });

  it('explains the exclusion when every observation is ineligible', () => {
    const result = evaluate(alert(), [
      observation('o1', 45000, '2026-11-10T00:00:00.000Z', { publishedAt: null }),
      observation('o2', 46000, '2026-11-11T00:00:00.000Z', { verificationStatus: 'withdrawn' }),
    ]);
    expect(result.outcome).toBe('cannot_evaluate');
    expect(result.considered.excluded).toBe(2);
    expect(result.considered.exclusionReasons.length).toBeGreaterThan(0);
  });

  it('classifies eligibility without a threshold in sight', () => {
    expect(isEligible(observation('o1', 100, '2026-11-10T00:00:00.000Z'))).toBe(true);
    expect(
      isEligible(observation('o1', 100, '2026-11-10T00:00:00.000Z', { publishedAt: null })),
    ).toBe(false);
  });
});

/* --------------------------------------------------- rule 3 ------------ */

describe('rule 3 — currency, unit, grade and price type compatibility', () => {
  it('an observation in another currency is not evaluated', () => {
    const result = evaluate(alert(), [
      observation('o1', 45000, '2026-11-10T00:00:00.000Z', {
        seriesKey: { ...SERIES, currencyCode: 'USD' },
      }),
    ]);
    expect(result.outcome).toBe('cannot_evaluate');
    expect(result.reason).toContain('currency, unit, grade or price type');
  });

  it('an observation in another unit is not evaluated', () => {
    const result = evaluate(alert(), [
      observation('o1', 45000, '2026-11-10T00:00:00.000Z', {
        seriesKey: { ...SERIES, unitId: 2 },
      }),
    ]);
    expect(result.outcome).toBe('cannot_evaluate');
  });

  it('an observation of another grade is not evaluated', () => {
    const result = evaluate(alert(), [
      observation('o1', 45000, '2026-11-10T00:00:00.000Z', {
        seriesKey: { ...SERIES, gradeId: 7 },
      }),
    ]);
    expect(result.outcome).toBe('cannot_evaluate');
  });

  it('an observation of another price type is not evaluated', () => {
    // Farmgate maize must not trigger an alert watching wholesale maize.
    const result = evaluate(alert(), [
      observation('o1', 45000, '2026-11-10T00:00:00.000Z', {
        seriesKey: { ...SERIES, priceType: 'farmgate' },
      }),
    ]);
    expect(result.outcome).toBe('cannot_evaluate');
  });

  it('an observation from another market is not evaluated', () => {
    // Comparability is decided by the series key, not the metadata alongside
    // it, so the market must be changed in the key itself.
    const result = evaluate(alert(), [
      observation('o1', 45000, '2026-11-10T00:00:00.000Z', {
        seriesKey: { ...SERIES, marketId: 99 },
        marketId: 99,
      }),
    ]);
    expect(result.outcome).toBe('cannot_evaluate');
  });

  it('a compatible observation is evaluated', () => {
    const result = evaluate(alert(), [observation('o1', 45000, '2026-11-10T00:00:00.000Z')]);
    expect(result.outcome).not.toBe('cannot_evaluate');
    expect(result.considered.eligible).toBe(1);
  });
});

/* --------------------------------------------------- rule 10 ----------- */

describe('rule 10 — an alert that cannot be evaluated explains itself', () => {
  it('says so when there are no observations at all', () => {
    const result = evaluate(alert(), []);
    expect(result.outcome).toBe('cannot_evaluate');
    expect(result.reason).toContain('No observations have been recorded');
  });

  it('says so when a percentage alert has no prior observation', () => {
    const result = evaluate(
      alert({ condition: 'percent_increase', thresholdAmount: null, thresholdPercent: 10 }),
      [observation('o1', 45000, '2026-11-10T00:00:00.000Z')],
    );
    expect(result.outcome).toBe('cannot_evaluate');
    expect(result.reason).toContain('prior comparable observation');
  });

  it('says so when a threshold alert has no amount configured', () => {
    const result = evaluate(
      alert({ thresholdAmount: null }),
      [observation('o1', 45000, '2026-11-10T00:00:00.000Z')],
    );
    expect(result.outcome).toBe('cannot_evaluate');
    expect(result.reason).toContain('no amount threshold');
  });

  it('every result carries a reason, whatever the outcome', () => {
    const results = [
      evaluate(alert(), []),
      evaluate(alert(), [observation('o1', 45000, '2026-11-10T00:00:00.000Z')]),
      evaluate(alert({ condition: 'price_below' }), [
        observation('o1', 45000, '2026-11-10T00:00:00.000Z'),
      ]),
    ];
    for (const result of results) {
      expect(result.reason.length).toBeGreaterThan(0);
    }
  });

  it('names the reason an observation was excluded', () => {
    expect(exclusionReason(observation('o1', 1, '2026-11-10T00:00:00.000Z'))).toBeNull();
    expect(
      exclusionReason(
        observation('o1', 1, '2026-11-10T00:00:00.000Z', { verificationStatus: 'weird' }),
      ),
    ).toContain('weird');
  });
});

/* --------------------------------------------------- rules 4 and 5 ----- */

describe('rules 4 and 5 — no duplicate and no repeated notifications', () => {
  it('does not re-notify for the observation that already triggered', () => {
    const observations = [observation('o1', 45000, '2026-11-10T00:00:00.000Z')];
    const state: AlertState = {
      ...emptyState(),
      lastEvaluatedObservationId: 'o1',
      lastEvaluatedAt: '2026-11-11T00:00:00.000Z',
      lastTriggeredObservationId: 'o1',
      lastTriggeredAt: '2026-11-11T00:00:00.000Z',
      baselineValue: 29000,
      baselineObservationId: 'o0',
      baselineAt: '2026-11-01T00:00:00.000Z',
    };
    const result = evaluate(alert(), observations, state);
    expect(result.outcome).toBe('not_triggered');
    expect(result.reason).toContain('already been sent');
  });

  it('does not re-notify when nothing new has arrived', () => {
    const observations = [observation('o1', 45000, '2026-11-10T00:00:00.000Z')];
    const state: AlertState = {
      ...emptyState(),
      lastEvaluatedObservationId: 'o1',
      lastEvaluatedAt: '2026-11-11T00:00:00.000Z',
      // The baseline holds what the condition measures. For a price_above
      // alert that is a price, and it must be the price that was measured.
      baselineValue: 45000,
      baselineObservationId: 'o1',
      baselineAt: '2026-11-10T00:00:00.000Z',
    };
    const result = evaluate(alert(), observations, state);
    expect(result.outcome).toBe('not_triggered');
    expect(result.reason).toContain('remains met');
  });

  it('does not notify when an unchanged condition stays met', () => {
    const observations = [
      observation('o1', 29000, '2026-11-01T00:00:00.000Z'),
      observation('o2', 45000, '2026-11-10T00:00:00.000Z'),
    ];
    const state: AlertState = {
      ...emptyState(),
      lastEvaluatedObservationId: 'o1',
      lastEvaluatedAt: '2026-11-02T00:00:00.000Z',
      baselineValue: 29000,
      baselineObservationId: 'o1',
      baselineAt: '2026-11-01T00:00:00.000Z',
    };
    const first = evaluate(alert(), observations, state);
    expect(first.outcome).toBe('triggered');

    // A third observation arrives, still above the threshold. No new crossing.
    const withThird = [...observations, observation('o3', 46000, '2026-11-12T00:00:00.000Z')];
    const second = evaluate(alert(), withThird, first.nextState);
    expect(second.outcome).toBe('not_triggered');
    expect(second.reason).toContain('remains met');
  });
});

/* --------------------------------------------------- §6.3 crossing ----- */

describe('§6.3 — crossing-based triggering, and no notification at creation', () => {
  it('does not notify when the price is already above the threshold at creation', () => {
    // The brief's explicit example: an alert created while the condition is
    // already met must not fire immediately.
    const observations = [observation('o1', 45000, '2026-11-10T00:00:00.000Z')];
    const baseline = establishBaseline(alert(), observations, NOW);
    const result = evaluate(alert(), observations, baseline);
    expect(result.outcome).toBe('not_triggered');
    expect(result.reason).toContain('remains met');
    expect(result.nextState.lastTriggeredObservationId).toBeNull();
  });

  it('does not notify when an alert created with no data later crosses into range', () => {
    // The other creation case: nothing was eligible when the alert was made, so
    // no baseline exists. The first measurable evaluation establishes one
    // rather than firing.
    const observations = [observation('o1', 45000, '2026-11-10T00:00:00.000Z')];
    const createdWithNoData = establishBaseline(alert(), [], NOW);
    expect(createdWithNoData.baselineValue).toBeNull();

    const result = evaluate(alert(), observations, createdWithNoData);
    expect(result.outcome).toBe('not_triggered');
    expect(result.reason).toContain('no baseline has been established');
    expect(result.nextState.baselineValue).toBe(45000);
  });

  it('notifies when the condition is newly met', () => {
    const observations = [
      observation('o1', 29000, '2026-11-01T00:00:00.000Z'),
      observation('o2', 45000, '2026-11-10T00:00:00.000Z'),
    ];
    const state: AlertState = {
      ...emptyState(),
      lastEvaluatedObservationId: 'o1',
      lastEvaluatedAt: '2026-11-02T00:00:00.000Z',
      baselineValue: 29000,
      baselineObservationId: 'o1',
      baselineAt: '2026-11-01T00:00:00.000Z',
    };
    const result = evaluate(alert(), observations, state);
    expect(result.outcome).toBe('triggered');
    expect(result.triggeringObservationId).toBe('o2');
    expect(result.reason).toContain('above the 30000 threshold');
  });

  it('qualifying_observation mode notifies on any qualifying observation', () => {
    const observations = [observation('o1', 45000, '2026-11-10T00:00:00.000Z')];
    const state: AlertState = {
      ...emptyState(),
      lastEvaluatedObservationId: 'o0',
      lastEvaluatedAt: '2026-11-01T00:00:00.000Z',
      baselineValue: 29000,
      baselineObservationId: 'o0',
      baselineAt: '2026-11-01T00:00:00.000Z',
    };
    const result = evaluate(alert({ triggerMode: 'qualifying_observation' }), observations, state);
    expect(result.outcome).toBe('triggered');
  });

  it('a below-threshold alert fires on a downward crossing', () => {
    const a = alert({ condition: 'price_below', thresholdAmount: 30000 });
    const observations = [
      observation('o1', 32000, '2026-11-01T00:00:00.000Z'),
      observation('o2', 28000, '2026-11-10T00:00:00.000Z'),
    ];
    const state: AlertState = {
      ...emptyState(),
      lastEvaluatedObservationId: 'o1',
      lastEvaluatedAt: '2026-11-02T00:00:00.000Z',
      baselineValue: 32000,
      baselineObservationId: 'o1',
      baselineAt: '2026-11-01T00:00:00.000Z',
    };
    const result = evaluate(a, observations, state);
    expect(result.outcome).toBe('triggered');
    expect(result.reason).toContain('below the 30000 threshold');
  });

  it('establishes a baseline from the current price at creation', () => {
    const observations = [observation('o1', 45000, '2026-11-10T00:00:00.000Z')];
    const baseline = establishBaseline(alert(), observations, NOW);
    expect(baseline.baselineValue).toBe(45000);
    expect(baseline.baselineObservationId).toBe('o1');
    expect(baseline.lastTriggeredObservationId).toBeNull();
  });

  it('produces an empty baseline when nothing is eligible yet', () => {
    const baseline = establishBaseline(alert(), [], NOW);
    expect(baseline.baselineValue).toBeNull();
  });
});

/* --------------------------------------------------- rule 7 ------------ */

describe('rule 7 — delayed and out-of-order observations', () => {
  it('selects the latest by observation time, not arrival order', () => {
    const observations = [
      observation('o2', 45000, '2026-11-10T00:00:00.000Z'),
      // A late arrival with an earlier observation time.
      observation('o1', 41000, '2026-11-05T00:00:00.000Z'),
    ];
    const state: AlertState = {
      ...emptyState(),
      lastEvaluatedObservationId: 'o0',
      lastEvaluatedAt: '2026-11-01T00:00:00.000Z',
      baselineValue: 29000,
      baselineObservationId: 'o0',
      baselineAt: '2026-11-01T00:00:00.000Z',
    };
    const result = evaluate(alert(), observations, state);
    expect(result.currentObservation?.id).toBe('o2');
    expect(result.previousObservation?.id).toBe('o1');
  });

  it('orders identically-stamped observations deterministically', () => {
    const observations = [
      observation('b', 45000, '2026-11-10T00:00:00.000Z'),
      observation('a', 44000, '2026-11-10T00:00:00.000Z'),
    ];
    const result = evaluate(alert(), observations);
    // Sorted by observedAt then id, so 'b' is the latest.
    expect(result.currentObservation?.id).toBe('b');
  });

  it('treats a late observation as the previous, not the current', () => {
    const observations = [
      observation('o1', 29000, '2026-11-01T00:00:00.000Z'),
      observation('o3', 47000, '2026-11-12T00:00:00.000Z'),
      observation('o2', 31000, '2026-11-05T00:00:00.000Z'),
    ];
    const state: AlertState = {
      ...emptyState(),
      lastEvaluatedObservationId: 'o1',
      lastEvaluatedAt: '2026-11-02T00:00:00.000Z',
      baselineValue: 29000,
      baselineObservationId: 'o1',
      baselineAt: '2026-11-01T00:00:00.000Z',
    };
    const result = evaluate(alert(), observations, state);
    expect(result.currentObservation?.id).toBe('o3');
    expect(result.previousObservation?.id).toBe('o2');
  });
});

/* --------------------------------------------------- percentage -------- */

describe('percentage movement alerts', () => {
  it('triggers on a qualifying increase', () => {
    const a = alert({
      condition: 'percent_increase',
      thresholdAmount: null,
      thresholdPercent: 10,
    });
    const observations = [
      observation('o1', 30000, '2026-11-01T00:00:00.000Z'),
      observation('o2', 36000, '2026-11-10T00:00:00.000Z'),
    ];
    const state: AlertState = {
      ...emptyState(),
      lastEvaluatedObservationId: 'o1',
      lastEvaluatedAt: '2026-11-02T00:00:00.000Z',
      // A percentage alert's baseline is a percentage, never a price. Storing a
      // price here would compare ₦30,000 against a 10% threshold and conclude
      // the condition had always been met.
      baselineValue: 0,
      baselineObservationId: 'o1',
      baselineAt: '2026-11-01T00:00:00.000Z',
    };
    const result = evaluate(a, observations, state);
    expect(result.outcome).toBe('triggered');
    expect(result.observedValue).toBe(20);
    expect(result.observedValueKind).toBe('percent');
  });

  it('triggers on a qualifying decrease', () => {
    const a = alert({
      condition: 'percent_decrease',
      thresholdAmount: null,
      thresholdPercent: 15,
    });
    const observations = [
      observation('o1', 40000, '2026-11-01T00:00:00.000Z'),
      observation('o2', 30000, '2026-11-10T00:00:00.000Z'),
    ];
    const state: AlertState = {
      ...emptyState(),
      lastEvaluatedObservationId: 'o1',
      lastEvaluatedAt: '2026-11-02T00:00:00.000Z',
      baselineValue: 0,
      baselineObservationId: 'o1',
      baselineAt: '2026-11-01T00:00:00.000Z',
    };
    const result = evaluate(a, observations, state);
    expect(result.outcome).toBe('triggered');
    expect(result.observedValue).toBe(-25);
  });

  it('refuses to measure a movement outside the comparison period', () => {
    const a = alert({
      condition: 'percent_increase',
      thresholdAmount: null,
      thresholdPercent: 10,
      comparisonPeriodHours: 48,
    });
    const observations = [
      observation('o1', 30000, '2026-11-01T00:00:00.000Z'),
      observation('o2', 36000, '2026-11-10T00:00:00.000Z'),
    ];
    const result = evaluate(a, observations);
    expect(result.outcome).toBe('cannot_evaluate');
    expect(result.reason).toContain('comparison period');
  });

  it('refuses to divide by a zero prior amount', () => {
    const a = alert({
      condition: 'percent_increase',
      thresholdAmount: null,
      thresholdPercent: 10,
    });
    const observations = [
      observation('o1', 0, '2026-11-01T00:00:00.000Z'),
      observation('o2', 36000, '2026-11-10T00:00:00.000Z'),
    ];
    const result = evaluate(a, observations);
    expect(result.outcome).toBe('cannot_evaluate');
    expect(result.reason).toContain('zero amount');
  });
});

/* --------------------------------------------------- new publication -- */

describe('new price published alerts', () => {
  it('triggers when a new observation is published', () => {
    const observations = [observation('o1', 45000, '2026-11-10T00:00:00.000Z')];
    const result = evaluate(alert({ condition: 'new_price_published', thresholdAmount: null }), observations);
    expect(result.outcome).toBe('triggered');
    expect(result.reason).toContain('new eligible observation');
  });

  it('does not trigger twice for the same observation', () => {
    const observations = [observation('o1', 45000, '2026-11-10T00:00:00.000Z')];
    const state: AlertState = {
      ...emptyState(),
      lastEvaluatedObservationId: 'o1',
      lastEvaluatedAt: '2026-11-11T00:00:00.000Z',
      lastTriggeredObservationId: 'o1',
      lastTriggeredAt: '2026-11-11T00:00:00.000Z',
    };
    const result = evaluate(alert({ condition: 'new_price_published' }), observations, state);
    expect(result.outcome).toBe('not_triggered');
  });

  it('does not trigger when nothing new was published', () => {
    const observations = [observation('o1', 45000, '2026-11-10T00:00:00.000Z')];
    const state: AlertState = {
      ...emptyState(),
      lastEvaluatedObservationId: 'o0',
      lastEvaluatedAt: '2026-11-14T00:00:00.000Z',
    };
    const result = evaluate(alert({ condition: 'new_price_published' }), observations, state);
    expect(result.outcome).toBe('not_triggered');
    expect(result.reason).toContain('No new observation has been published');
  });
});

/* --------------------------------------------------- spread (6.1F) ---- */

describe('market spread alerts (§6.1F)', () => {
  const OTHER: SeriesKey = { ...SERIES, marketId: 7 };

  /**
   * Observations as they really arrive: each one carries its own market in its
   * series key, because a price belongs to the market it was recorded in.
   */
  function spreadObservations(): EvaluableObservation[] {
    return [
      observation('o1', 28000, '2026-11-10T00:00:00.000Z', {
        marketId: 5,
        marketName: 'Dawanau',
      }),
      observation('o2', 40000, '2026-11-10T00:00:00.000Z', {
        seriesKey: OTHER,
        marketId: 7,
        marketName: 'Mile 12',
      }),
    ];
  }

  const crossedBaseline: AlertState = {
    ...emptyState(),
    lastEvaluatedObservationId: 'o0',
    lastEvaluatedAt: '2026-11-01T00:00:00.000Z',
    baselineValue: 5000,
    baselineObservationId: 'o0',
    baselineAt: '2026-11-01T00:00:00.000Z',
  };

  /**
   * A pre-existing Phase 06 defect, recorded here rather than worked around.
   *
   * `calculateSpread` in `src/lib/trade/opportunities.ts` selects a reference
   * series with `selectReferenceSeries`, then filters every observation against
   * it with `compareSeries` — which compares `marketId`. Two markets therefore
   * never survive the filter together, and the function always returns
   * "Only one comparable observation exists. A spread needs at least two
   * markets."
   *
   * Phase 06's own tests pass only because their fixture holds `seriesKey`
   * constant (marketId 7) while varying the separate `marketId` metadata field,
   * so the reference filter never sees a difference. Real observations, whose
   * series keys carry their own market, cannot produce a spread.
   *
   * §6.1F is explicitly conditional — "where Phase 06 supports reliable
   * comparable market spread calculations" — so the correct behaviour for this
   * engine is to refuse, explain, and let the defect be fixed upstream. The
   * engine delegates to `calculateSpread` rather than reimplementing it, per
   * §15's rule against duplicating existing services.
   */
  describe('Phase 06 cross-market spread is currently unavailable', () => {
    it('refuses to evaluate rather than inventing a spread', () => {
      const a = alert({ condition: 'market_spread', thresholdAmount: 10000 });
      const result = evaluate(a, spreadObservations(), crossedBaseline);
      expect(result.outcome).toBe('cannot_evaluate');
      expect(result.reason).toContain('spread alert cannot be evaluated');
    });

    it('names the real cause, so the failure is diagnosable', () => {
      const a = alert({ condition: 'market_spread', thresholdAmount: 10000 });
      const result = evaluate(a, spreadObservations(), crossedBaseline);
      expect(result.reason).toContain('at least two markets');
    });

    it('never reports a spread figure when the pair is not comparable', () => {
      const a = alert({ condition: 'market_spread', thresholdAmount: 10000 });
      const result = evaluate(a, spreadObservations(), crossedBaseline);
      expect(result.observedValue).toBeNull();
      expect(result.observedValueKind).toBe('none');
    });
  });

  describe('the engine still enforces §6.1F compatibility', () => {
    it('accepts observations from both markets for a spread alert', () => {
      // The one relaxation §6.1F permits: market may differ. Every other
      // dimension is still checked by `areCompatible`.
      const a = alert({ condition: 'market_spread', thresholdAmount: 10000 });
      const result = evaluate(a, spreadObservations(), crossedBaseline);
      expect(result.considered.eligible).toBe(2);
      expect(result.considered.excluded).toBe(0);
    });

    it('still refuses a spread across different price types', () => {
      const a = alert({ condition: 'market_spread', thresholdAmount: 10000 });
      const incompatible = [
        observation('o1', 28000, '2026-11-10T00:00:00.000Z', {
          marketId: 5,
          marketName: 'Dawanau',
        }),
        observation('o2', 40000, '2026-11-10T00:00:00.000Z', {
          seriesKey: { ...OTHER, priceType: 'farmgate' },
          marketId: 7,
          marketName: 'Mile 12',
        }),
      ];
      const result = evaluate(a, incompatible);
      expect(result.outcome).toBe('cannot_evaluate');
      expect(result.considered.excluded).toBe(1);
    });

    it('refuses a spread with no threshold configured', () => {
      const a = alert({ condition: 'market_spread', thresholdAmount: null });
      const result = evaluate(a, spreadObservations(), crossedBaseline);
      expect(result.outcome).toBe('cannot_evaluate');
      expect(result.reason).toContain('no threshold configured');
    });
  });
});

/* --------------------------------------------------- lifecycle --------- */

describe('alert lifecycle', () => {
  it('a paused alert is not evaluated', () => {
    const result = evaluate(
      alert({ isActive: false }),
      [observation('o1', 45000, '2026-11-10T00:00:00.000Z')],
    );
    expect(result.outcome).toBe('not_triggered');
    expect(result.reason).toContain('paused');
  });

  it('an expired alert is not evaluated', () => {
    const result = evaluate(
      alert({ expiresAt: '2026-11-01T00:00:00.000Z' }),
      [observation('o1', 45000, '2026-11-10T00:00:00.000Z')],
    );
    expect(result.outcome).toBe('not_triggered');
    expect(result.reason).toContain('expired');
  });

  it('an alert expiring in the future is still evaluated', () => {
    const result = evaluate(
      alert({ expiresAt: '2026-12-01T00:00:00.000Z' }),
      [observation('o1', 45000, '2026-11-10T00:00:00.000Z')],
    );
    expect(result.outcome).not.toBe('cannot_evaluate');
  });

  it('the next state records the triggering observation', () => {
    const observations = [
      observation('o1', 29000, '2026-11-01T00:00:00.000Z'),
      observation('o2', 45000, '2026-11-10T00:00:00.000Z'),
    ];
    const state: AlertState = {
      ...emptyState(),
      lastEvaluatedObservationId: 'o1',
      lastEvaluatedAt: '2026-11-02T00:00:00.000Z',
      baselineValue: 29000,
      baselineObservationId: 'o1',
      baselineAt: '2026-11-01T00:00:00.000Z',
    };
    const result = evaluate(alert(), observations, state);
    expect(result.nextState.lastTriggeredObservationId).toBe('o2');
    expect(result.nextState.lastTriggeredAt).not.toBeNull();
    expect(result.nextState.lastEvaluatedObservationId).toBe('o2');
  });
});

/* --------------------------------------------------- the payload ------- */

describe('§6.3 — the triggered notification contains what it must', () => {
  function trigger(): ReturnType<typeof evaluate> {
    const observations = [
      observation('o1', 29000, '2026-11-01T00:00:00.000Z'),
      observation('o2', 45000, '2026-11-10T00:00:00.000Z'),
    ];
    const state: AlertState = {
      ...emptyState(),
      lastEvaluatedObservationId: 'o1',
      lastEvaluatedAt: '2026-11-02T00:00:00.000Z',
      baselineValue: 29000,
      baselineObservationId: 'o1',
      baselineAt: '2026-11-01T00:00:00.000Z',
    };
    return evaluate(alert(), observations, state);
  }

  it('carries the alert name, commodity, market and both observations', () => {
    const result = trigger();
    const payload = buildAlertNotification(alert(), result);
    expect(payload).not.toBeNull();
    expect(payload!.alertName).toBe('Maize above threshold');
    expect(payload!.commodityName).toBe('Maize');
    expect(payload!.marketName).toBe('Dawanau');
    expect(payload!.previousObservation?.id).toBe('o1');
    expect(payload!.currentObservation?.id).toBe('o2');
  });

  it('carries the threshold and the observed condition', () => {
    const payload = buildAlertNotification(alert(), trigger());
    expect(payload!.threshold).toBe(30000);
    expect(payload!.observedValue).toBe(45000);
    expect(payload!.currency).toBe('NGN');
  });

  it('carries a link to the commodity page', () => {
    const payload = buildAlertNotification(alert(), trigger());
    expect(payload!.linkPath).toBe('/commodities/1');
  });

  it('produces no payload when nothing triggered', () => {
    const result = evaluate(alert(), []);
    expect(buildAlertNotification(alert(), result)).toBeNull();
  });
});

describe('the condition vocabulary', () => {
  it('covers all six §6.1 conditions', () => {
    expect(ALERT_CONDITIONS).toEqual([
      'price_above',
      'price_below',
      'percent_increase',
      'percent_decrease',
      'new_price_published',
      'market_spread',
    ]);
  });
});
