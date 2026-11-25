import 'server-only';

import {
  classifyFreshness,
  type CollectionCadence,
  type PriceState,
} from '@/lib/trade/freshness';
import type { VerificationStatus } from '@/types/domain';
import type { FreshnessState } from '@/components/market/MarketOverview';

/** Re-exported so the services can name the coarse vocabulary without importing a component. */
export type { FreshnessState };

/**
 * The coarse freshness vocabulary the terminal's indicator renders.
 *
 * `src/lib/trade/freshness.ts` is the single source of truth for how current a
 * price is. It returns a `PriceState`, including `indicative`, `live_feed` and
 * `future_timestamp`, which describe *what kind* of data something is as much
 * as how old it is.
 *
 * `DataFreshnessIndicator` renders a coarser six-value vocabulary, because a
 * chip in a table row cannot carry every engine distinction legibly.
 *
 * **This module is the only place that mapping exists.** Before it, three
 * services each carried their own ad-hoc age arithmetic, and they disagreed:
 * one called a six-hour-old observation `today`, another called it `fresh`. The
 * tests caught it. The fix is not to align the three by hand — it is to delete
 * two of them and map the third to the engine's answer.
 */

/**
 * Classify an observation's freshness through the engine.
 *
 * `now` is injectable so a test can pin it. Without that, a freshness test is a
 * test of the clock.
 */
export function assessFreshness(
  collectedAt: string | null,
  options: {
    collectedAtPrecision?: 'minute' | 'date';
    priceType?: Parameters<typeof classifyFreshness>[0]['priceType'];
    /**
     * Passed through so the engine can distinguish a verified-but-old price
     * from an unverified one. Both are past the fresh window; only the verified
     * one is still "the most recent checked price available".
     */
    verificationStatus?: VerificationStatus;
    /** Only set when the public record has a known collection schedule. */
    cadence?: CollectionCadence;
    now?: Date;
  } = {},
): PriceState {
  if (!collectedAt) return 'no_data';
  return classifyFreshness({
    collectedAt,
    collectedAtPrecision: options.collectedAtPrecision ?? 'minute',
    priceType: options.priceType,
    verificationStatus: options.verificationStatus,
    cadence: options.cadence,
    now: options.now,
  }).state;
}

/**
 * Map the engine's state onto the indicator's vocabulary.
 *
 * The mapping is deliberately lossy in one direction only: `indicative` becomes
 * `delayed` because both mean "read this with care". It never becomes `fresh`,
 * because an indicative price is not a fresh one.
 */
export function coarseFreshness(state: PriceState): FreshnessState {
  switch (state) {
    case 'recently_updated':
    case 'live_feed':
      return 'fresh';
    case 'latest_verified':
      return 'today';
    case 'delayed':
    case 'indicative':
      return 'delayed';
    case 'stale':
      return 'stale';
    case 'future_timestamp':
      return 'timestamp_review';
    case 'no_data':
    default:
      return 'unavailable';
  }
}

/** Classify and map in one step, for a table row. */
export function freshnessOf(
  collectedAt: string | null,
  options: {
    collectedAtPrecision?: 'minute' | 'date';
    priceType?: Parameters<typeof classifyFreshness>[0]['priceType'];
    verificationStatus?: VerificationStatus;
    cadence?: CollectionCadence;
    now?: Date;
  } = {},
): FreshnessState {
  return coarseFreshness(assessFreshness(collectedAt, options));
}
