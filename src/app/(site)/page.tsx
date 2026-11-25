import Link from 'next/link';
import type { Metadata } from 'next';
import { splitUnitName } from '@/lib/money';
import { BRAND } from '@/lib/brand';
import {
  getMarketActivity,
  getMarketComparison,
  getMarketCoverage,
  getMarketOverview,
  getMarketWatch,
  getPriceMovements,
} from '@/lib/market';
import { PRICE_TYPE_META } from '@/types/domain';
import {
  PageContainer,
  PageHeader,
  SectionHeader,
} from '@/components/terminal/TerminalShell';
import {
  MarketMovers,
  MarketOverviewCard,
  type MoverRow,
} from '@/components/market/MarketOverview';
import { MarketWatchCards, MarketWatchTable, type MarketWatchRow } from '@/components/market/MarketWatchTable';
import { GlobalSearch } from '@/components/market/GlobalSearch';
import { EmptyStatePanel, ProvenanceNotice } from '@/components/feedback/TerminalFeedback';
import { OrganizationJsonLd, WebSiteJsonLd } from '@/components/marketing/StructuredData';

/**
 * The Hatsi360 Markets homepage.
 *
 * This is the terminal's front page, and it is the opposite of a corporate
 * hero. The brief is explicit: the page "should immediately communicate what is
 * happening in the market" and must avoid a large corporate hero banner. So the
 * first thing below the header is the market watch — the table a trader opens
 * the product to read — and everything else on the page is secondary to it.
 *
 * What the page shows, in the order Phase 03 asks for it:
 *
 *  §4  Global search         — commodities, markets and states, server-side
 *  §5  Market overview       — six metrics, each with its definition and source
 *  §6  Market watch          — the latest qualifying observation per series,
 *                              with its unit, grade, market, price type, daily
 *                              and weekly movement, observation time and state
 *  §7/§8 Gainers & decliners — between comparable observations only
 *  §9  Regional comparison   — one commodity across markets
 *  §11 Recent observations   — a bounded window, not a scroll
 *  §10 Coverage & freshness  — configured markets against reporting markets
 *
 * Every figure comes from the database through the platform's own services, and
 * every service reads the same public view the rest of the product reads. So
 * this page cannot show something the rest of the product would not.
 *
 * When the platform holds no published observation — which is the case today —
 * the watch table is replaced by an empty state that says so and explains what
 * publication means, the movers panels say why no movement exists, and the
 * comparison is not attempted. That is the honest version of this page, and it
 * is the version shipped. None of those empty states is filled with a figure.
 */

export const metadata: Metadata = {
  // `absolute` rather than a plain string: the root layout declares
  // `title.template = '%s | Hatsi360'`, so a plain string would render as
  // "Hatsi360 | … | Hatsi360". The homepage is the one page whose title must
  // stand alone.
  title: { absolute: `${BRAND.productName} — African Agricultural Market Intelligence` },
  description:
    'Agricultural commodity prices collected in the field, verified before publication, with the market, unit, price type, grade and observation time behind every figure.',
  alternates: { canonical: '/' },
  openGraph: {
    title: `${BRAND.productName} — African Agricultural Market Intelligence`,
    description:
      'Agricultural commodity prices collected in the field, verified before publication, with the provenance behind every figure.',
    type: 'website',
  },
};

export const dynamic = 'force-dynamic';

/** How many watch rows the homepage shows before pointing at the full directory. */
const WATCH_LIMIT = 12;
/** How many recent observations the feed shows. */
const ACTIVITY_LIMIT = 8;

export default async function MarketsHomePage() {
  const [
    overview,
    watch,
    daily,
    weekly,
    coverage,
    activity,
  ] = await Promise.all([
    getMarketOverview().catch(() => null),
    getMarketWatch({ sort: 'recent', pageSize: WATCH_LIMIT }).catch(() => null),
    getPriceMovements({ window: 'daily', limit: 12 }).catch(() => null),
    getPriceMovements({ window: 'weekly', limit: 12 }).catch(() => null),
    getMarketCoverage().catch(() => null),
    getMarketActivity({ limit: ACTIVITY_LIMIT }).catch(() => null),
  ]);

  // The comparison is a second round-trip: it needs a commodity to compare
  // across markets, and the commodity that has the most markets reporting is
  // the one the data can actually support. Phase 03 §9 asks for one commodity
  // across markets, and that is what the schema allows — there is one market
  // per state and no market zone, so a regional aggregate is not computable.
  const comparison = await loadComparison().catch(() => null);

  const watchRows: MarketWatchRow[] = (watch?.rows ?? []).map((row) => {
    const priceTypeLabel =
      PRICE_TYPE_META[row.priceType as keyof typeof PRICE_TYPE_META]?.label ?? row.priceType;
    const componentRow: MarketWatchRow = {
      id: row.id,
      commodityName: row.commodityName,
      commoditySlug: row.commoditySlug,
      marketName: row.marketName,
      marketSlug: row.marketSlug,
      amount: row.amount,
      currencyCode: row.currencyCode,
      unitLabel: row.unitLabel,
      priceTypeLabel,
      priceType: row.priceType,
      gradeName: row.gradeName,
      changePercent: null,
      observedAt: row.observedAt,
      verificationStatus: row.verificationStatus,
      href: row.href,
    };
    // The movements are matched *after* the row is built, so the match sees the
    // same fields the table renders.
    componentRow.changePercent = movementFor(daily?.rows ?? [], componentRow);
    componentRow.weeklyChangePercent = movementFor(weekly?.rows ?? [], componentRow);
    return componentRow;
  });

  const movers: MoverRow[] = (daily?.rows ?? [])
    .filter((row) => row.changePercent !== null)
    .map((row) => ({
      id: `${row.commodityId}-${row.marketId ?? 'x'}`,
      commodityName: row.commodityName,
      commoditySlug: row.commoditySlug,
      amount: row.currentAmount,
      currencyCode: row.currencyCode,
      unitLabel: row.unitLabel,
      changePercent: row.changePercent,
      marketName: row.marketName,
      observedAt: row.observedAt,
    }));

  const publishedCount = overview?.counts.publishedObservations ?? 0;
  const reportingMarkets = overview?.counts.reportingMarkets ?? coverage?.counts.reporting ?? 0;
  const configuredMarkets = overview?.counts.configuredMarkets ?? coverage?.counts.configured ?? 0;
  const observedCommodities = overview?.counts.observedCommodities ?? 0;
  const trackedCommodities = overview?.counts.trackedCommodities ?? 0;
  const withMovement = overview?.counts.commoditiesWithMovement ?? 0;
  const newestObservedAt = coverage?.rows.find((row) => row.newestObservedAt)?.newestObservedAt
    ?? activity?.entries[0]?.observedAt
    ?? null;

  return (
    <>
      <OrganizationJsonLd />
      <WebSiteJsonLd />

      <PageContainer className="pb-16 lg:pb-12">
        {/* ------------------------------------------------------ the header */}
        <PageHeader
          title="Market watch"
          description={
            publishedCount === 0
              ? 'Every published price observation, with its unit, grade, market, price type, movement and verification state. Nothing has completed publication yet, so the watch is empty — and it says so rather than showing a figure.'
              : `Every published price observation, with its unit, grade, market, price type, movement and verification state. ${publishedCount} record${publishedCount === 1 ? '' : 's'} eligible for public display.`
          }
          meta={
            <p className="figure-num text-[0.6875rem] text-terminal-text-muted">
              {buildCoverageLine({
                published: publishedCount,
                observedCommodities,
                trackedCommodities,
                reportingMarkets,
                configuredMarkets,
              })}
            </p>
          }
          actions={
            <>
              <Link href="/markets" className="terminal-control">
                Markets
              </Link>
              <Link href="/commodities" className="terminal-control">
                Commodities
              </Link>
              <Link href="/trade" className="terminal-action">
                Trade terminal
              </Link>
            </>
          }
        />

        {/* ------------------------------------------- §4 the global search */}
        <section aria-labelledby="search-heading" className="pb-8">
          <h2 id="search-heading" className="sr-only">
            Search commodities, markets and states
          </h2>
          <GlobalSearch className="max-w-xl" />
          <p className="mt-1.5 text-[0.6875rem] leading-4 text-terminal-text-muted">
            Search runs against the platform&rsquo;s own records. A commodity that exists is not the
            same as a commodity with a published price, and the results never claim otherwise.
          </p>
        </section>

        {/* -------------------------------------------------- overview cards */}
        <section aria-labelledby="overview-heading" className="pb-8">
          <SectionHeader
            title="Market overview"
            action={{ href: '/coverage', label: 'Coverage report' }}
          />
          <h2 id="overview-heading" className="sr-only">
            Market overview
          </h2>
          {overview && overview.metrics.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
              {overview.metrics.map((metric) => (
                <MarketOverviewCard
                  key={metric.id}
                  label={metric.label}
                  value={metric.value}
                  detail={metric.detail}
                  definition={metric.definition}
                  source={metric.source}
                  href={metric.href}
                  // A zero is a real measurement and is shown as a zero. Only a
                  // metric the platform cannot answer at all is toned down, and
                  // then only because it says so in the value slot.
                  tone={metric.value === null ? 'unavailable' : 'neutral'}
                  unavailableReason={metric.unavailableReason}
                />
              ))}
            </div>
          ) : (
            <EmptyStatePanel kind="no-market-data" />
          )}
        </section>

        {/* ------------------------------------------------ the market watch */}
        <section aria-labelledby="watch-heading" className="pb-8">
          <SectionHeader
            title="Commodity market watch"
            count={watchRows.length}
            countLabel="shown, most recent first"
            action={{ href: '/prices', label: 'Full price directory' }}
          />
          <h2 id="watch-heading" className="sr-only">
            Commodity market watch
          </h2>

          {watchRows.length === 0 ? (
            <EmptyStatePanel kind="no-market-data" />
          ) : (
            <div className="terminal-panel terminal-panel--table">
              {/* The desktop table. Hidden below md, where the cards carry the
                  same data in a layout a phone can actually read. */}
              <div className="hidden md:block">
                <MarketWatchTable
                  rows={watchRows}
                  caption="The latest qualifying published observation for each series, with its unit, price type, grade, daily and weekly movement, observation time and verification state."
                  showWeekly={(weekly?.calculable ?? 0) > 0}
                  footer={
                    <ProvenanceNotice source="published_price_observations, current and verified">
                      Movement is calculated only between two observations that share a series key —
                      the same commodity, market, price type, grade, unit and currency. A direction,
                      not a recommendation. One row per series, so two grades of one commodity stay
                      two rows.
                    </ProvenanceNotice>
                  }
                />
              </div>
              <div className="md:hidden">
                <MarketWatchCards rows={watchRows} showWeekly={(weekly?.calculable ?? 0) > 0} />
              </div>
            </div>
          )}
        </section>

        {/* ------------------------------------------------------- the movers */}
        <section aria-labelledby="movers-heading" className="pb-8">
          <h2 id="movers-heading" className="sr-only">
            Market movers
          </h2>
          <div className="grid min-w-0 gap-2.5 lg:grid-cols-2 [&>*]:min-w-0">
            <MarketMovers
              direction="gainers"
              rows={movers}
              emptyReason={
                daily?.emptyReason ??
                'No comparable movement to report. A movement needs two published observations in the same series.'
              }
            />
            <MarketMovers
              direction="decliners"
              rows={movers}
              emptyReason={
                daily?.emptyReason ??
                'No comparable movement to report. A movement needs two published observations in the same series.'
              }
            />
          </div>
          <p className="pt-2 text-[0.6875rem] leading-4 text-terminal-text-muted">
            {(daily?.calculable ?? 0) > 0
              ? `${daily?.calculable} of ${daily?.examined ?? 0} series examined have a comparable daily movement. The rest are excluded rather than estimated.`
              : 'Movements are compared only within a series. Nothing is compared across price types, grades, units, currencies or markets.'}
          </p>
        </section>

        {/* ------------------------------------------- §9 regional comparison */}
        <section aria-labelledby="comparison-heading" className="pb-8">
          <SectionHeader title="Market comparison" count={comparison?.rows.length ?? 0} />
          <h2 id="comparison-heading" className="sr-only">
            Market comparison
          </h2>
          {comparison && comparison.rows.length > 1 ? (
            <ComparisonPanel comparison={comparison} />
          ) : (
            <>
              <EmptyStatePanel kind="no-comparison" action={null} />
              <p className="pt-2 text-[0.6875rem] leading-4 text-terminal-text-muted">
                A comparison needs the same commodity, the same price type, the same grade and the
                same unit in at least two markets. The platform will not manufacture the difference
                by comparing across grades, units, currencies or price types, and it does not
                compute a regional or national average — there is no market-zone data to aggregate
                over.
              </p>
            </>
          )}
        </section>

        {/* --------------------------------------------- §11 recent activity */}
        <section aria-labelledby="activity-heading" className="pb-8">
          <SectionHeader title="Recent observations" count={activity?.entries.length ?? 0} />
          <h2 id="activity-heading" className="sr-only">
            Recent observations
          </h2>
          {activity && activity.entries.length > 0 ? (
            <ol className="terminal-panel divide-y divide-terminal-border">
              {activity.entries.map((entry) => (
                <li key={entry.id}>
                  <Link
                    href={entry.href}
                    className="flex min-h-[3rem] items-center gap-3 px-3.5 py-2 transition-colors hover:bg-terminal-interactive/50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.8125rem] font-medium text-terminal-text">
                        {entry.commodityName}
                        {entry.priceType ? (
                          <span className="ml-1.5 font-normal text-terminal-text-muted">
                            {PRICE_TYPE_META[entry.priceType as keyof typeof PRICE_TYPE_META]?.label ?? entry.priceType}
                          </span>
                        ) : null}
                      </span>
                      <span className="block truncate text-[0.6875rem] text-terminal-text-muted">
                        {entry.marketName ?? 'Market not recorded'} ·{' '}
                        {entry.observedAt ? formatMoment(entry.observedAt) : 'time not recorded'}
                      </span>
                    </span>
                    <span className="figure-num shrink-0 text-right text-[0.8125rem] font-semibold text-terminal-text">
                      {entry.amount === null
                        ? 'Not observed'
                        : `${formatMoney(entry.amount, entry.currencyCode)}${
                            entry.unitLabel ? ` / ${splitUnitName(entry.unitLabel).short}` : ''
                          }`}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyStatePanel kind="no-observations" />
          )}
          <p className="pt-2 text-[0.6875rem] leading-4 text-terminal-text-muted">
            {activity?.totalPublished
              ? `The ${activity.entries.length} most recent of ${activity.totalPublished} published observation${activity.totalPublished === 1 ? '' : 's'}. A window, not a scroll — the full directory is on the prices page.`
              : 'No observation has completed publication. Verification and publication are separate acts, and publication has not been performed.'}
          </p>
        </section>

        {/* ------------------------------------------- §10 coverage/freshness */}
        <section aria-labelledby="coverage-heading" className="pb-8">
          <SectionHeader
            title="What the platform actually covers"
            action={{ href: '/coverage', label: 'Coverage report' }}
          />
          <h2 id="coverage-heading" className="sr-only">
            What the platform actually covers
          </h2>
          <div className="grid min-w-0 gap-2.5 lg:grid-cols-2 [&>*]:min-w-0">
            <CoveragePanel
              coverage={coverage}
              reportingMarkets={reportingMarkets}
              configuredMarkets={configuredMarkets}
              newestObservedAt={newestObservedAt}
            />
            <FreshnessPanel
              publishedCount={publishedCount}
              withMovement={withMovement}
              newestObservedAt={newestObservedAt}
            />
          </div>
        </section>
      </PageContainer>
    </>
  );
}

/* ------------------------------------------------------------- the panels */

/**
 * The comparison panel.
 *
 * The benchmark is the **median** of the markets compared, and it is labelled
 * as such. A mean would be dragged by one extreme market, and "the national
 * price" would be a claim the platform has no data to make: there is no
 * national price series, and inventing one from eleven markets would be a
 * fabrication.
 */
function ComparisonPanel({
  comparison,
}: {
  comparison: NonNullable<Awaited<ReturnType<typeof getMarketComparison>>>;
}) {
  return (
    <div className="terminal-panel terminal-panel--table">
      <header className="border-b border-terminal-border px-3.5 py-2.5">
        <h3 className="font-display text-[0.8125rem] font-bold text-terminal-text">
          {comparison.commodityName} across {comparison.marketsCompared} market
          {comparison.marketsCompared === 1 ? '' : 's'}
        </h3>
        <p className="figure-label text-terminal-text-muted">
          {comparison.benchmark?.label ?? 'No benchmark'} ·{' '}
          {comparison.benchmark?.amount !== null && comparison.benchmark
            ? formatMoney(comparison.benchmark.amount, comparison.rows[0]?.currencyCode ?? 'NGN')
            : 'not available'}
        </p>
      </header>
      <ol className="divide-y divide-terminal-border">
        {comparison.rows.map((row) => (
          <li key={row.marketId} className="flex items-center gap-3 px-3.5 py-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.8125rem] font-medium text-terminal-text">
                {row.marketSlug ? (
                  <Link href={`/markets/${row.marketSlug}`} className="underline decoration-terminal-border decoration-1 underline-offset-2">
                    {row.marketName}
                  </Link>
                ) : (
                  row.marketName
                )}
              </span>
              <span className="block truncate text-[0.6875rem] text-terminal-text-muted">
                {row.stateName ?? 'State not recorded'} ·{' '}
                {row.unitLabel ? `per ${splitUnitName(row.unitLabel).short}` : 'unit not recorded'}
                {row.gradeName ? ` · ${row.gradeName}` : ''}
              </span>
            </span>
            <span className="figure-num shrink-0 text-right">
              <span className="block text-[0.8125rem] font-semibold text-terminal-text">
                {row.amount === null
                  ? 'Not observed'
                  : formatMoney(row.amount, row.currencyCode)}
              </span>
              <span className="block text-[0.6875rem] text-terminal-text-muted">
                {row.differencePercent === null
                  ? 'no benchmark'
                  : `${row.differencePercent > 0 ? '+' : ''}${row.differencePercent.toFixed(1)}%`}
              </span>
            </span>
          </li>
        ))}
      </ol>
      {comparison.notComputed && comparison.notComputed.length > 0 ? (
        <footer className="border-t border-terminal-border px-3.5 py-2">
          <p className="figure-label text-terminal-text-muted">Not computed</p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {comparison.notComputed.map((note) => (
              <li key={note} className="text-[0.6875rem] leading-4 text-terminal-text-muted">
                {note}
              </li>
            ))}
          </ul>
        </footer>
      ) : null}
    </div>
  );
}

/**
 * The coverage panel.
 *
 * Configured markets and reporting markets are two different numbers and they
 * are never summed, averaged or presented as one figure. A configured market is
 * a record; a reporting market is a market that has published a price. The
 * difference between them is the honest measure of coverage.
 */
function CoveragePanel({
  coverage,
  reportingMarkets,
  configuredMarkets,
  newestObservedAt,
}: {
  coverage: Awaited<ReturnType<typeof getMarketCoverage>> | null;
  reportingMarkets: number;
  configuredMarkets: number;
  newestObservedAt: string | null;
}) {
  const reporting = coverage?.rows.filter((row) => row.state === 'reporting') ?? [];

  return (
    <article className="terminal-panel flex flex-col p-3.5">
      <header className="flex items-start justify-between gap-2">
        <h3 className="font-display text-[0.875rem] font-bold text-terminal-text">
          Coverage and freshness
        </h3>
        <Link href="/coverage" className="terminal-control">
          Coverage report
        </Link>
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-2.5 border-t border-terminal-border pt-3">
        <div>
          <dt className="figure-label">Configured markets</dt>
          <dd className="figure-num text-figure font-bold text-terminal-text">
            {configuredMarkets}
            <span className="mt-0.5 block text-[0.625rem] font-normal leading-4 text-terminal-text-muted">
              Active market records under coverage. A record, not a price.
            </span>
          </dd>
        </div>
        <div>
          <dt className="figure-label">Reporting markets</dt>
          <dd className="figure-num text-figure font-bold text-terminal-text">
            {reportingMarkets}
            <span className="mt-0.5 block text-[0.625rem] font-normal leading-4 text-terminal-text-muted">
              Markets with at least one published observation.
            </span>
          </dd>
        </div>
      </dl>

      {reporting.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1 border-t border-terminal-border pt-3">
          {reporting.slice(0, 6).map((row) => (
            <li key={row.marketId} className="flex items-center justify-between gap-2 text-[0.75rem]">
              <span className="truncate text-terminal-text-secondary">{row.marketName}</span>
              <span className="figure-num shrink-0 text-terminal-text-muted">
                {row.commoditiesCovered} commodit{row.commoditiesCovered === 1 ? 'y' : 'ies'}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 border-t border-terminal-border pt-3 text-[0.75rem] leading-5 text-terminal-text-secondary">
          No market is reporting. The {configuredMarkets} configured markets exist; their prices
          have not completed publication, so none of them is counted as reporting.
        </p>
      )}

      <p className="mt-3 text-[0.625rem] leading-4 text-terminal-text-muted">
        {newestObservedAt
          ? `Newest published observation ${formatMoment(newestObservedAt)} UTC. Freshness is measured from the observation, never from when the page loaded.`
          : 'The platform holds no published observation, so there is no freshness to report.'}
      </p>
    </article>
  );
}

/** What the platform can and cannot currently derive, stated plainly. */
function FreshnessPanel({
  publishedCount,
  withMovement,
  newestObservedAt,
}: {
  publishedCount: number;
  withMovement: number;
  newestObservedAt: string | null;
}) {
  return (
    <article className="terminal-panel flex flex-col p-3.5">
      <header className="flex items-start justify-between gap-2">
        <h3 className="font-display text-[0.875rem] font-bold text-terminal-text">
          How current the data is
        </h3>
        <Link href="/prices" className="terminal-control">
          Price directory
        </Link>
      </header>
      <p className="mt-2 text-[0.75rem] leading-5 text-terminal-text-secondary">
        Freshness is a property of an observation, not of this page. It is measured from the
        collection timestamp, and it is never restated as &ldquo;real-time&rdquo; — a price
        collected this morning is this morning&rsquo;s price, whatever time it is now.
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-2.5 border-t border-terminal-border pt-3">
        <div>
          <dt className="figure-label">Published observations</dt>
          <dd className="figure-num text-figure font-bold text-terminal-text">{publishedCount}</dd>
        </div>
        <div>
          <dt className="figure-label">With a movement</dt>
          <dd className="figure-num text-figure font-bold text-terminal-text">{withMovement}</dd>
        </div>
      </dl>
      <p className="mt-3 text-[0.625rem] leading-4 text-terminal-text-muted">
        {publishedCount === 0
          ? 'Nothing has completed publication. Verification and publication are separate acts, and publication has not been performed.'
          : newestObservedAt
            ? `The newest published observation is ${formatMoment(newestObservedAt)} UTC.`
            : 'Observation times are recorded, so freshness can always be stated.'}
      </p>
    </article>
  );
}

/* ------------------------------------------------------------------- data */

/**
 * The comparison commodity: the one with the most markets reporting.
 *
 * Picking by breadth rather than alphabetically means the comparison always
 * uses the commodity the platform can actually support, and the panel says how
 * many markets it covers rather than implying a national figure.
 */
async function loadComparison() {
  const watch = await getMarketWatch({ pageSize: 200 });
  const byCommodity = new Map<number, Set<number>>();
  for (const row of watch.rows) {
    const markets = byCommodity.get(row.commodityId) ?? new Set<number>();
    markets.add(row.marketId);
    byCommodity.set(row.commodityId, markets);
  }
  const best = [...byCommodity.entries()].sort((a, b) => b[1].size - a[1].size)[0];
  if (!best || best[1].size < 2) return null;
  return getMarketComparison({ commodityId: best[0] });
}

/**
 * The movement for one watch row.
 *
 * Matched on the series, never on the commodity alone: two grades of one
 * commodity are two series, and comparing them would be comparing a grade with
 * itself. The grade and the price type are part of the match, so a row is only
 * given a movement it is actually comparable with.
 *
 * Returns `null` when there is no comparable movement, which the table renders
 * as "no comparison" rather than as a flat zero — a zero would read as "the
 * price did not move", which is a different claim from "it cannot be calculated".
 */
function movementFor(
  rows: Awaited<ReturnType<typeof getPriceMovements>>['rows'],
  watchRow: MarketWatchRow,
): number | null {
  const match = rows.find(
    (row) =>
      row.commoditySlug === watchRow.commoditySlug &&
      (row.marketName ?? null) === (watchRow.marketName ?? null) &&
      (row.gradeName ?? null) === (watchRow.gradeName ?? null) &&
      row.priceType === watchRow.priceType,
  );
  return match?.changePercent ?? null;
}

function buildCoverageLine({
  published,
  observedCommodities,
  trackedCommodities,
  reportingMarkets,
  configuredMarkets,
}: {
  published: number;
  observedCommodities: number;
  trackedCommodities: number;
  reportingMarkets: number;
  configuredMarkets: number;
}): string {
  if (published === 0) {
    return `${trackedCommodities} commodities tracked · ${configuredMarkets} markets configured · ${reportingMarkets} reporting · no published price observation yet.`;
  }
  return `${published} published observation${published === 1 ? '' : 's'} · ${observedCommodities} of ${trackedCommodities} commodities observed · ${reportingMarkets} of ${configuredMarkets} markets reporting.`;
}

/* --------------------------------------------------------------- helpers -- */

function formatMoment(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'unrecorded';
  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(date);
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
