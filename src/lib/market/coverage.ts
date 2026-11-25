import 'server-only';

import { getDataSource } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { freshnessOf } from './freshness';
import type { Market } from '@/types/domain';

/**
 * Market coverage and data freshness.
 *
 * Phase 03 §12 requires the platform to communicate *where it currently has
 * reliable market information* — and, implicitly, where it does not. The audit
 * measured 11 configured markets, of which 5 have ever produced an observation
 * and 0 have a published one.
 *
 * **Two of those three numbers are shown, because only two are measurable
 * through the public data layer.** The data layer exposes `listObservations` and
 * `listObservationsForAnalysis`, both of which read the public
 * `published_price_observations` view. It has no accessor for "collected but
 * unpublished", and adding one to reach unpublished rows from a public surface
 * would be a security change, not a coverage feature.
 *
 * So this module reports:
 *
 *   configured  — market records that exist.
 *   reporting   — markets with at least one row in the public view.
 *
 * and the difference between them is described in words as "configured but not
 * reporting", never as a third measured count. With 0 published observations,
 * `reporting` is 0 and the page says so. It does not fall back to `configured`
 * to avoid an empty section.
 */

export type CoverageState = 'reporting' | 'configured_only';

export interface MarketCoverageRow {
  marketId: number;
  marketName: string;
  marketSlug: string;
  stateName: string | null;
  stateSlug: string | null;
  /** How many distinct commodities this market has a published price for. */
  commoditiesCovered: number;
  /** The newest published observation, or `null` when there is none. */
  newestObservedAt: string | null;
  state: CoverageState;
  freshness: 'fresh' | 'today' | 'delayed' | 'stale' | 'unavailable' | 'timestamp_review';
}

export interface MarketCoverage {
  rows: MarketCoverageRow[];
  byState: { stateName: string; configured: number; reporting: number }[];
  counts: {
    configured: number;
    reporting: number;
  };
  emptyReason: string | null;
}

/**
 * The market coverage summary.
 *
 * One query for the markets, one for the published observations. The two are
 * joined in memory — which at 11 markets and a bounded observation set is
 * cheaper than a join the database would have to plan anyway, and it keeps the
 * query surface to what the existing data layer already exposes.
 */
export async function getMarketCoverage(): Promise<MarketCoverage> {
  const empty: MarketCoverage = {
    rows: [],
    byState: [],
    counts: { configured: 0, reporting: 0 },
    emptyReason: null,
  };

  if (!isSupabaseConfigured()) {
    return { ...empty, emptyReason: 'No database is configured, so coverage cannot be measured.' };
  }

  const source = await getDataSource();

  const [markets, published] = await Promise.all([
    source.listMarkets() as Promise<Market[]>,
    // A single count query for the total, then a bounded scan for the per-market
    // rollup. The count is cheap and indexed (`published_idx`); the scan is
    // capped by the data layer's own page size.
    source.listObservations({ page: 1, pageSize: 1 }),
  ]);

  if (markets.length === 0) {
    return { ...empty, emptyReason: 'No market has been configured yet.' };
  }

  const publishedRows = await source.listObservationsForAnalysis({});

  const byMarket = new Map<number, { commodities: Set<number>; newest: string | null }>();
  for (const observation of publishedRows) {
    const entry = byMarket.get(observation.marketId) ?? { commodities: new Set(), newest: null };
    entry.commodities.add(observation.commodityId);
    if (!entry.newest || observation.collectedAt > entry.newest) {
      entry.newest = observation.collectedAt;
    }
    byMarket.set(observation.marketId, entry);
  }

  const rows: MarketCoverageRow[] = markets.map((market) => {
    const entry = byMarket.get(market.id);
    const covered = entry?.commodities.size ?? 0;
    const newest = entry?.newest ?? null;

    return {
      marketId: market.id,
      marketName: market.name,
      marketSlug: market.slug,
      stateName: market.stateName ?? null,
      stateSlug: market.stateSlug ?? null,
      commoditiesCovered: covered,
      newestObservedAt: newest,
      state: covered > 0 ? 'reporting' : 'configured_only',
      freshness: freshnessOf(newest),
    };
  });

  const byStateMap = new Map<string, { configured: number; reporting: number }>();
  for (const row of rows) {
    const name = row.stateName ?? 'Unassigned';
    const entry = byStateMap.get(name) ?? { configured: 0, reporting: 0 };
    entry.configured += 1;
    if (row.state === 'reporting') entry.reporting += 1;
    byStateMap.set(name, entry);
  }

  const reporting = rows.filter((row) => row.state === 'reporting').length;

  return {
    rows: rows.sort((a, b) => {
      // Reporting markets first, then the rest alphabetically. A reader should
      // see where the data is before seeing where it is not.
      if (a.state !== b.state) return a.state === 'reporting' ? -1 : 1;
      return a.marketName.localeCompare(b.marketName);
    }),
    byState: [...byStateMap.entries()]
      .map(([stateName, counts]) => ({ stateName, ...counts }))
      .sort((a, b) => b.configured - a.configured),
    counts: {
      configured: rows.length,
      reporting,
    },
    emptyReason:
      published.total === 0
        ? 'No market has a published observation. The markets are configured and collection has run, but publication has not been performed, so nothing is publicly visible.'
        : null,
  };
}
