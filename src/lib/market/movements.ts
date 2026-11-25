import 'server-only';

import { getDataSource } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { seriesKeyId } from '@/lib/trade';
import type { PriceObservation } from '@/types/domain';

/**
 * Price movements — daily and weekly.
 *
 * Phase 03 §7 gives the formula:
 *
 *   Change % = ((Current Comparable Price − Previous Comparable Price)
 *               / Previous Comparable Price) × 100
 *
 * and §7.3 gives the eligibility rules. Both are implemented here, and the
 * eligibility rules are **not** re-implemented — they are delegated to
 * `seriesKeyId` in `src/lib/trade/series.ts`, which is the single definition of
 * which two prices may be compared at all. A second implementation of
 * comparability would be a second place to be wrong.
 *
 * The comparison basis is the **same series key**, which means the same
 * commodity, market, price type, grade, reported unit, currency and variety. A
 * farmgate price is never compared with a retail price; a 50 kg bag is never
 * compared with a tonne; two currencies are never compared at all.
 */

export type MovementWindow = 'daily' | 'weekly';

export interface PriceMovementsQuery {
  window?: MovementWindow;
  /** How many rows to return. */
  limit?: number;
  /** Restrict to one commodity. */
  commodityId?: number;
}

export interface MovementRow {
  commodityId: number;
  commodityName: string;
  commoditySlug: string;
  marketId: number | null;
  marketName: string | null;
  /** The current comparable price, or `null` when it carries no amount. */
  currentAmount: number | null;
  /** The previous comparable price in the same series, or `null`. */
  previousAmount: number | null;
  /** The absolute change, or `null` when it cannot be calculated. */
  change: number | null;
  changePercent: number | null;
  currencyCode: string;
  unitLabel: string | null;
  gradeName: string | null;
  priceType: string;
  /** When the current observation was collected. */
  observedAt: string;
  /** When the previous observation was collected. */
  previousObservedAt: string | null;
  /** How many observations in the comparable series. */
  observationCount: number;
  /** Why the movement is unavailable, when it is. Never null with a null change. */
  unavailableReason: string | null;
}

export interface PriceMovementsResult {
  window: MovementWindow;
  rows: MovementRow[];
  /** How many commodities were examined. */
  examined: number;
  /** How many had a calculable movement. */
  calculable: number;
  /** A plain statement of why the list is empty, when it is. */
  emptyReason: string | null;
}

/** The weekly comparison window, in days. */
const WEEKLY_WINDOW_DAYS = 7;
const DAY = 86_400_000;

/**
 * Daily and weekly movements.
 *
 * **Daily** compares the newest published observation with the immediately
 * preceding one *in the same series*. It does not require the two to be 24 hours
 * apart — it requires them to be consecutive in the series, which is what
 * "daily movement" means on a platform that collects once a day.
 *
 * **Weekly** compares the newest observation with the newest observation that is
 * at least seven days older *in the same series*. Where no such observation
 * exists, the movement is unavailable and says so.
 *
 * Neither is annualised, projected or smoothed.
 */
export async function getPriceMovements(
  query: PriceMovementsQuery = {},
): Promise<PriceMovementsResult> {
  const window = query.window ?? 'daily';
  const limit = Math.min(200, Math.max(1, query.limit ?? 40));

  const empty = (reason: string): PriceMovementsResult => ({
    window,
    rows: [],
    examined: 0,
    calculable: 0,
    emptyReason: reason,
  });

  if (!isSupabaseConfigured()) {
    return empty('No database is configured, so no movement can be calculated.');
  }

  const source = await getDataSource();
  const commodities = await source.listCommodities();

  const rows: MovementRow[] = [];
  let examined = 0;

  for (const commodity of commodities) {
    if (query.commodityId != null && commodity.id !== query.commodityId) continue;

    const observations = await source.listObservationsForAnalysis({ commodityId: commodity.id });
    if (observations.length === 0) continue;
    examined += 1;

    const bySeries = groupBySeries(observations);

    // The dominant series is the one with the most observations — the same rule
    // `getMarketMovements` uses, so the two surfaces cannot disagree about which
    // series represents a commodity.
    let dominant: PriceObservation[] = [];
    for (const list of bySeries.values()) {
      if (list.length > dominant.length) dominant = list;
    }
    if (dominant.length === 0) continue;

    const sorted = [...dominant].sort(
      (a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime(),
    );
    const latest = sorted[0]!;
    const previous = window === 'daily' ? (sorted[1] ?? null) : findWeeklyPrevious(sorted);

    rows.push(
      buildRow({
        commodity,
        series: dominant,
        latest,
        previous,
        window,
      }),
    );
  }

  const calculable = rows.filter((row) => row.change != null).length;
  const ordered = rows.sort((a, b) => {
    // Rows with a calculable movement rank first, by magnitude; rows without
    // keep their recency order. A row that cannot be calculated is never
    // promoted above one that can.
    if (a.changePercent != null && b.changePercent != null) {
      return Math.abs(b.changePercent) - Math.abs(a.changePercent);
    }
    if (a.changePercent != null) return -1;
    if (b.changePercent != null) return 1;
    return b.observedAt.localeCompare(a.observedAt);
  });

  const sliced = ordered.slice(0, limit);

  return {
    window,
    rows: sliced,
    examined,
    calculable,
    emptyReason:
      sliced.length === 0
        ? `No commodity has two comparable published observations in the same series${window === 'weekly' ? ' at least seven days apart' : ''}. A movement is only calculated where both prices share a commodity, market, price type, grade, unit, currency and variety.`
        : null,
  };
}

/** Group observations by their series key, so nothing incomparable is compared. */
function groupBySeries(observations: PriceObservation[]): Map<string, PriceObservation[]> {
  const bySeries = new Map<string, PriceObservation[]>();
  for (const observation of observations) {
    const id = seriesKeyId({
      commodityId: observation.commodityId,
      marketId: observation.marketId,
      priceType: observation.priceType,
      gradeId: observation.gradeId,
      unitId: observation.reportedUnitId,
      currencyCode: observation.currencyCode,
      varietyId: observation.varietyId,
    });
    const list = bySeries.get(id);
    if (list) list.push(observation);
    else bySeries.set(id, [observation]);
  }
  return bySeries;
}

/**
 * The weekly comparison point: the newest observation at least seven days older
 * than the latest, in the same series.
 *
 * `sorted` is newest-first. The first entry that is at least seven days older
 * than the head is the weekly comparison — and if the series jumps from three
 * days ago to nine days ago, the nine-day-old one is used, because it is the
 * newest observation that is genuinely a week old.
 */
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

interface BuildRowInput {
  commodity: { id: number; name: string; slug: string };
  series: PriceObservation[];
  latest: PriceObservation;
  previous: PriceObservation | null;
  window: MovementWindow;
}

function buildRow({
  commodity,
  series,
  latest,
  previous,
  window,
}: BuildRowInput): MovementRow {
  const currentAmount = latest.reportedAmount;
  const previousAmount = previous?.reportedAmount ?? null;

  let change: number | null = null;
  let changePercent: number | null = null;
  let unavailableReason: string | null = null;

  if (currentAmount == null) {
    unavailableReason = 'The latest observation carries no comparable amount.';
  } else if (previous == null) {
    unavailableReason =
      window === 'weekly'
        ? `Insufficient history: no observation in this series is at least ${WEEKLY_WINDOW_DAYS} days older than the latest.`
        : 'Insufficient history: this series has only one published observation.';
  } else if (previousAmount == null) {
    unavailableReason = 'The previous observation carries no comparable amount.';
  } else if (previousAmount === 0) {
    // A zero denominator is not a 0% change and it is not an infinite one. It is
    // a movement that cannot be expressed as a percentage.
    change = currentAmount - previousAmount;
    unavailableReason =
      'The previous comparable price was zero, so a percentage change cannot be calculated. The absolute change is shown instead.';
  } else {
    change = currentAmount - previousAmount;
    changePercent = (change / previousAmount) * 100;
  }

  return {
    commodityId: commodity.id,
    commodityName: commodity.name,
    commoditySlug: commodity.slug,
    marketId: latest.marketId,
    marketName: latest.marketName ?? null,
    currentAmount,
    previousAmount,
    change,
    changePercent,
    currencyCode: latest.currencyCode,
    unitLabel: latest.unitCode ?? latest.unitName ?? null,
    gradeName: latest.gradeName ?? null,
    priceType: latest.priceType.replace(/_/g, ' '),
    observedAt: latest.collectedAt,
    previousObservedAt: previous?.collectedAt ?? null,
    observationCount: series.length,
    unavailableReason,
  };
}
