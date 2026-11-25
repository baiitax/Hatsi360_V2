import 'server-only';

/**
 * Hatsi360 Markets — the market data services.
 *
 * Phase 03 §16 asks for a set of logical service responsibilities. It also says,
 * in the same section: *"Do not create unnecessary service files if equivalent
 * functionality already exists."*
 *
 * It largely does exist. The comparability engine in `src/lib/trade/` already
 * answers which prices may be compared (`series.ts`), how current one is
 * (`freshness.ts`), and what the spread and best prices are (`opportunities.ts`).
 * The read layer in `src/lib/trade/queries.ts` already restricts every query to
 * the public `published_price_observations` view.
 *
 * So this folder adds only what Phase 03 needs and nothing else has:
 *
 *   overview.ts     the KPI row and its definitions
 *   watch.ts        the latest qualifying observation per commodity, filterable
 *   movements.ts    daily and weekly comparisons, with eligibility
 *   comparison.ts   one commodity across markets (the only comparison the data supports)
 *   activity.ts     the recent published-observation feed
 *   coverage.ts     configured vs reporting markets, by state
 *   search.ts       commodity, market and state discovery
 *
 * Every one of them reads the public view. None of them can reach a draft, a
 * rejected row or an unpublished observation, and none of them computes a
 * figure the schema cannot support.
 */

export { getMarketOverview, type MarketOverview, type OverviewMetric } from './overview';
export {
  getMarketWatch,
  type MarketWatchQuery,
  type MarketWatchResult,
  type WatchRow,
} from './watch';
export {
  getPriceMovements,
  type PriceMovementsQuery,
  type PriceMovementsResult,
  type MovementRow,
  type MovementWindow,
} from './movements';
export {
  getMarketComparison,
  type MarketComparisonQuery,
  type MarketComparisonResult,
  type ComparisonRow,
} from './comparison';
export {
  getMarketActivity,
  type MarketActivityQuery,
  type MarketActivityResult,
  type ActivityEntry,
} from './activity';
export {
  getMarketCoverage,
  type MarketCoverage,
  type CoverageState,
  type MarketCoverageRow,
} from './coverage';
export { searchMarket, type MarketSearchResult, type SearchGroup } from './search';
