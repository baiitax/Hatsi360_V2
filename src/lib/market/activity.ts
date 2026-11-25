import 'server-only';

import { getDataSource } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { classifyFreshness } from '@/lib/trade/freshness';
import type { PriceObservation } from '@/types/domain';

/**
 * The market activity feed.
 *
 * Phase 03 §10 requires that only events approved for public visibility are
 * shown, and §10.1 lists what must never appear: agent personal information,
 * internal review notes, rejected submissions, private verification comments
 * and confidential operational records.
 *
 * Every one of those is excluded **by construction**, because this module reads
 * the public `published_price_observations` view — which cannot see a rejected
 * row, an internal note or an unpublished record. There is no filter here that
 * could be got wrong, because the wrong rows are not in the result set at all.
 *
 * The feed is therefore a list of published observations, newest first, with
 * their provenance. It does not narrate "an agent did X"; it states what was
 * observed, where, when, and by what route it reached the public record.
 */

export interface MarketActivityQuery {
  limit?: number;
  commodityId?: number;
  marketId?: number;
  stateId?: number;
}

export interface ActivityEntry {
  id: string;
  kind: 'observation_published';
  commodityId: number;
  commodityName: string;
  commoditySlug: string;
  marketName: string | null;
  marketSlug: string | null;
  amount: number | null;
  currencyCode: string;
  unitLabel: string | null;
  priceType: string;
  observedAt: string;
  /** When the record was published, which is a different act from observation. */
  publishedAt: string | null;
  /** How the record reached the platform. */
  sourceSystem: PriceObservation['sourceSystem'];
  freshness: 'fresh' | 'today' | 'delayed' | 'stale' | 'timestamp_review';
  href: string;
}

export interface MarketActivityResult {
  entries: ActivityEntry[];
  /** How many published observations exist in total. */
  totalPublished: number;
  emptyReason: string | null;
}

/** The feed is a window, not a scroll. It never pages through the whole table. */
const DEFAULT_LIMIT = 12;

/**
 * The recent market activity feed.
 *
 * A limited window over the public view, newest first. Phase 03 §11 is explicit:
 * *"Do not continuously retrieve the entire historical observation table."*
 * The limit is enforced here and the caller cannot raise it past 50.
 */
export async function getMarketActivity(
  query: MarketActivityQuery = {},
): Promise<MarketActivityResult> {
  const limit = Math.min(50, Math.max(1, query.limit ?? DEFAULT_LIMIT));

  const empty = (reason: string): MarketActivityResult => ({
    entries: [],
    totalPublished: 0,
    emptyReason: reason,
  });

  if (!isSupabaseConfigured()) {
    return empty('No database is configured, so there is no activity to report.');
  }

  const source = await getDataSource();

  const result = await source.listObservations({
    page: 1,
    pageSize: limit,
    sort: 'recent',
    commodityId: query.commodityId,
    marketId: query.marketId,
    stateId: query.stateId,
  });

  if (result.items.length === 0) {
    return empty(
      result.total === 0
        ? 'No observation has completed verification and publication, so there is no public activity to report. The collection programme is running; publication is the step that has not been performed.'
        : 'No published observation matches those filters.',
    );
  }

  const entries: ActivityEntry[] = result.items.map((observation) => {
    const assessment = classifyFreshness({
      collectedAt: observation.collectedAt,
      collectedAtPrecision: observation.collectedAtPrecision,
      verificationStatus: observation.verificationStatus,
      priceType: observation.priceType,
    });

    return {
      id: observation.id,
      kind: 'observation_published',
      commodityId: observation.commodityId,
      commodityName: observation.commodityName ?? `Commodity ${observation.commodityId}`,
      commoditySlug: observation.commoditySlug ?? String(observation.commodityId),
      marketName: observation.marketName ?? null,
      marketSlug: observation.marketSlug ?? null,
      amount: observation.reportedAmount ?? observation.normalizedAmount ?? null,
      currencyCode: observation.currencyCode,
      unitLabel: observation.unitCode ?? observation.unitName ?? null,
      priceType: observation.priceType.replace(/_/g, ' '),
      observedAt: observation.collectedAt,
      publishedAt: observation.publishedAt,
      sourceSystem: observation.sourceSystem,
      freshness:
        assessment.state === 'future_timestamp'
          ? 'timestamp_review'
          : assessment.state === 'stale'
            ? 'stale'
            : assessment.state === 'delayed' || assessment.state === 'indicative'
              ? 'delayed'
              : assessment.state === 'latest_verified'
                ? 'today'
                : 'fresh',
      href: `/commodities/${observation.commoditySlug ?? observation.commodityId}`,
    };
  });

  return {
    entries,
    totalPublished: result.total,
    emptyReason: null,
  };
}
