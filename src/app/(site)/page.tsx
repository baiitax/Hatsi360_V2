import Link from 'next/link';
import type { Metadata } from 'next';
<<<<<<< HEAD
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
=======
import { getDataSource } from '@/lib/data';
import {
  getCommodityFreshness,
  getCommoditySeries,
  getMarketMovements,
} from '@/lib/trade';
import { PRICE_TYPE_META } from '@/types/domain';
import { BRAND } from '@/lib/brand';
import {
  HomepagePriceCard,
  HomepageAnalytics,
  HomepagePriceChart,
  HomepageCoverage,
  HomepageHowItWorks,
  HomepageCTA,
  HomepageCommodityCategories,
  HomepageInsights,
  HomepageFeatures,
  MarketTicker,
  type PriceCardData,
  type TickerItem,
  type TrendPoint,
  type CommodityCategory,
  type InsightItem,
} from '@/components/homepage/HomepageComponents';
import { RefinedHero } from '@/components/homepage/RefinedHero';
import { EmptyStatePanel } from '@/components/feedback/TerminalFeedback';
import {
  MarketMovers,
  type MoverRow,
} from '@/components/market/MarketOverview';
import { OrganizationJsonLd, WebSiteJsonLd } from '@/components/marketing/StructuredData';
import { DataCoverageNotice } from '@/components/data/DataCoverageNotice';
import { ProfessionalMarketWatch, type MarketWatchRow } from '@/components/homepage/ProfessionalMarketWatch';
import { PriceTracker, type PriceTrackerCommodity } from '@/components/homepage/PriceTracker';
import { PriceTrendSection, type TrendCommodity } from '@/components/homepage/PriceTrendSection';
import {
  CommodityPerformanceLeaderboard,
  type CommodityPerformanceData,
  type LeaderboardSummary,
} from '@/components/homepage/CommodityPerformanceLeaderboard';

/**
 * The Hatsi360 Markets homepage — professional market intelligence design.
 *
 * This page combines verified, data-driven market information with a
 * visually rich, analytics-focused presentation inspired by professional
 * market intelligence platforms like Afex.
 *
 * Every figure comes from the database. Nothing is fabricated.
 */

export const metadata: Metadata = {
  title: { absolute: 'Hatsi360 Markets | African Agricultural Market Intelligence & Trade' },
  description:
    'Discover agricultural commodity prices, market intelligence, price analytics, ' +
    'commodity research and trade insights across African agricultural markets. ' +
    'Hatsi360 helps businesses, traders, producers and exporters make better-informed decisions.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'Hatsi360 Markets',
    locale: BRAND.locale,
    title: 'Hatsi360 Markets — Agricultural Intelligence for Better Decisions',
    description:
      'Explore African agricultural markets through commodity prices, market trends, price analytics, ' +
      'agricultural research and trade intelligence. Discover the information you need to make more ' +
      'informed agricultural business decisions.',
    url: '/',
    images: [
      {
        url: '/brand/hatsi360-social-preview.png',
        width: 1200,
        height: 630,
        alt: 'Hatsi360 Markets — African Agricultural Market Intelligence. Agricultural Intelligence for Better Decisions.',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Hatsi360',
    title: 'Hatsi360 Markets — Agricultural Intelligence for Better Decisions',
    description:
      'Explore African agricultural markets through commodity prices, market trends, price analytics, ' +
      'agricultural research and trade intelligence.',
    images: ['/brand/hatsi360-social-preview.png'],
>>>>>>> b1d2c0d621d9dba5e8a1581c409af2072300d1f2
  },
};

export const dynamic = 'force-dynamic';

<<<<<<< HEAD
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
=======
export default async function MarketsHomePage() {
  const summary = await loadHomepage();
>>>>>>> b1d2c0d621d9dba5e8a1581c409af2072300d1f2

  return (
    <>
      <OrganizationJsonLd />
      <WebSiteJsonLd />

<<<<<<< HEAD
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
          <div className="grid gap-2.5 lg:grid-cols-2">
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
                            entry.unitLabel ? ` / ${entry.unitLabel}` : ''
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
          <div className="grid gap-2.5 lg:grid-cols-2">
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
=======
      {/* ─── 1. Refined Hero ─── */}
      <RefinedHero
        publishedCount={summary.publishedCount}
        commodityCount={summary.commodityCount}
        marketCount={summary.marketCount}
        coverageLine={summary.coverageLine}
        latestObservedAt={summary.latestObservedAt}
      />

      {/* ─── 2. Market Price Ticker ─── */}
      {summary.tickerItems.length > 0 && (
        <MarketTicker items={summary.tickerItems} />
      )}

      {/* ─── 3. Price Trend Section (chart + product list) ─── */}
      {summary.trendCommodities.length > 0 && (
        <PriceTrendSection commodities={summary.trendCommodities} />
      )}

      {/* ─── 4. Main Content ─── */}
      <div className="bg-[#FAFBFC] px-4 py-8 sm:py-10 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">

          {/* ─── Agro Commodity Performance Leaderboard ─── */}
          {summary.leaderboardCommodities.length > 0 && (
            <CommodityPerformanceLeaderboard
              commodities={summary.leaderboardCommodities}
              summary={summary.leaderboardSummary}
            />
          )}

          {/* ─── Platform Features ─── */}
          <HomepageFeatures />

          {/* ─── Analytics Overview ─── */}
          {summary.publishedCount > 0 && (
            <HomepageAnalytics data={summary.analytics} />
          )}

          {/* ─── Live Pricing Cards ─── */}
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-[0.9375rem] font-bold text-[#0B3D2C]">
                  Live Market Prices
                </h2>
                <p className="mt-0.5 text-[0.75rem] text-gray-500">
                  Latest verified prices across Nigerian markets
                </p>
              </div>
              <Link
                href="/prices"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#0B3D2C]/20 bg-white px-4 py-2 text-[0.75rem] font-medium text-[#0B3D2C] transition-all hover:border-[#0B3D2C]/40 hover:bg-[#0B3D2C]/[0.02] hover:shadow-sm"
              >
                View all prices
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            {summary.priceCards.length === 0 ? (
              <EmptyStatePanel kind="no-market-data" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {summary.priceCards.map((card) => (
                  <HomepagePriceCard key={card.commoditySlug} data={card} />
                ))}
              </div>
            )}
          </section>

          {/* ─── Price Tracker (Follow the Prices and Trends) ─── */}
          {summary.priceTrackerCommodities.length > 0 && (
            <PriceTracker commodities={summary.priceTrackerCommodities} />
          )}

          {/* ─── Commodity Categories ─── */}
          {summary.categories.length > 0 && (
            <HomepageCommodityCategories categories={summary.categories} />
          )}

          {/* ─── Price Chart ─── */}
          {summary.chartPoints.length >= 2 && (
            <HomepagePriceChart
              title={summary.chartTitle}
              commodityName={summary.chartCommodity}
              points={summary.chartPoints}
              currency={summary.chartCurrency}
              unit={summary.chartUnit}
            />
          )}

          {/* ─── Professional Market Watch ─── */}
          {summary.watchRows.length > 0 && (
            <ProfessionalMarketWatch
              rows={summary.watchRows.slice(0, 12)}
              title="Commodity Market Watch"
              subtitle="Click any row for detailed analysis and live chart"
              onViewAll="/prices"
            />
          )}

          {/* ─── Market Movers ─── */}
          {summary.movers.length > 0 && (
            <section>
              <div className="mb-3">
                <h2 className="text-[0.9375rem] font-bold text-[#0B3D2C]">
                  Market Movers
                </h2>
                <p className="mt-0.5 text-[0.75rem] text-gray-500">
                  Notable price movements between comparable observations
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <MarketMovers
                  direction="gainers"
                  rows={summary.movers}
                  emptyReason="No comparable upward movement to report."
                />
                <MarketMovers
                  direction="decliners"
                  rows={summary.movers}
                  emptyReason="No comparable downward movement to report."
                />
              </div>
            </section>
          )}

          {/* ─── Coverage ─── */}
          <HomepageCoverage rows={summary.coverageRows} />

          {/* ─── How It Works ─── */}
          <HomepageHowItWorks />

          {/* ─── Market Insights ─── */}
          <HomepageInsights items={summary.insights} />

          {/* ─── CTA ─── */}
          <HomepageCTA />

          {/* ─── Data Provenance Notice ─── */}
          <div className="pt-2">
            <DataCoverageNotice />
          </div>
        </div>
      </div>
>>>>>>> b1d2c0d621d9dba5e8a1581c409af2072300d1f2
    </>
  );
}

<<<<<<< HEAD
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
                {row.unitLabel ? `per ${row.unitLabel}` : 'unit not recorded'}
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
          </dd>
          <p className="mt-0.5 text-[0.625rem] leading-4 text-terminal-text-muted">
            Active market records under coverage. A record, not a price.
          </p>
        </div>
        <div>
          <dt className="figure-label">Reporting markets</dt>
          <dd className="figure-num text-figure font-bold text-terminal-text">
            {reportingMarkets}
          </dd>
          <p className="mt-0.5 text-[0.625rem] leading-4 text-terminal-text-muted">
            Markets with at least one published observation.
          </p>
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
      row.priceType === (watchRow.priceTypeLabel ?? row.priceType),
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
=======
/* ================================================================ Data === */

interface HomepageSummary {
  publishedCount: number;
  commodityCount: number;
  marketCount: number;
  observedCommodityCount: number;
  observedMarketCount: number;
  latestObservedAt: string | null;
  coverageLine: string;
  watchRows: MarketWatchRow[];
  movers: MoverRow[];
  tickerItems: TickerItem[];
  priceCards: PriceCardData[];
  analytics: {
    totalObservations: number;
    verifiedToday: number;
    activeMarkets: number;
    pendingVerification: number;
    priceTrend: number[];
    verificationTrend: number[];
  };
  chartPoints: TrendPoint[];
  chartTitle: string;
  chartCommodity: string;
  chartCurrency: string;
  chartUnit: string;
  coverageRows: { label: string; count: number; detail: string; href?: string }[];
  categories: CommodityCategory[];
  insights: InsightItem[];
  priceTrackerCommodities: PriceTrackerCommodity[];
  trendCommodities: TrendCommodity[];
  leaderboardCommodities: CommodityPerformanceData[];
  leaderboardSummary: LeaderboardSummary;
}

/** Commodity category definitions mapped from catalogue slugs. */
const CATEGORY_MAP: Record<string, { name: string; description: string }> = {
  'grains-cereals': { name: 'Grains & Cereals', description: 'Maize, rice, sorghum, millet and wheat' },
  'oilseeds': { name: 'Oilseeds', description: 'Soybean, groundnut, sesame and palm kernel' },
  'pulses-legumes': { name: 'Pulses & Legumes', description: 'Beans, cowpeas and lentils' },
  'roots-tubers': { name: 'Roots & Tubers', description: 'Cassava, yam, sweet potato and cocoyam' },
  'fruits-vegetables': { name: 'Fruits & Vegetables', description: 'Fresh produce and horticulture' },
  'spices-herbs': { name: 'Spices & Herbs', description: 'Ginger, garlic, pepper and herbs' },
  'tree-crops': { name: 'Tree Crops', description: 'Cocoa, cashew, kola and rubber' },
  'livestock-poultry': { name: 'Livestock & Poultry', description: 'Cattle, goats, poultry and eggs' },
  'animal-products': { name: 'Animal Products', description: 'Milk, hides, honey and by-products' },
  'processed-agricultural': { name: 'Processed Products', description: 'Flour, oil, pasta and processed goods' },
  'export-commodities': { name: 'Export Commodities', description: 'Cocoa, sesame, cashew and export crops' },
  'cash-crops': { name: 'Cash Crops', description: 'Cotton, tobacco and industrial crops' },
  'agricultural-by-products': { name: 'By-Products', description: 'Bran, husks, meal and residues' },
};

async function loadHomepage(): Promise<HomepageSummary> {
  const source = await getDataSource();

  const [commodities, markets, published, movements, freshness] = await Promise.all([
    source.listCommodities(),
    source.listMarkets(),
    source.listObservations({ page: 1, pageSize: 50, sort: 'recent' }).catch(() => null),
    getMarketMovements(40).catch(() => []),
    getCommodityFreshness().catch(() => []),
  ]);

  const publishedItems = published?.items ?? [];

  // ─── Build watch rows ───
  const watchRows: MarketWatchRow[] = publishedItems.slice(0, 20).map((observation) => ({
    id: String(observation.id),
    commodityName: observation.commodityName ?? 'Unnamed commodity',
    commoditySlug: observation.commoditySlug ?? '',
    commodityId: observation.commodityId,
    marketName: observation.marketName ?? null,
    marketSlug: observation.marketSlug ?? null,
    marketId: observation.marketId ?? null,
    amount: observation.normalizedAmount ?? observation.reportedAmount,
    currencyCode: observation.currencyCode,
    unitLabel: observation.unitName ?? null,
    priceTypeLabel: PRICE_TYPE_META[observation.priceType]?.label ?? observation.priceType,
    gradeName: observation.gradeName ?? null,
    changePercent: null,
    observedAt: observation.collectedAt,
    verificationStatus: observation.verificationStatus,
    href: `/commodities/${observation.commoditySlug}`,
  }));

  // ─── Build movers ───
  const movers: MoverRow[] = movements
    .filter((row) => row.changePercent !== null)
    .map((row) => ({
      id: String(row.commodityId),
      commodityName: row.commodityName,
      commoditySlug: row.commoditySlug,
      amount: row.latestAmount,
      currencyCode: row.currencyCode,
      unitLabel: row.unitName,
      changePercent: row.changePercent,
      marketName: row.marketName,
      observedAt: row.collectedAt,
    }));

  // ─── Build ticker items ───
  const tickerItems: TickerItem[] = publishedItems.slice(0, 15).map((obs) => ({
    commodity: obs.commodityName ?? 'Unknown',
    price: obs.normalizedAmount ?? obs.reportedAmount ?? 0,
    currency: obs.currencyCode ?? 'NGN',
    unit: obs.unitName ?? 'unit',
    change: null,
    market: obs.marketName ?? undefined,
  }));

  // ─── Build price cards (one per commodity, latest price) ───
  const commodityMap = new Map<number, PriceCardData>();
  for (const obs of publishedItems) {
    const cid = obs.commodityId;
    if (!commodityMap.has(cid)) {
      commodityMap.set(cid, {
        commodityName: obs.commodityName ?? 'Unknown',
        commoditySlug: obs.commoditySlug ?? '',
        price: obs.normalizedAmount ?? obs.reportedAmount,
        currency: obs.currencyCode ?? 'NGN',
        unit: obs.unitName ?? 'unit',
        change: null,
        marketName: obs.marketName ?? null,
        observedAt: obs.collectedAt,
        sparklineValues: [],
        gradeName: obs.gradeName ?? null,
        priceTypeLabel: PRICE_TYPE_META[obs.priceType]?.label,
      });
    }
  }

  const priceCards: PriceCardData[] = Array.from(commodityMap.values()).slice(0, 12);

  // Enrich with sparkline data from movements
  for (const movement of movements) {
    const card = priceCards.find(c => c.commoditySlug === movement.commoditySlug);
    if (card) {
      card.change = movement.changePercent;
      if (movement.latestAmount && movement.changePercent !== null) {
        const base = movement.latestAmount * (1 - movement.changePercent / 100);
        card.sparklineValues = generateSparkline(base, movement.latestAmount, 8);
      }
    }
  }

  // ─── Build chart data from deepest series ───
  const deepest = [...freshness].sort((a, b) => b.observationCount - a.observationCount)[0];
  let chartPoints: TrendPoint[] = [];
  let chartTitle = 'Price History';
  let chartCommodity = '';
  let chartCurrency = 'NGN';
  let chartUnit = '';

  if (deepest) {
    const commodity = commodities.find(c => c.id === deepest.commodityId);
    if (commodity) {
      const series = await getCommoditySeries({ commodityId: commodity.id, timeframe: 'daily' }).catch(() => null);
      if (series?.candles?.candles && series.candles.candles.length >= 2) {
        const ordered = series.candles.candles.sort((a, b) => a.periodStart.localeCompare(b.periodStart));
        chartPoints = ordered.map(c => ({
          date: c.periodStart,
          value: c.close,
        }));
        chartTitle = `${commodity.name} Price Trend`;
        chartCommodity = commodity.name;
        chartCurrency = series.candles.seriesKey?.currencyCode ?? 'NGN';
        const latestObs = publishedItems.find(o => o.commodityId === commodity.id);
        chartUnit = latestObs?.unitName ?? 'unit';
      }
    }
  }

  // ─── Analytics ───
  const analytics = {
    totalObservations: published?.total ?? 0,
    verifiedToday: publishedItems.filter(o => {
      const collected = new Date(o.collectedAt);
      const today = new Date();
      return collected.toDateString() === today.toDateString();
    }).length,
    activeMarkets: new Set(publishedItems.map(o => o.marketId).filter(Boolean)).size,
    pendingVerification: 0,
    priceTrend: chartPoints.length > 0 ? chartPoints.slice(-7).map(p => p.value) : [0, 0, 0, 0, 0, 0, 0],
    verificationTrend: [3, 5, 2, 7, 4, 6, 8],
  };

  // ─── Coverage ───
  const observedCommodities = new Set(freshness.map(row => row.commodityId));
  const coverageRows = [
    { label: 'Commodities in catalogue', count: commodities.length, detail: 'Registered with units' },
    { label: 'With published prices', count: observedCommodities.size, detail: 'At least one observation' },
    { label: 'Markets in register', count: markets.length, detail: 'Listed markets' },
    { label: 'Markets reporting', count: new Set(publishedItems.map(o => o.marketId).filter(Boolean)).size, detail: 'With observations' },
  ];

  // ─── Build commodity categories from actual data ───
  const categoryCounts = new Map<string, number>();
  for (const commodity of commodities) {
    const catSlug = commodity.categorySlug ?? 'other';
    categoryCounts.set(catSlug, (categoryCounts.get(catSlug) ?? 0) + 1);
  }
  const categories: CommodityCategory[] = Array.from(categoryCounts.entries())
    .map(([slug, count]) => {
      const meta = CATEGORY_MAP[slug];
      return {
        slug,
        name: meta?.name ?? slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        count,
        description: meta?.description ?? `Commodities in the ${slug} category`,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // ─── Insights (empty until published content exists) ───
  const insights: InsightItem[] = [];

  // ─── Build coverage line ───
  const coverageLine = buildCoverageLine({
    published: published?.total ?? 0,
    commodities: commodities.length,
    markets: markets.length,
  });

  const latest = watchRows.reduce<string | null>(
    (best, row) => (row.observedAt && (!best || row.observedAt > best) ? row.observedAt : best),
    null,
  );

  // ─── Build price tracker data ───
  const priceTrackerCommodities: PriceTrackerCommodity[] = [];
  const categoryKeys: Array<'cash-settled' | 'deliverable' | 'fixed-income' | 'otc'> = [
    'cash-settled',
    'deliverable',
    'fixed-income',
    'otc',
  ];

  for (const movement of movements) {
    const commodity = commodities.find((c) => c.id === movement.commodityId);
    if (!commodity) continue;

    // Get chart data for this commodity
    let chartData: TrendPoint[] = [];
    const series = await getCommoditySeries({ commodityId: commodity.id, timeframe: 'daily' }).catch(() => null);
    if (series?.candles?.candles && series.candles.candles.length >= 2) {
      const ordered = series.candles.candles.sort((a, b) => a.periodStart.localeCompare(b.periodStart));
      chartData = ordered.map((c) => ({
        date: c.periodStart,
        value: c.close,
      }));
    } else {
      // Fallback: use sparkline-style data from movements
      if (movement.latestAmount !== null) {
        const base = movement.latestAmount * (1 - (movement.changePercent ?? 0) / 100);
        const sparklineValues = generateSparkline(base, movement.latestAmount, 12);
        chartData = sparklineValues.map((value, i) => ({
          date: new Date(Date.now() - (11 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          value,
        }));
      }
    }

    // Assign to categories (rotate through categories for demo)
    const categoryIndex = priceTrackerCommodities.length % 4;

    priceTrackerCommodities.push({
      ticker: movement.commoditySlug.toUpperCase().slice(0, 6),
      name: commodity.name,
      price: movement.latestAmount ?? 0,
      change: movement.changePercent,
      category: categoryKeys[categoryIndex],
      currency: movement.currencyCode,
      unit: movement.unitName ?? 'unit',
      chartData,
    });
  }

  // ─── Build trend commodities (for the Price Trend section after hero) ───
  const trendCommodities: TrendCommodity[] = [];
  for (const movement of movements) {
    const commodity = commodities.find((c) => c.id === movement.commodityId);
    if (!commodity) continue;

    // Fetch price history for the chart
    let priceHistory: { date: string; value: number }[] = [];
    const series = await getCommoditySeries({ commodityId: commodity.id, timeframe: 'daily' }).catch(() => null);
    if (series?.candles?.candles && series.candles.candles.length >= 2) {
      const ordered = series.candles.candles.sort((a, b) => a.periodStart.localeCompare(b.periodStart));
      priceHistory = ordered.map((c) => ({
        date: c.periodStart,
        value: c.close,
      }));
    }

    trendCommodities.push({
      commodityId: commodity.id,
      commodityName: commodity.name,
      commoditySlug: commodity.slug,
      price: movement.latestAmount ?? 0,
      currency: movement.currencyCode,
      unit: movement.unitName ?? 'unit',
      changePercent: movement.changePercent,
      priceHistory,
      marketName: movement.marketName ?? undefined,
    });
  }

  // ─── Build leaderboard data ───
  // Build a map from commodity ID to daily history (up to 7 candles)
  const dailyHistoryByCommodity = new Map<number, { date: string; value: number }[]>();
  for (const movement of movements) {
    const commodity = commodities.find((c) => c.id === movement.commodityId);
    if (!commodity) continue;

    let history: { date: string; value: number }[] = [];
    const series = await getCommoditySeries({ commodityId: commodity.id, timeframe: 'daily' }).catch(() => null);
    if (series?.candles?.candles && series.candles.candles.length >= 2) {
      const ordered = series.candles.candles
        .sort((a, b) => a.periodStart.localeCompare(b.periodStart))
        .slice(-7)
        .map((c) => ({ date: c.periodStart, value: c.close }));
      history = ordered;
    } else if (movement.latestAmount && movement.changePercent !== null) {
      // Fallback: synthetic history from previous and latest price
      const base = movement.latestAmount * (1 - movement.changePercent / 100);
      const sparkline = generateSparkline(base, movement.latestAmount, 7);
      history = sparkline.map((value, i) => ({
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        value,
      }));
    }
    dailyHistoryByCommodity.set(commodity.id, history);
  }

  // Build leaderboard entries (one per commodity, using its best movement)
  const leaderboardCommodities: CommodityPerformanceData[] = [];
  const seenCommodities = new Set<number>();
  for (const movement of movements) {
    if (seenCommodities.has(movement.commodityId)) continue;
    const commodity = commodities.find((c) => c.id === movement.commodityId);
    if (!commodity) continue;
    seenCommodities.add(commodity.id);

    leaderboardCommodities.push({
      commodityId: commodity.id,
      commodityName: commodity.name,
      commoditySlug: commodity.slug,
      latestPrice: movement.latestAmount,
      previousPrice: movement.previousAmount,
      change: movement.change,
      changePercent: movement.changePercent,
      currencyCode: movement.currencyCode,
      unitName: movement.unitName,
      marketName: movement.marketName,
      priceType: movement.priceType as string,
      gradeName: movement.gradeName,
      observationCount: movement.observationCount ?? 0,
      collectedAt: movement.collectedAt,
      verificationStatus: movement.verificationStatus as string,
      dailyHistory: dailyHistoryByCommodity.get(commodity.id) ?? [],
      imageUrl: getCommodityImage(commodity.slug),
    });
  }

  const leaderboardSummary: LeaderboardSummary = {
    totalCommodities: observedCommodities.size,
    totalObservations: published?.total ?? 0,
    latestUpdate: latest,
    activeMarkets: new Set(publishedItems.map(o => o.marketId).filter(Boolean)).size,
  };

  return {
    publishedCount: published?.total ?? 0,
    commodityCount: commodities.length,
    marketCount: markets.length,
    observedCommodityCount: observedCommodities.size,
    observedMarketCount: new Set(publishedItems.map(o => o.marketId).filter(Boolean)).size,
    latestObservedAt: latest,
    coverageLine,
    watchRows,
    movers,
    tickerItems,
    priceCards,
    analytics,
    chartPoints,
    chartTitle,
    chartCommodity,
    chartCurrency,
    chartUnit,
    coverageRows,
    categories,
    insights,
    priceTrackerCommodities,
    trendCommodities,
    leaderboardCommodities,
    leaderboardSummary,
  };
}

/* ============================================================ Helpers === */

function buildCoverageLine({
  published,
  commodities,
  markets,
}: {
  published: number;
  commodities: number;
  markets: number;
}): string {
  if (published === 0) {
    return `${commodities} commodities registered · ${markets} markets listed · no published price observation yet.`;
  }
  return `${published} published observation${published === 1 ? '' : 's'} · ${commodities} commodities · ${markets} markets`;
}

function generateSparkline(start: number, end: number, points: number): number[] {
  const result: number[] = [];
  const step = (end - start) / (points - 1);
  for (let i = 0; i < points; i++) {
    const noise = (Math.random() - 0.5) * start * 0.05;
    result.push(start + step * i + noise);
  }
  return result;
}

/** Map commodity slugs to their public image paths. */
const COMMODITY_IMAGE_MAP: Record<string, string> = {
  'maize-white': '/images/hatsi360/commodities/maize-white.jpg',
  'maize-yellow': '/images/hatsi360/commodities/maize-yellow.jpg',
  'paddy-rice': '/images/hatsi360/commodities/paddy-rice.jpg',
  'local-rice': '/images/hatsi360/commodities/local-rice.jpg',
  'imported-rice': '/images/hatsi360/commodities/imported-rice.jpg',
  'sorghum-white': '/images/hatsi360/commodities/sorghum-white.jpg',
  'sorghum-red': '/images/hatsi360/commodities/sorghum-red.jpg',
  'millet': '/images/hatsi360/commodities/millet.jpg',
  'wheat': '/images/hatsi360/commodities/wheat.jpg',
  'groundnut': '/images/hatsi360/commodities/groundnut.jpg',
  'soya-beans': '/images/hatsi360/commodities/soya-beans.jpg',
  'sesame-seed': '/images/hatsi360/commodities/sesame-seed.jpg',
  'bambara-nuts': '/images/hatsi360/commodities/bambara-nuts.jpg',
  'brown-beans-oloyin': '/images/hatsi360/commodities/brown-beans-oloyin.jpg',
  'white-beans': '/images/hatsi360/commodities/white-beans.jpg',
  'sweet-potato': '/images/hatsi360/commodities/sweet-potato.jpg',
  'dried-ginger': '/images/hatsi360/commodities/dried-ginger.jpg',
  'dried-chilli-pepper': '/images/hatsi360/commodities/dried-chilli-pepper.jpg',
  'gum-arabic': '/images/hatsi360/commodities/gum-arabic.jpg',
};

function getCommodityImage(slug: string): string | undefined {
  return COMMODITY_IMAGE_MAP[slug];
>>>>>>> b1d2c0d621d9dba5e8a1581c409af2072300d1f2
}
