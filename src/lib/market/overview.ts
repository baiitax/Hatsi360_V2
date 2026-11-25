import 'server-only';

import { getDataSource } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getMarketMovements } from '@/lib/trade';

/**
 * The global market overview.
 *
 * Phase 03 §5.2 is explicit that these metrics must not be used
 * interchangeably: *"A market being configured does not mean it currently has
 * recent price observations. A commodity existing in the database does not mean
 * it has a current market price."*
 *
 * So each metric below carries its own definition, its own denominator, and its
 * own freshness statement. `configuredMarkets` and `reportingMarkets` are
 * different numbers and are never added together.
 */

/** One KPI on the overview row. */
export interface OverviewMetric {
  id: string;
  label: string;
  /** The value, or `null` when the platform has no figure. */
  value: number | null;
  /** What the value counts, in one line. */
  detail: string;
  /** The exact methodology. Phase 03 §5.2 requires it be defined, not implied. */
  definition: string;
  /** Where the number came from. */
  source: string;
  /** Why the value is unavailable, when it is. */
  unavailableReason?: string;
  href?: string;
}

export interface MarketOverview {
  metrics: OverviewMetric[];
  /** The reporting date the overview is stated as at. */
  reportingDate: string;
  counts: {
    configuredMarkets: number;
    reportingMarkets: number;
    trackedCommodities: number;
    observedCommodities: number;
    publishedObservations: number;
    commoditiesWithMovement: number;
  };
}

/**
 * Build the global market overview.
 *
 * Six metrics, each measured from the database:
 *
 *   1. Tracked commodities        — active commodities in the catalogue.
 *   2. Configured markets         — active market records.
 *   3. Reporting markets          — markets with ≥1 published observation.
 *   4. Published observations     — rows in the public view.
 *   5. Commodities with movement  — ≥1 valid comparable change.
 *   6. Coverage freshness         — the newest published observation's state.
 *
 * Metric 3 is the one that matters most and is the one most easily faked: it is
 * counted from the *public view*, not from the markets table. A market that is
 * configured but has published nothing is not a reporting market.
 */
export async function getMarketOverview(): Promise<MarketOverview> {
  const empty: MarketOverview = {
    metrics: [],
    reportingDate: new Date().toISOString().slice(0, 10),
    counts: {
      configuredMarkets: 0,
      reportingMarkets: 0,
      trackedCommodities: 0,
      observedCommodities: 0,
      publishedObservations: 0,
      commoditiesWithMovement: 0,
    },
  };

  if (!isSupabaseConfigured()) return empty;

  const source = await getDataSource();

  const [commodities, markets, movements] = await Promise.all([
    source.listCommodities(),
    source.listMarkets(),
    getMarketMovements(500),
  ]);

  const trackedCommodities = commodities.filter((c) => c.isActive).length;
  const configuredMarkets = markets.length;

  // The public view, counted and sampled in one query. The total is indexed
  // (`published_idx`); the sample gives the newest row for the reporting date.
  const published = await source.listObservations({ page: 1, pageSize: 1 });
  const publishedObservations = published.total;

  // A reporting market is one that appears in the public view. Counting them
  // from the view — rather than from the markets table — is what keeps this
  // figure honest: a configured market that has published nothing is not a
  // reporting market.
  //
  // This has to read the view, not a summary table, and it has to read *all* of
  // it: the first draft derived the distinct markets from a one-row page, which
  // made the count either 0 or 1 no matter how many markets were reporting.
  // The analysis path is the accessor that returns the whole view.
  const publishedRows = await source.listObservationsForAnalysis({});
  const reportingMarketIds = new Set<number>();
  const observedCommodityIds = new Set<number>();
  for (const observation of publishedRows) {
    reportingMarketIds.add(observation.marketId);
    observedCommodityIds.add(observation.commodityId);
  }
  const reportingMarkets = reportingMarketIds.size;

  const commoditiesWithMovement = movements.filter((row) => row.change != null).length;
  const observedCommodities = observedCommodityIds.size;

  const newest = published.items[0];
  const reportingDate = newest?.collectedAt
    ? newest.collectedAt.slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const metrics: OverviewMetric[] = [
    {
      id: 'tracked-commodities',
      label: 'Tracked commodities',
      value: trackedCommodities,
      detail: 'active commodities in the catalogue',
      definition:
        'The number of active commodity records available for market monitoring. A commodity being tracked does not mean it has a current market price.',
      source: 'commodities where is_active',
      href: '/commodities',
    },
    {
      id: 'configured-markets',
      label: 'Configured markets',
      value: configuredMarkets,
      detail: 'active market records under coverage',
      definition:
        'The number of active market records in the configured market coverage. A configured market is not necessarily a reporting market — see Reporting markets.',
      source: 'markets',
      href: '/markets',
    },
    {
      id: 'reporting-markets',
      label: 'Reporting markets',
      value: reportingMarkets,
      detail: 'markets with at least one published observation',
      definition:
        'The number of distinct markets appearing in the public published-observation view. This is the figure that describes actual coverage; it is never the same as Configured markets unless every market is reporting.',
      source: 'published_price_observations',
      href: '/coverage',
      unavailableReason:
        reportingMarkets === 0
          ? 'No market has a published observation, so none is reporting. The configured markets exist; their prices have not been published.'
          : undefined,
    },
    {
      id: 'published-observations',
      label: 'Published observations',
      value: publishedObservations,
      detail: 'verified and published price records',
      definition:
        'The number of rows in the public view: current, published, verified or legacy-unverified, and not a test fixture. It is not the number of observations collected — most collected rows are still unpublished.',
      source: 'published_price_observations',
      href: '/prices',
      unavailableReason:
        publishedObservations === 0
          ? 'No observation has completed the publication act. Verification and publication are separate steps, and publication has not been performed.'
          : undefined,
    },
    {
      id: 'commodities-with-movement',
      label: 'Commodities with movement',
      value: commoditiesWithMovement,
      detail: 'with a valid comparable change',
      definition:
        'The number of commodities with at least one valid comparable price change between two published observations in the same series — same commodity, market, grade, unit, currency and price type. Incomparable records are excluded rather than compared.',
      source: 'derived from published_price_observations',
      unavailableReason:
        commoditiesWithMovement === 0
          ? 'A movement needs two comparable published observations in the same series. The platform does not currently hold enough to calculate one, and none is estimated.'
          : undefined,
    },
    {
      id: 'observed-commodities',
      label: 'Commodities observed',
      value: observedCommodities,
      detail: 'with at least one published price',
      definition:
        'The number of commodities with at least one published observation. A commodity in the catalogue with no published price is counted in Tracked commodities but not here.',
      source: 'published_price_observations',
      href: '/commodities',
    },
  ];

  return {
    metrics,
    reportingDate,
    counts: {
      configuredMarkets,
      reportingMarkets,
      trackedCommodities,
      observedCommodities,
      publishedObservations,
      commoditiesWithMovement,
    },
  };
}
