/**
 * Hatsi360 pricing rules.
 *
 * Every rule that decides *what number the public sees* lives here, so it can be
 * unit-tested in isolation and referenced from the UI, the API and the database
 * views that back them.
 *
 * Rules implemented (see docs/PRICING_RULES.md):
 *  R1  Published summary = median of the underlying observations.
 *  R2  A summary always reports its observation count and its time window.
 *  R3  Observations are comparable only when commodity, grade, price type and
 *      measurement unit are compatible.
 *  R4  An observation whose unit was never recorded is flagged ambiguous and is
 *      never silently normalised.
 *  R5  Staleness is measured against a configurable freshness window.
 *  R6  Price change requires a previous window with enough observations.
 */

import type {
  MarketPriceSummary,
  MeasurementUnit,
  PriceObservation,
  PriceSeriesPoint,
  PriceType,
  QualityFlag,
} from '@/types/domain';
import { PRICE_TYPE_META } from '@/types/domain';
import { classifyFreshness } from '@/lib/trade/freshness';

/**
 * The amount to display for an observation.
 *
 * Prefers the normalised amount when a verified conversion exists, otherwise
 * falls back to the amount exactly as reported. It never returns a value from a
 * different unit than the one recorded.
 */
export function amountForComparison(o: PriceObservation): number | null {
  if (o.normalizedAmount != null && o.normalizedUnitId != null) return o.normalizedAmount;
  return o.reportedAmount ?? null;
}

/** The unit in which `amountForComparison` returns this observation's amount. */
export function unitIdForComparison(o: PriceObservation): number | null {
  if (o.normalizedAmount != null && o.normalizedUnitId != null) return o.normalizedUnitId;
  return o.reportedUnitId ?? null;
}

/**
 * A stable key for one economic price series. Market may be omitted when the
 * caller is intentionally comparing the same series across markets.
 */
export function comparisonSeriesKey(
  o: PriceObservation,
  options: { includeMarket?: boolean } = {},
): string {
  const includeMarket = options.includeMarket ?? true;
  return [
    o.commodityId,
    includeMarket ? o.marketId : 'across-markets',
    o.priceType,
    o.gradeId ?? 'no-grade',
    o.varietyId ?? 'no-variety',
    unitIdForComparison(o) ?? 'no-unit',
    o.currencyCode,
  ].join('|');
}

/** Group records by an exact economic series before any aggregation. */
export function groupByComparisonSeries<T extends PriceObservation>(
  observations: readonly T[],
  options: { includeMarket?: boolean } = {},
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const observation of observations) {
    const key = comparisonSeriesKey(observation, options);
    const group = groups.get(key) ?? [];
    group.push(observation);
    groups.set(key, group);
  }
  return groups;
}

/**
 * Select the largest exact specification group without silently combining the
 * others. Callers must report `excluded` whenever they render only `selected`.
 */
export function selectDominantComparisonSeries<T extends PriceObservation>(
  observations: readonly T[],
  options: { includeMarket?: boolean } = {},
): { key: string | null; selected: T[]; excluded: T[] } {
  const comparable = observations.filter((row) => isPriceTypeComparable(row.priceType));
  const groups = [...groupByComparisonSeries(comparable, options).entries()].sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
  );
  const [key, selected] = groups[0] ?? [null, []];
  const selectedIds = new Set(selected.map((row) => row.id));
  return {
    key,
    selected,
    excluded: observations.filter((row) => !selectedIds.has(row.id)),
  };
}

/* ------------------------------------------------------------------ numeric */

/**
 * Median of a numeric sample.
 *
 * For an even sample size this returns the mean of the two central values.
 * Returns `null` for an empty sample — we never substitute a zero or a guess.
 */
export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

export function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

/** Round to `dp` decimal places, avoiding float drift on money. */
export function round(value: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round((value + Number.EPSILON) * f) / f;
}

/* -------------------------------------------------------------------- units */

export interface UnitIndex {
  byId: Map<number, MeasurementUnit>;
}

export function buildUnitIndex(units: MeasurementUnit[]): UnitIndex {
  return { byId: new Map(units.map((u) => [u.id, u])) };
}

/**
 * Can two observations' amounts be placed side by side?
 *
 * Units are compatible when they share a physical dimension AND the conversion
 * factor into that dimension's base unit is known for both. The synthetic
 * `unspecified` unit has no base unit, so it is only compatible with itself and
 * the result is always flagged ambiguous.
 */
export function areUnitsCompatible(
  a: MeasurementUnit | undefined,
  b: MeasurementUnit | undefined,
): { compatible: boolean; ambiguous: boolean; reason?: string } {
  if (!a || !b) {
    return { compatible: false, ambiguous: true, reason: 'A measurement unit is missing.' };
  }
  if (a.id === b.id) {
    return {
      compatible: true,
      ambiguous: !a.isSpecific,
      reason: a.isSpecific ? undefined : 'The source records did not state a measurement unit.',
    };
  }
  if (!a.isSpecific || !b.isSpecific) {
    return {
      compatible: false,
      ambiguous: true,
      reason: 'One observation has no recorded unit, so it cannot be converted or compared safely.',
    };
  }
  if (a.dimension !== b.dimension) {
    return {
      compatible: false,
      ambiguous: false,
      reason: `Different measurement dimensions (${a.dimension} vs ${b.dimension}).`,
    };
  }
  if (a.baseFactor == null || b.baseFactor == null) {
    return {
      compatible: false,
      ambiguous: false,
      reason: 'No verified conversion into the base unit is recorded.',
    };
  }
  return { compatible: true, ambiguous: false };
}

/**
 * Convert an amount to the dimension's base unit (kg / litre / piece).
 * Returns `null` when the conversion is not known — never a rough guess.
 */
export function toBaseAmount(
  amount: number,
  unit: MeasurementUnit | undefined,
): number | null {
  if (!unit || unit.baseFactor == null || !unit.isSpecific) return null;
  return round(amount * unit.baseFactor, 6);
}

/* ------------------------------------------------------------- comparability */

export interface ComparabilityCheck {
  comparable: boolean;
  reasons: string[];
  ambiguous: boolean;
}

/**
 * R3 — the full comparability check between two observations.
 */
export function checkComparable(
  a: PriceObservation,
  b: PriceObservation,
  units: UnitIndex,
): ComparabilityCheck {
  const reasons: string[] = [];

  if (a.commodityId !== b.commodityId) reasons.push('Different commodities.');
  if ((a.gradeId ?? null) !== (b.gradeId ?? null)) {
    reasons.push('Different grades.');
  }
  if ((a.varietyId ?? null) !== (b.varietyId ?? null)) {
    reasons.push('Different varieties.');
  }
  if (a.priceType !== b.priceType) {
    reasons.push(
      `Different price types (${PRICE_TYPE_META[a.priceType].label} vs ${PRICE_TYPE_META[b.priceType].label}).`,
    );
  }
  if (a.currencyCode !== b.currencyCode) {
    reasons.push('Different currencies.');
  }

  // Amounts can only be compared directly when they are expressed in the same
  // unit. A shared physical dimension (for example kg and tonne) is not enough:
  // this function does not convert the numeric amounts. A verified conversion
  // is comparable only after both amounts are actually normalised into the same
  // unit ID.
  const aUnitId = unitIdForComparison(a);
  const bUnitId = unitIdForComparison(b);
  const unitCheck =
    aUnitId == null || bUnitId == null
      ? { compatible: false, ambiguous: true, reason: 'A measurement unit is missing.' }
      : aUnitId !== bUnitId
        ? {
            compatible: false,
            ambiguous: false,
            reason: 'Amounts are expressed in different units; convert both to the same verified unit before comparison.',
          }
        : areUnitsCompatible(units.byId.get(aUnitId), units.byId.get(bUnitId));
  if (!unitCheck.compatible) {
    reasons.push(unitCheck.reason ?? 'Incompatible measurement units.');
  }

  return {
    comparable: reasons.length === 0,
    reasons,
    ambiguous: unitCheck.ambiguous,
  };
}

/** Price types that may never be presented as equivalent, even to themselves. */
export function isPriceTypeComparable(type: PriceType): boolean {
  return PRICE_TYPE_META[type].isComparable;
}

/* ---------------------------------------------------------------- freshness */

export const DEFAULT_FRESHNESS_HOURS = 72;

export function isStale(collectedAt: string, windowHours: number, now = new Date()): boolean {
  const t = new Date(collectedAt).getTime();
  if (Number.isNaN(t)) return true;
  return now.getTime() - t > windowHours * 3600_000;
}

export function hoursSince(collectedAt: string, now = new Date()): number {
  const t = new Date(collectedAt).getTime();
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return (now.getTime() - t) / 3600_000;
}

export function relativeTime(collectedAt: string, now = new Date()): string {
  const hours = hoursSince(collectedAt, now);
  if (!Number.isFinite(hours)) return 'unknown';
  if (hours < 0) return 'in the future';
  if (hours < 1) {
    const mins = Math.max(1, Math.round(hours * 60));
    return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  }
  if (hours < 24) {
    const h = Math.round(hours);
    return `${h} hour${h === 1 ? '' : 's'} ago`;
  }
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

/* ------------------------------------------------------------------ summary */

/**
 * R1/R2 — build one published summary row per market.
 *
 * `observations` must already be filtered to the ones allowed for publication.
 */
export function summariseByMarket(
  observations: PriceObservation[],
  options: {
    now?: Date;
    previousWindow?: PriceObservation[];
  } = {},
): MarketPriceSummary[] {
  const { now = new Date(), previousWindow = [] } = options;

  const eligibleObservations = observations.filter((o) => isPriceTypeComparable(o.priceType));
  const groups = groupByComparisonSeries(eligibleObservations, { includeMarket: true });

  const previousGroups = new Map<string, number[]>();
  for (const o of previousWindow) {
    if (!isPriceTypeComparable(o.priceType)) continue;
    const amount = amountForComparison(o);
    if (amount == null) continue;
    const key = comparisonSeriesKey(o, { includeMarket: true });
    const list = previousGroups.get(key) ?? [];
    list.push(amount);
    previousGroups.set(key, list);
  }

  const summaries: MarketPriceSummary[] = [];

  for (const group of groups.values()) {
    const marketId = group[0]!.marketId;
    const amounts = group.map((o) => amountForComparison(o));
    const usable = amounts.filter((a): a is number => a != null);
    if (usable.length === 0) continue;

    const sorted = [...group].sort((a, b) => a.collectedAt.localeCompare(b.collectedAt));
    const latest = sorted[sorted.length - 1]!;
    const unitId = unitIdForComparison(latest);
    // Public observations do not carry their collection schedule. Pass no
    // cadence so the central engine uses the documented no-cadence thresholds
    // instead of silently substituting the legacy 72-hour setting.
    const freshness = classifyFreshness({
      collectedAt: latest.collectedAt,
      collectedAtPrecision: latest.collectedAtPrecision,
      verificationStatus: latest.verificationStatus,
      priceType: latest.priceType,
      now,
    });

    const previous = previousGroups.get(comparisonSeriesKey(latest, { includeMarket: true })) ?? [];
    const previousMedian = median(previous);
    const currentMedian = median(usable)!;

    summaries.push({
      marketId,
      marketName: latest.marketName ?? `Market ${marketId}`,
      marketSlug: latest.marketSlug ?? String(marketId),
      stateName: latest.stateName ?? '',
      stateSlug: latest.stateSlug ?? '',
      commodityId: latest.commodityId,
      commodityName: latest.commodityName ?? '',
      commoditySlug: latest.commoditySlug ?? '',
      priceType: latest.priceType,
      gradeId: latest.gradeId ?? null,
      gradeName: latest.gradeName ?? null,
      varietyId: latest.varietyId ?? null,
      varietyName: latest.varietyName ?? null,
      unitId,
      unitCode: latest.unitCode ?? null,
      unitName: latest.unitName ?? null,
      unitIsSpecific: latest.unitIsSpecific ?? false,
      medianAmount: round(currentMedian),
      minAmount: round(Math.min(...usable)),
      maxAmount: round(Math.max(...usable)),
      latestAmount: round(amountForComparison(latest) ?? currentMedian),
      observationCount: usable.length,
      currencyCode: latest.currencyCode,
      currencySymbol: latest.currencySymbol,
      windowStart: sorted[0]!.collectedAt,
      windowEnd: latest.collectedAt,
      latestCollectedAt: latest.collectedAt,
      latestVerifiedAt: latest.verifiedAt ?? null,
      unitAmbiguous: !(latest.unitIsSpecific ?? false),
      freshnessState: freshness.state,
      isStale: freshness.state === 'stale',
      timestampNeedsReview:
        freshness.state === 'future_timestamp' ||
        (freshness.state === 'no_data' && !Number.isFinite(new Date(latest.collectedAt).getTime())),
      changePercent:
        previousMedian != null && previousMedian !== 0
          ? round(((currentMedian - previousMedian) / previousMedian) * 100, 2)
          : null,
    });
  }

  return summaries.sort((a, b) => a.medianAmount - b.medianAmount);
}

/* ------------------------------------------------------------------- series */

/**
 * Build a daily price series for charting.
 *
 * Each point carries its own observation count so the chart can be read
 * honestly — a day with one report is not the same as a day with six.
 */
export interface ComparableDailySeries {
  points: PriceSeriesPoint[];
  seriesKey: string | null;
  observationCount: number;
  excludedObservationCount: number;
}

/**
 * Build a daily chart from one exact commodity/price-type/grade/variety/unit/
 * currency series. If mixed input is supplied, the largest series is selected
 * deterministically and the caller receives an exclusion count to disclose.
 */
export function buildComparableDailySeries(observations: PriceObservation[]): ComparableDailySeries {
  const { key, selected, excluded } = selectDominantComparisonSeries(observations, {
    includeMarket: false,
  });
  const groups = new Map<string, number[]>();
  for (const o of selected) {
    const amount = amountForComparison(o);
    if (amount == null) continue;
    const day = o.collectedAt.slice(0, 10);
    const list = groups.get(day) ?? [];
    list.push(amount);
    groups.set(day, list);
  }

  const points = [...groups.entries()]
    .map(([date, values]) => ({
      date,
      min: round(Math.min(...values)),
      max: round(Math.max(...values)),
      median: round(median(values)!),
      observations: values.length,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    points,
    seriesKey: key,
    observationCount: selected.length,
    excludedObservationCount: excluded.length,
  };
}

/** Backwards-compatible convenience; mixed inputs resolve to one series. */
export function buildSeries(observations: PriceObservation[]): PriceSeriesPoint[] {
  return buildComparableDailySeries(observations).points;
}

/* ------------------------------------------------------------------ quality */

/**
 * Duplicate detection: two observations for the same commodity, market, price
 * type and collection timestamp are treated as duplicates.
 */
export function findDuplicates(observations: PriceObservation[]): string[] {
  const seen = new Map<string, number>();
  const duplicates = new Set<string>();
  for (const o of observations) {
    const key = [
      o.commodityId,
      o.marketId,
      o.priceType,
      o.gradeId ?? 'none',
      o.reportedAmount ?? 'none',
      o.reportedUnitId ?? 'none',
      o.collectedAt.slice(0, 16),
    ].join('|');
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
    if (count > 0) duplicates.add(o.id);
  }
  return [...duplicates];
}

/**
 * Outlier detection against the median of comparable observations.
 *
 * Outliers are *flagged for review*, never discarded — a genuinely unusual
 * market is exactly the signal an operator wants to see.
 */
export function findOutliers(
  observations: PriceObservation[],
  options: { thresholdPercent?: number; minSample?: number } = {},
): Map<string, { amount: number; median: number; deviationPercent: number }> {
  const { thresholdPercent = 50, minSample = 4 } = options;
  const flagged = new Map<string, { amount: number; median: number; deviationPercent: number }>();

  const groups = new Map<string, number[]>();
  for (const o of observations) {
    const amount = amountForComparison(o);
    if (amount == null) continue;
    const key = [o.commodityId, o.marketId, o.priceType, o.reportedUnitId ?? 'none'].join('|');
    const list = groups.get(key) ?? [];
    list.push(amount);
    groups.set(key, list);
  }

  for (const o of observations) {
    const key = [o.commodityId, o.marketId, o.priceType, o.reportedUnitId ?? 'none'].join('|');
    const values = groups.get(key) ?? [];
    if (values.length < minSample) continue;
    const amount = amountForComparison(o);
    if (amount == null) continue;
    const m = median(values);
    if (m == null || m === 0) continue;
    const deviation = ((amount - m) / m) * 100;
    if (Math.abs(deviation) >= thresholdPercent) {
      flagged.set(o.id, { amount: round(amount), median: round(m), deviationPercent: round(deviation, 2) });
    }
  }
  return flagged;
}

/**
 * Derive the quality flags that apply to an observation.
 */
export function deriveQualityFlags(
  observation: PriceObservation,
  context: {
    duplicates: readonly string[];
    outliers: ReadonlyMap<string, { deviationPercent: number }>;
    freshnessHours?: number;
    now?: Date;
    requiresEvidence?: boolean;
    evidenceCount?: number;
  },
): QualityFlag[] {
  const flags: QualityFlag[] = [];
  const {
    duplicates,
    outliers,
    freshnessHours = DEFAULT_FRESHNESS_HOURS,
    now = new Date(),
    requiresEvidence = false,
    evidenceCount = 0,
  } = context;

  if (duplicates.includes(observation.id)) flags.push('duplicate_suspected');
  if (outliers.has(observation.id)) flags.push('price_outlier');
  if (observation.normalizedAmount == null && observation.reportedAmount != null) {
    flags.push('unit_conversion_unverified');
  }
  if (observation.packageWeightKg == null && observation.reportedUnitId != null) {
    flags.push('bag_weight_inconsistent');
  }
  if (observation.collectedAtPrecision === 'date') flags.push('timestamp_inconsistent');
  if (observation.unitIsSpecific === false) flags.push('unit_ambiguous');
  if (observation.verificationStatus === 'legacy_unverified') flags.push('legacy_unverified');
  if (requiresEvidence && evidenceCount === 0) flags.push('missing_evidence');
  if (isStale(observation.collectedAt, freshnessHours, now)) flags.push('stale');

  return [...new Set(flags)];
}
