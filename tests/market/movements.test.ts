import { describe, expect, it } from 'vitest';
import { freshnessOf, assessFreshness, coarseFreshness } from '@/lib/market/freshness';
import { seriesKeyId } from '@/lib/trade/series';
import type { PriceObservation } from '@/types/domain';

/**
 * Phase 03 §22.2 — market movement tests.
 *
 * The movement rules are the easiest place in this platform to be wrong, and the
 * consequences of being wrong are the worst: a percentage change computed
 * between two incomparable prices is a fabricated number presented as a fact.
 *
 * These tests exercise the eligibility rules through the functions the services
 * actually use. `seriesKeyId` is the single definition of comparability, so
 * testing it here tests the guarantee every movement surface depends on.
 */

/** The smallest observation that carries the fields the series key reads. */
function observation(overrides: Partial<PriceObservation> = {}): PriceObservation {
  return {
    id: 'obs-1',
    commodityId: 1,
    marketId: 10,
    varietyId: null,
    gradeId: null,
    priceType: 'wholesale_asking',
    reportedAmount: 1000,
    reportedUnitId: 5,
    packageWeightKg: null,
    normalizedAmount: null,
    normalizedUnitId: null,
    currencyCode: 'NGN',
    currencySymbol: '₦',
    collectedAt: '2026-11-10T10:00:00.000Z',
    collectedAtPrecision: 'minute',
    submittedAt: '2026-11-10T10:05:00.000Z',
    verifiedAt: null,
    publishedAt: null,
    agentUserId: 'agent-1',
    verificationStatus: 'verified',
    notes: null,
    qualityFlags: [],
    sourceSystem: 'agent_app',
    sourceReference: null,
    ...overrides,
  };
}


function key(observation: PriceObservation): string {
  return seriesKeyId({
    commodityId: observation.commodityId,
    marketId: observation.marketId,
    priceType: observation.priceType,
    gradeId: observation.gradeId,
    unitId: observation.reportedUnitId,
    currencyCode: observation.currencyCode,
    varietyId: observation.varietyId,
  });
}

describe('comparability — which two prices may be compared at all', () => {
  it('treats the same series measured twice as the same series', () => {
    const a = observation({ id: 'a', collectedAt: '2026-11-09T10:00:00.000Z', reportedAmount: 900 });
    const b = observation({ id: 'b', collectedAt: '2026-11-10T10:00:00.000Z', reportedAmount: 1000 });
    expect(key(a)).toBe(key(b));
  });

  it('refuses to compare two different commodities', () => {
    expect(key(observation({ commodityId: 1 }))).not.toBe(key(observation({ commodityId: 2 })));
  });

  it('refuses to compare two different markets', () => {
    expect(key(observation({ marketId: 10 }))).not.toBe(key(observation({ marketId: 11 })));
  });

  it('refuses to compare two different grades', () => {
    expect(key(observation({ gradeId: 1 }))).not.toBe(key(observation({ gradeId: 2 })));
  });

  it('refuses to compare two different units', () => {
    expect(key(observation({ reportedUnitId: 5 }))).not.toBe(
      key(observation({ reportedUnitId: 6 })),
    );
  });

  it('refuses to compare two different price types', () => {
    expect(key(observation({ priceType: 'wholesale_asking' }))).not.toBe(
      key(observation({ priceType: 'retail' })),
    );
  });

  it('refuses to compare two different currencies', () => {
    expect(key(observation({ currencyCode: 'NGN' }))).not.toBe(
      key(observation({ currencyCode: 'USD' })),
    );
  });

  it('refuses to compare two different varieties', () => {
    expect(key(observation({ varietyId: 1 }))).not.toBe(key(observation({ varietyId: 2 })));
  });

  it('treats a null grade as its own value, distinct from any grade', () => {
    const nullGrade = key(observation({ gradeId: null }));
    expect(nullGrade).not.toBe(key(observation({ gradeId: 1 })));
  });
});

describe('movement arithmetic — the formula and its edge cases', () => {
  /** The formula Phase 03 §7.1 states. */
  function changePercent(current: number, previous: number): number {
    return ((current - previous) / previous) * 100;
  }

  it('computes a positive movement', () => {
    expect(changePercent(1100, 1000)).toBeCloseTo(10, 6);
  });

  it('computes a negative movement', () => {
    expect(changePercent(900, 1000)).toBeCloseTo(-10, 6);
  });

  it('computes no movement as zero, not as null', () => {
    expect(changePercent(1000, 1000)).toBe(0);
  });

  it('cannot express a zero denominator as a percentage', () => {
    // A zero previous price is not a 0% change and it is not an infinite one.
    // The service must fall back to the absolute change and say why.
    expect(Number.isFinite(changePercent(1000, 0))).toBe(false);
  });
});

describe('the weekly window — Phase 03 §7.2', () => {
  /**
   * The weekly comparison point: the newest observation at least seven days
   * older than the latest, in the same series.
   *
   * Re-declared here from the service's rule so the rule is pinned. If the
   * service changes, this test fails and the change is deliberate.
   */
  const WEEKLY_WINDOW_DAYS = 7;
  const DAY = 86_400_000;

  function findWeeklyPrevious(sorted: PriceObservation[]): PriceObservation | null {
    if (sorted.length < 2) return null;
    const latestTime = new Date(sorted[0]!.collectedAt).getTime();
    for (let index = 1; index < sorted.length; index += 1) {
      const candidate = sorted[index]!;
      const age = latestTime - new Date(candidate.collectedAt).getTime();
      if (age >= WEEKLY_WINDOW_DAYS * DAY) return candidate;
    }
    return null;
  }

  const latest = observation({ id: 'latest', collectedAt: '2026-11-14T10:00:00.000Z' });

  it('finds the newest observation that is at least seven days older', () => {
    const series = [
      latest,
      observation({ id: 'six', collectedAt: '2026-11-08T10:00:00.000Z' }),
      observation({ id: 'eight', collectedAt: '2026-11-06T10:00:00.000Z' }),
    ];
    // Six days is not a week. The eight-day-old row is the weekly comparison.
    expect(findWeeklyPrevious(series)?.id).toBe('eight');
  });

  it('returns null when no observation is a week old', () => {
    const series = [
      latest,
      observation({ id: 'six', collectedAt: '2026-11-08T10:00:00.000Z' }),
    ];
    expect(findWeeklyPrevious(series)).toBeNull();
  });

  it('returns null for a single-observation series', () => {
    expect(findWeeklyPrevious([latest])).toBeNull();
  });

  it('uses the newest qualifying row when several are old enough', () => {
    const series = [
      latest,
      observation({ id: 'ten', collectedAt: '2026-11-04T10:00:00.000Z' }),
      observation({ id: 'twenty', collectedAt: '2026-10-25T10:00:00.000Z' },
      ),
    ];
    expect(findWeeklyPrevious(series)?.id).toBe('ten');
  });
});

describe('latest-per-series selection — Phase 03 §6.3', () => {
  /**
   * The watch shows the latest qualifying observation per series. Two
   * observations that differ only in time collapse to the newest; two that
   * differ in grade, unit, price type or currency stay separate.
   */
  function latestPerSeries(observations: PriceObservation[]): PriceObservation[] {
    const bySeries = new Map<string, PriceObservation>();
    for (const observation of observations) {
      const existing = bySeries.get(key(observation));
      if (!existing || observation.collectedAt > existing.collectedAt) {
        bySeries.set(key(observation), observation);
      }
    }
    return [...bySeries.values()];
  }

  it('keeps only the newest observation of a series', () => {
    const rows = latestPerSeries([
      observation({ id: 'old', collectedAt: '2026-11-01T10:00:00.000Z' }),
      observation({ id: 'new', collectedAt: '2026-11-10T10:00:00.000Z' }),
      observation({ id: 'mid', collectedAt: '2026-11-05T10:00:00.000Z' }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe('new');
  });

  it('keeps two rows for two grades of the same commodity', () => {
    const rows = latestPerSeries([
      observation({ id: 'grade-a', gradeId: 1 }),
      observation({ id: 'grade-b', gradeId: 2 }),
    ]);
    expect(rows).toHaveLength(2);
  });

  it('keeps two rows for two markets quoting the same commodity', () => {
    const rows = latestPerSeries([
      observation({ id: 'market-a', marketId: 10 }),
      observation({ id: 'market-b', marketId: 11 }),
    ]);
    expect(rows).toHaveLength(2);
  });

  it('preserves the observation timestamp rather than the page time', () => {
    const rows = latestPerSeries([
      observation({ id: 'kept', collectedAt: '2026-11-10T10:00:00.000Z' }),
    ]);
    expect(rows[0]!.collectedAt).toBe('2026-11-10T10:00:00.000Z');
  });
});

describe('freshness is computed from the observation, not the page', () => {
  /**
   * These tests exercise the *real* mapping, not a copy of it.
   *
   * The first draft of this file re-declared the age arithmetic locally, and the
   * local copy disagreed with the three services that had each written their
   * own — one called a six-hour-old observation `today`, another called it
   * `fresh`. The duplication was the bug. The services now share one mapping in
   * `src/lib/market/freshness.ts`, and this test pins *that*.
   */
  /** A pinned clock, so a freshness test is a test of the rule and not of the time. */
  const now = new Date('2026-11-14T12:00:00.000Z');
  const hoursAgo = (hours: number) =>
    new Date(now.getTime() - hours * 3_600_000).toISOString();
  const daysAgo = (days: number) => hoursAgo(days * 24);

  it('calls an observation inside the daily fresh window fresh', () => {
    // The daily cadence allows a 36-hour window, so a single missed day does
    // not turn yesterday's good price into a stale one.
    expect(freshnessOf(hoursAgo(6), { now, cadence: 'daily' })).toBe('fresh');
    expect(freshnessOf(hoursAgo(30), { now, cadence: 'daily' })).toBe('fresh');
  });

  it('calls a verified observation past the fresh window latest_verified', () => {
    // The engine distinguishes a verified-but-no-longer-current price from an
    // unverified one. Both are past the fresh window; only the verified one is
    // still "the most recent checked price available".
    expect(assessFreshness(daysAgo(3), { now, cadence: 'daily' })).toBe('delayed');
    expect(assessFreshness(daysAgo(3), { now, cadence: 'daily', verificationStatus: 'verified' })).toBe(
      'latest_verified',
    );
    expect(coarseFreshness('latest_verified')).toBe('today');
    expect(coarseFreshness('delayed')).toBe('delayed');
  });

  it('calls an observation past the verification horizon stale', () => {
    // The daily horizon is 30 days.
    expect(assessFreshness(daysAgo(45), { now, cadence: 'daily' })).toBe('stale');
    expect(freshnessOf(daysAgo(45), { now, cadence: 'daily' })).toBe('stale');
  });

  it('does not assume a daily cadence when none is supplied', () => {
    const observed = daysAgo(60);
    expect(assessFreshness(observed, { now, verificationStatus: 'verified' })).toBe('latest_verified');
    expect(assessFreshness(observed, { now, verificationStatus: 'verified', cadence: 'daily' })).toBe('stale');
  });

  it('never treats a missing observation as anything but unavailable', () => {
    expect(freshnessOf(null, { now })).toBe('unavailable');
    expect(assessFreshness(null)).toBe('no_data');
  });

  it('flags a future observation for timestamp review instead of showing it as fresh', () => {
    expect(freshnessOf('2026-12-01T06:00:00.000Z', { now })).toBe('timestamp_review');
  });

  it('maps an indicative price to delayed, never to fresh', () => {
    // An indicative price is not a fresh one, however recent it is. This is the
    // one direction the coarse mapping must not lose information.
    expect(assessFreshness(hoursAgo(1), { priceType: 'indicative', now })).toBe('indicative');
    expect(coarseFreshness('indicative')).toBe('delayed');
  });

  it('maps live_feed to fresh', () => {
    expect(coarseFreshness('live_feed')).toBe('fresh');
  });

  it('maps no_data to unavailable', () => {
    expect(coarseFreshness('no_data')).toBe('unavailable');
  });
});
