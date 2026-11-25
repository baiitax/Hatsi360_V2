import 'server-only';

import { getDataSource } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getCommodityOpportunities } from '@/lib/trade';
import { freshnessOf, type FreshnessState } from './freshness';
import type { PriceType } from '@/types/domain';

/**
 * Regional market comparison.
 *
 * Phase 03 §9 asks for regional comparison. The audit found that `market_zones`
 * holds **0 rows** and the 11 configured markets each sit in a **different
 * state**, one market per state. So a "regional aggregate" over this data would
 * be an average of eleven single-market rows, each of which is its own region.
 *
 * **That is not implemented, deliberately.** Phase 03 §9.4 says: *"Do not label
 * a simple average of unrelated prices as a national market price."* An average
 * across eleven unrelated markets with no zone hierarchy is exactly that.
 *
 * What is implemented is the comparison the data genuinely supports: **one
 * commodity across multiple markets**, with the benchmark difference stated per
 * market, and the best-buy and best-sell labels reframed honestly.
 */

export interface MarketComparisonQuery {
  commodityId: number;
  priceType?: PriceType;
  gradeId?: number | null;
}

export interface ComparisonRow {
  marketId: number;
  marketName: string;
  marketSlug: string | null;
  stateName: string | null;
  amount: number | null;
  currencyCode: string;
  unitLabel: string | null;
  gradeName: string | null;
  priceType: string;
  observedAt: string;
  /** The difference from the benchmark, or `null` when either side is missing. */
  differenceFromBenchmark: number | null;
  differencePercent: number | null;
  /** Every row has an observation, so this is never `unavailable`. */
  freshness: 'fresh' | 'today' | 'delayed' | 'stale' | 'timestamp_review';
}

export interface MarketComparisonResult {
  commodityId: number;
  commodityName: string;
  benchmark: { label: string; amount: number | null; marketName: string | null } | null;
  rows: ComparisonRow[];
  marketsCompared: number;
  /** The lowest observed comparable price, named as such. */
  lowest: { amount: number | null; marketName: string | null } | null;
  /** The highest observed comparable price, named as such. */
  highest: { amount: number | null; marketName: string | null } | null;
  /** Why the comparison is unavailable, when it is. */
  unavailableReason: string | null;
  /** What is deliberately not computed, and why. */
  notComputed: string[];
}

/**
 * Compare one commodity across markets.
 *
 * The benchmark is the **median of the comparable observations**, because a
 * median is not dragged by a single outlier the way a mean is — and with a
 * handful of markets, one unusual price would otherwise define the "national"
 * figure. It is labelled a median of the compared markets, never a national
 * price.
 *
 * `notComputed` is returned alongside the result rather than buried, so a caller
 * cannot render an aggregate that was never calculated.
 */
export async function getMarketComparison(
  query: MarketComparisonQuery,
): Promise<MarketComparisonResult> {
  const notComputed = [
    'No national or regional average is computed. The platform holds no market-zone hierarchy (market_zones is empty) and each configured market sits in its own state, so an "average across regions" would be an average of unrelated single-market prices.',
    'No weighted average is computed. The platform holds no traded volume, so any weighting would be invented.',
    'No currency conversion is applied. Every row is shown in the currency it was collected in, and rows in different currencies are not compared.',
  ];

  const unavailable = (reason: string, commodityName: string): MarketComparisonResult => ({
    commodityId: query.commodityId,
    commodityName,
    benchmark: null,
    rows: [],
    marketsCompared: 0,
    lowest: null,
    highest: null,
    unavailableReason: reason,
    notComputed,
  });

  if (!isSupabaseConfigured()) {
    return unavailable('No database is configured, so no comparison is possible.', 'Unknown commodity');
  }

  const source = await getDataSource();
  const commodity = await source.getCommodityById(query.commodityId);
  if (!commodity) {
    return unavailable('That commodity is not in the catalogue.', 'Unknown commodity');
  }

  const opportunities = await getCommodityOpportunities(query.commodityId, {
    priceType: query.priceType,
    gradeId: query.gradeId ?? undefined,
  });

  if (opportunities.unavailableReason) {
    return unavailable(opportunities.unavailableReason, commodity.name);
  }

  // The comparable observations, one row per market, newest first.
  const observations = await source.listObservationsForAnalysis({
    commodityId: query.commodityId,
    priceType: query.priceType,
    gradeId: query.gradeId ?? undefined,
  });

  const byMarket = new Map<number, (typeof observations)[number]>();
  for (const observation of observations) {
    const existing = byMarket.get(observation.marketId);
    if (!existing || observation.collectedAt > existing.collectedAt) {
      byMarket.set(observation.marketId, observation);
    }
  }

  const comparable = [...byMarket.values()]
    .filter((observation) => observation.reportedAmount != null)
    .sort((a, b) => (a.reportedAmount ?? 0) - (b.reportedAmount ?? 0));

  if (comparable.length === 0) {
    return unavailable(
      'Published observations exist for this commodity, but none carries a comparable amount — so no market can be compared with another.',
      commodity.name,
    );
  }

  const amounts = comparable.map((observation) => observation.reportedAmount!);
  const benchmarkAmount = median(amounts);
  const benchmarkMarket =
    comparable.find((observation) => observation.reportedAmount === benchmarkAmount)?.marketName ??
    null;

  const rows: ComparisonRow[] = comparable.map((observation) => {
    const amount = observation.reportedAmount!;
    const difference = amount - benchmarkAmount;
    return {
      marketId: observation.marketId,
      marketName: observation.marketName ?? `Market ${observation.marketId}`,
      marketSlug: observation.marketSlug ?? null,
      stateName: observation.stateName ?? null,
      amount,
      currencyCode: observation.currencyCode,
      unitLabel: observation.unitCode ?? observation.unitName ?? null,
      gradeName: observation.gradeName ?? null,
      priceType: observation.priceType.replace(/_/g, ' '),
      observedAt: observation.collectedAt,
      differenceFromBenchmark: benchmarkAmount !== 0 ? difference : null,
      differencePercent: benchmarkAmount !== 0 ? (difference / benchmarkAmount) * 100 : null,
      freshness: coerceFreshness(
        freshnessOf(observation.collectedAt, {
          collectedAtPrecision: observation.collectedAtPrecision,
          priceType: observation.priceType,
        }),
      ),
    };
  });

  const lowest = comparable[0]!;
  const highest = comparable[comparable.length - 1]!;

  return {
    commodityId: query.commodityId,
    commodityName: commodity.name,
    benchmark: {
      label: `Median of ${comparable.length} compared market${comparable.length === 1 ? '' : 's'}`,
      amount: benchmarkAmount,
      marketName: benchmarkMarket,
    },
    rows,
    marketsCompared: comparable.length,
    lowest: {
      amount: lowest.reportedAmount ?? null,
      marketName: lowest.marketName ?? null,
    },
    highest: {
      amount: highest.reportedAmount ?? null,
      marketName: highest.marketName ?? null,
    },
    unavailableReason: null,
    notComputed,
  };
}

/**
 * A comparison row always has an observation, so the shared freshness mapping's
 * `unavailable` cannot occur. It is narrowed here rather than widening the row's
 * type to include a state the row can never be in.
 */
function coerceFreshness(
  state: FreshnessState,
): 'fresh' | 'today' | 'delayed' | 'stale' | 'timestamp_review' {
  return state === 'unavailable' ? 'delayed' : state;
}

/** The median of a non-empty numeric list. */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle]!;
  return (sorted[middle - 1]! + sorted[middle]!) / 2;
}
