import 'server-only';

import { getDataSource } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { freshnessOf } from './freshness';
import type { ObservationQuery, PriceObservation } from '@/types/domain';

/**
 * The commodity market watch.
 *
 * Phase 03 §6.3 requires a deterministic selection rule for the latest valid
 * market observation. The rule is:
 *
 *   1. Exclude rejected records.          — the view's `verification_status` filter.
 *   2. Exclude pending records.           — same.
 *   3. Exclude unpublished records.       — the view's `published_at IS NOT NULL`.
 *   4. Respect the real workflow.         — the view encodes it; this file adds nothing.
 *   5. Select the latest per series.      — the dedupe below.
 *   6. Preserve the timestamp.            — `observedAt` is carried through untouched.
 *   7. Avoid presenting stale data as current. — `freshness` is computed, not assumed.
 *   8. Prevent duplicates distorting summaries. — one row per (commodity, series).
 *
 * Steps 1–4 are the database's job and are not re-implemented here. Steps 5–8
 * are this file's job.
 *
 * **The business timestamp is `collected_at`, not `updated_at` or `created_at`.**
 * A row that was corrected last week carries the correction's collection date,
 * which is the date the price was actually observed in the market.
 */

export interface MarketWatchQuery {
  search?: string;
  commodityId?: number;
  marketId?: number;
  stateId?: number;
  priceType?: PriceObservation['priceType'];
  gradeId?: number;
  categoryId?: number;
  /** Restrict to observations collected on or after this ISO date. */
  collectedFrom?: string;
  sort?: 'recent' | 'price_asc' | 'price_desc' | 'commodity' | 'movement';
  page?: number;
  pageSize?: number;
}

export interface WatchRow {
  id: string;
  commodityId: number;
  commodityName: string;
  commoditySlug: string;
  marketId: number;
  marketName: string | null;
  marketSlug: string | null;
  stateName: string | null;
  /** The price, or `null` when the observation carries no amount. */
  amount: number | null;
  currencyCode: string;
  unitLabel: string | null;
  gradeName: string | null;
  priceType: string;
  observedAt: string;
  verificationStatus: PriceObservation['verificationStatus'];
  /** The freshness state, computed from `observedAt` — never from page load. */
  freshness: 'fresh' | 'today' | 'delayed' | 'stale' | 'unavailable' | 'timestamp_review';
  href: string;
}

export interface MarketWatchResult {
  rows: WatchRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  /** Stated honestly when a filter or the data leaves nothing to show. */
  emptyReason: string | null;
}

/** How many published observations a watch query may pull before deduping. */
const SCAN_LIMIT = 2000;

/**
 * The market watch.
 *
 * The watch shows **the latest qualifying observation per commodity and
 * series**, not a raw page of the observation table. A commodity quoted in two
 * grades has two rows, because they are two different things; a commodity with
 * four observations of the same series has one row, because the other three are
 * history.
 *
 * Deduplication is by series key, so two observations that differ only in
 * collection time collapse to the newest — which is what "latest" means — while
 * two that differ in grade, unit, price type or currency stay separate, because
 * collapsing them would compare different things.
 */
export async function getMarketWatch(query: MarketWatchQuery = {}): Promise<MarketWatchResult> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 25));

  const empty = (reason: string): MarketWatchResult => ({
    rows: [],
    page,
    pageSize,
    total: 0,
    totalPages: 1,
    emptyReason: reason,
  });

  if (!isSupabaseConfigured()) {
    return empty(
      'No database is configured, so there is no market data to read. Nothing is estimated in its place.',
    );
  }

  const source = await getDataSource();

  // The filters the underlying query service already supports are pushed down
  // to the database. Only what it cannot express is applied here.
  const observationQuery: ObservationQuery = {
    page: 1,
    pageSize: SCAN_LIMIT,
    sort: 'recent',
  };
  if (query.commodityId != null) observationQuery.commodityId = query.commodityId;
  if (query.marketId != null) observationQuery.marketId = query.marketId;
  if (query.stateId != null) observationQuery.stateId = query.stateId;
  if (query.priceType) observationQuery.priceType = query.priceType;
  if (query.gradeId != null) observationQuery.gradeId = query.gradeId;
  if (query.categoryId != null) observationQuery.categoryId = query.categoryId;
  if (query.collectedFrom) observationQuery.collectedFrom = query.collectedFrom;

  const result = await source.listObservations(observationQuery);
  const observations = result.items;

  if (observations.length === 0) {
    return empty(
      result.total === 0
        ? 'No price observation has completed verification and publication, so there is nothing eligible for the watch. Publication is a separate act from verification, and neither has been completed for any record yet.'
        : 'No published observation matches those filters.',
    );
  }

  const latest = latestPerSeries(observations);
  let rows = latest.map(toWatchRow);

  // Search is applied here rather than pushed down, because the view's own
  // search covers commodity and market names but the watch also matches the
  // commodity's slug and the state. Pushing it down as well would double-count.
  if (query.search) {
    const term = query.search.trim().toLowerCase();
    if (term) {
      rows = rows.filter((row) =>
        [
          row.commodityName,
          row.commoditySlug,
          row.marketName ?? '',
          row.marketSlug ?? '',
          row.stateName ?? '',
          row.gradeName ?? '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(term),
      );
      if (rows.length === 0) {
        return empty(`No published observation matches “${query.search}”.`);
      }
    }
  }

  rows = sortRows(rows, query.sort ?? 'recent');

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const paged = rows.slice(start, start + pageSize);

  return {
    rows: paged,
    page,
    pageSize,
    total,
    totalPages,
    emptyReason: null,
  };
}

/**
 * The latest qualifying observation per series.
 *
 * A series is the tuple that makes two prices comparable. Two observations in
 * the same series are the same thing measured twice; the newest is the current
 * one and the rest are history.
 */
function latestPerSeries(observations: PriceObservation[]): PriceObservation[] {
  const bySeries = new Map<string, PriceObservation>();
  for (const observation of observations) {
    const key = [
      observation.commodityId,
      observation.marketId,
      observation.priceType,
      observation.gradeId ?? 'none',
      observation.reportedUnitId ?? 'none',
      observation.currencyCode,
      observation.varietyId ?? 'none',
    ].join('|');
    const existing = bySeries.get(key);
    if (!existing || observation.collectedAt > existing.collectedAt) {
      bySeries.set(key, observation);
    }
  }
  return [...bySeries.values()];
}

/** Map an observation to a watch row, carrying its context and its timestamp. */
function toWatchRow(observation: PriceObservation): WatchRow {
  return {
    id: observation.id,
    commodityId: observation.commodityId,
    commodityName: observation.commodityName ?? `Commodity ${observation.commodityId}`,
    commoditySlug: observation.commoditySlug ?? String(observation.commodityId),
    marketId: observation.marketId,
    marketName: observation.marketName ?? null,
    marketSlug: observation.marketSlug ?? null,
    stateName: observation.stateName ?? null,
    amount: observation.reportedAmount ?? observation.normalizedAmount ?? null,
    currencyCode: observation.currencyCode,
    unitLabel: observation.unitCode ?? observation.unitName ?? null,
    gradeName: observation.gradeName ?? null,
    priceType: observation.priceType.replace(/_/g, ' '),
    observedAt: observation.collectedAt,
    verificationStatus: observation.verificationStatus,
    freshness: freshnessOf(observation.collectedAt, {
      collectedAtPrecision: observation.collectedAtPrecision,
      priceType: observation.priceType,
      verificationStatus: observation.verificationStatus,
    }),
    href: `/commodities/${observation.commoditySlug ?? observation.commodityId}`,
  };
}

/** Sort the watch. Every ordering is stable and every one is total. */
function sortRows(rows: WatchRow[], sort: MarketWatchQuery['sort']): WatchRow[] {
  const copy = [...rows];
  switch (sort) {
    case 'price_asc':
      return copy.sort((a, b) => (a.amount ?? Infinity) - (b.amount ?? Infinity));
    case 'price_desc':
      return copy.sort((a, b) => (b.amount ?? -Infinity) - (a.amount ?? -Infinity));
    case 'commodity':
      return copy.sort((a, b) => a.commodityName.localeCompare(b.commodityName));
    case 'movement':
      // The watch does not rank by movement — a movement needs two comparable
      // observations and the watch holds one. Sorting by movement here would
      // silently promote the movers' logic into a second implementation.
      return copy.sort((a, b) => b.observedAt.localeCompare(a.observedAt));
    case 'recent':
    default:
      return copy.sort((a, b) => b.observedAt.localeCompare(a.observedAt));
  }
}
