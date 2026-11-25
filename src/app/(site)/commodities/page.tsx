<<<<<<< HEAD
import Link from 'next/link';
=======
>>>>>>> b1d2c0d621d9dba5e8a1581c409af2072300d1f2
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getDataSource } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import {
  getCommodityFreshness,
  type CommodityFreshness,
} from '@/lib/trade/queries';
<<<<<<< HEAD
import { listCommodityReadiness } from '@/lib/commodity/queries';
import { describeReadiness } from '@/lib/commodity/readiness';
import {
  PageContainer,
  PageHeader,
  SectionHeader,
} from '@/components/terminal/TerminalShell';
import {
  CommodityCardSkeleton,
  EmptyStatePanel,
  PanelSkeleton,
} from '@/components/feedback/TerminalFeedback';
import {
  DataFreshnessIndicator,
  type FreshnessState,
} from '@/components/market/MarketOverview';
import { IconArrowRight } from '@/components/ui/icons';
import type { Commodity, CommodityCategory } from '@/types/domain';

export const metadata: Metadata = {
  title: 'Commodity Directory',
  description:
    'Every agricultural commodity Hatsi360 Markets tracks, with the markets reporting each one and how current the latest published observation is.',
  alternates: { canonical: '/commodities' },
=======
import { CommodityExplorer, type CommodityExplorerData } from '@/components/data/CommodityExplorer';
import { PageHero } from '@/components/ui/PageHero';
import { getPageImage } from '@/lib/images/registry';
import { BreadcrumbJsonLd } from '@/components/marketing/StructuredData';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Agricultural Commodity Intelligence | Hatsi360 Markets',
  description:
    'Discover agricultural commodities, their market prices, quality information, historical trends and available intelligence across African agricultural markets.',
  alternates: { canonical: '/commodities' },
  openGraph: {
    type: 'website',
    siteName: 'Hatsi360 Markets',
    locale: BRAND.locale,
    title: 'Agricultural Commodity Intelligence | Hatsi360 Markets',
    description:
      'Discover agricultural commodities, their market prices, quality information, historical trends and available intelligence across African agricultural markets.',
    url: '/commodities',
    images: [{ url: '/brand/hatsi360-social-preview.png', width: 1200, height: 630, type: 'image/png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agricultural Commodity Intelligence | Hatsi360 Markets',
    description:
      'Discover agricultural commodities, their market prices, quality information, historical trends and available intelligence across African agricultural markets.',
    images: ['/brand/hatsi360-social-preview.png'],
  },
>>>>>>> b1d2c0d621d9dba5e8a1581c409af2072300d1f2
};

export const dynamic = 'force-dynamic';

<<<<<<< HEAD
/**
 * The commodity directory.
 *
 * A working register, not a gallery. Each commodity is shown with the thing a
 * trader needs before opening it — how many observations exist, when the last
 * one was collected, and how fresh that is — so the directory answers "is there
 * anything here for me?" without a single click.
 *
 * The catalogue is complete on purpose. A commodity with no published
 * observation is still listed, because its absence from the price record is
 * itself information, and it is marked as such rather than hidden.
 *
 * The legacy `?id=` link is preserved: the old site's `commodity-detail.php`
 * resolved to a price view, so it redirects to the price route rather than 404ing.
 */
export default async function CommodityDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; category?: string; page?: string }>;
=======
export default async function CommodityDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
>>>>>>> b1d2c0d621d9dba5e8a1581c409af2072300d1f2
}) {
  const params = await searchParams;
  const configured = isSupabaseConfigured();
  const source = configured ? await getDataSource() : null;

<<<<<<< HEAD
  const [commodities, categories, freshness, readiness]: [
    Commodity[],
    CommodityCategory[],
    CommodityFreshness[],
    Awaited<ReturnType<typeof listCommodityReadiness>>,
=======
  const [commodities, categories, freshness]: [
    any[],
    any[],
    CommodityFreshness[],
>>>>>>> b1d2c0d621d9dba5e8a1581c409af2072300d1f2
  ] = source
    ? await Promise.all([
        source.listCommodities(),
        source.listCategories(),
        getCommodityFreshness(),
<<<<<<< HEAD
        listCommodityReadiness(),
      ])
    : [[], [], [], []];

  // A legacy link such as commodity-detail.php?id=1 lands here with ?id=. The
  // legacy detail page was the price view, so it resolves to /prices/<slug>.
  if (params.id) {
    const legacyId = Number(params.id);
    const match = commodities.find((c) => c.legacyId === legacyId);
    if (match) redirect(`/prices/${match.slug}`);
  }

  const activeCategory = params.category
    ? categories.find((c) => c.slug === params.category)
    : undefined;

  const filtered = activeCategory
    ? commodities.filter((c) => c.categoryId === activeCategory.id)
    : commodities;

  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const pageSize = 24;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const items = filtered.slice((page - 1) * pageSize, page * pageSize);

  const freshnessById = new Map(
    freshness.map((entry) => [entry.commodityId, entry]),
  );
  const withPrices = commodities.filter((c) => (c.observationCount ?? 0) > 0).length;

  // Readiness, keyed by id, so the register can mark a thin commodity as thin
  // rather than letting every entry look equally populated.
  const readinessById = new Map(readiness.map((entry) => [entry.commodity.id, entry]));
  const catalogue = summariseCatalogue(readiness);

  const buildHref = (nextPage: number) => {
    const search = new URLSearchParams();
    if (activeCategory) search.set('category', activeCategory.slug);
    search.set('page', String(nextPage));
    return `/commodities?${search.toString()}`;
  };

  return (
    <PageContainer>
      <PageHeader
        title="Commodity directory"
        description={`The catalogue of ${commodities.length} agricultural commodities Hatsi360 Markets tracks, across ${categories.length} categories. ${withPrices} of them currently carry a published price observation; the rest are listed so the register is complete, and they appear in price results only once a price is published for them.`}
        actions={
          <Link href="/coverage" className="terminal-action">
            Collection coverage
          </Link>
        }
      />

      {/* ------------------------------------------------- category filter -- */}
      <nav aria-label="Filter by category" className="flex flex-wrap gap-1.5">
        <Link
          href="/commodities"
          aria-current={!activeCategory ? 'page' : undefined}
          className="terminal-control"
        >
          All categories
        </Link>
        {categories.map((category) => {
          const selected = activeCategory?.id === category.id;
          const count = commodities.filter((c) => c.categoryId === category.id).length;
          return (
            <Link
              key={category.id}
              href={`/commodities?category=${category.slug}`}
              aria-current={selected ? 'page' : undefined}
              className="terminal-control"
            >
              {category.name}
              <span className="figure-num text-terminal-text-muted">{count}</span>
            </Link>
          );
        })}
      </nav>

      {/* ------------------------------------------- catalogue completeness -- */}
      {readiness.length > 0 ? (
        <section aria-label="Catalogue completeness">
          <SectionHeader
            title="What the catalogue contains"
            action={{ href: '/methodology', label: 'How completeness is assessed' }}
          />
          <div className="terminal-panel p-4">
            <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <dt className="figure-label">Commodities listed</dt>
                <dd className="figure-num mt-0.5 text-terminal-text">{catalogue.total}</dd>
                <dd className="mt-1 text-[0.6875rem] leading-relaxed text-terminal-text-muted">
                  Active records in the catalogue.
                </dd>
              </div>
              <div>
                <dt className="figure-label">With a published price</dt>
                <dd className="figure-num mt-0.5 text-terminal-text">
                  {catalogue.withPublishedPrice}
                </dd>
                <dd className="mt-1 text-[0.6875rem] leading-relaxed text-terminal-text-muted">
                  {catalogue.withPublishedPrice === 0
                    ? 'None. A public read cannot see unpublished observations, so this counts what is available to you.'
                    : 'The rest are tracked but carry no published price.'}
                </dd>
              </div>
              <div>
                <dt className="figure-label">With a default grade</dt>
                <dd className="figure-num mt-0.5 text-terminal-text">
                  {catalogue.withDefaultGrade}
                </dd>
                <dd className="mt-1 text-[0.6875rem] leading-relaxed text-terminal-text-muted">
                  {catalogue.withDefaultGrade === 0
                    ? 'None are set, so a price without an explicit grade cannot be tied to a known quality level.'
                    : 'Prices can be tied to a named quality level.'}
                </dd>
              </div>
              <div>
                <dt className="figure-label">With alternative names</dt>
                <dd className="figure-num mt-0.5 text-terminal-text">
                  {catalogue.withSynonyms}
                </dd>
                <dd className="mt-1 text-[0.6875rem] leading-relaxed text-terminal-text-muted">
                  {catalogue.withSynonyms === 0
                    ? 'None, so a search using a local trade name may not find them.'
                    : 'Searchable by the trade names recorded for them.'}
                </dd>
              </div>
            </dl>
            <p className="mt-3 border-t border-terminal-border pt-3 text-[0.6875rem] leading-relaxed text-terminal-text-muted">
              These counts describe what has been recorded, not how the market is
              performing. Where a figure could be filled in by assumption it is left out
              instead &mdash;{' '}
              {catalogue.totalGaps === 1 ? 'one gap is' : `${catalogue.totalGaps} gaps are`}{' '}
              recorded across the catalogue, and each one is named on the commodity&rsquo;s
              own profile.
            </p>
          </div>
        </section>
      ) : null}

      {!configured ? (
        <EmptyStatePanel
          kind="no-market-data"
          action={{ label: 'See collection coverage', href: '/coverage' }}
        />
      ) : items.length === 0 ? (
        <EmptyStatePanel
          kind="no-commodity-results"
          action={
            activeCategory
              ? { label: 'Show all categories', href: '/commodities' }
              : undefined
          }
        />
      ) : (
        <>
          <section aria-label="The commodity register">
            <SectionHeader
              title={activeCategory ? activeCategory.name : 'All commodities'}
              count={filtered.length}
              href="/commodities"
            />
            <ol className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((commodity) => {
                const entry = freshnessById.get(commodity.id);
                const observed = (commodity.observationCount ?? 0) > 0;
                // The platform's own freshness classification, read rather than
                // re-derived, so this page and the price cards agree.
                const state: FreshnessState = entry
                  ? entry.state === 'recently_updated' || entry.state === 'latest_verified'
                    ? 'fresh'
                    : entry.state === 'stale'
                      ? 'stale'
                      : entry.state === 'delayed' || entry.state === 'indicative'
                        ? 'delayed'
                        : entry.state === 'future_timestamp'
                          ? 'timestamp_review'
                          : 'today'
                  : 'unavailable';
                return (
                  <li key={commodity.id}>
                    <Link
                      href={`/commodities/${commodity.slug}`}
                      className="terminal-panel group flex h-full flex-col gap-2 p-3 transition-colors duration-150 ease-out hover:border-harvest-500/40 hover:bg-terminal-elevated"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="text-[0.9375rem] font-semibold leading-tight text-terminal-text group-hover:text-harvest-300">
                          {commodity.name}
                        </h3>
                        <IconArrowRight
                          className="size-3.5 shrink-0 text-terminal-text-muted"
                          aria-hidden="true"
                        />
                      </div>

                      <p className="text-[0.6875rem] leading-relaxed text-terminal-text-secondary">
                        {commodity.categoryName ?? 'Uncategorised'}
                        {commodity.marketCount
                          ? ` · ${commodity.marketCount} reporting market${commodity.marketCount === 1 ? '' : 's'}`
                          : ''}
                      </p>

                      {/* A minimal record is marked as such rather than left to
                          look as populated as its neighbours. */}
                      {readinessById.get(commodity.id)?.readiness.completeness === 'minimal' ? (
                        <p className="text-[0.6875rem] leading-relaxed text-terminal-text-muted">
                          Minimal record &mdash;{' '}
                          {describeReadiness(readinessById.get(commodity.id)!.readiness)}
                        </p>
                      ) : null}

                      <div className="mt-auto flex items-center justify-between gap-2 border-t border-terminal-border pt-2">
                        <span className="figure-num text-terminal-text-secondary">
                          {observed ? (
                            <>
                              <span className="text-terminal-text">
                                {commodity.observationCount}
                              </span>{' '}
                              observation{commodity.observationCount === 1 ? '' : 's'}
                            </>
                          ) : (
                            <span className="text-terminal-text-muted">
                              No published price
                            </span>
                          )}
                        </span>
                        <DataFreshnessIndicator
                          state={state}
                          observedAt={
                            commodity.latestObservationAt ?? entry?.collectedAt ?? null
                          }
                        />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>

          {totalPages > 1 ? (
            <nav aria-label="Directory pages" className="flex items-center gap-1.5">
              {page > 1 ? (
                <Link href={buildHref(page - 1)} rel="prev" className="terminal-control">
                  Previous
                </Link>
              ) : null}
              <span className="figure-num px-2 text-terminal-text-secondary">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Link href={buildHref(page + 1)} rel="next" className="terminal-control">
                  Next
                </Link>
              ) : null}
            </nav>
          ) : null}
        </>
      )}

      {!configured ? null : (
        <section aria-label="How to read this register">
          <SectionHeader title="How to read this register" />
          <div className="terminal-panel p-4">
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="figure-label">A commodity with no price</dt>
                <dd className="mt-1 text-[0.75rem] leading-relaxed text-terminal-text-secondary">
                  It is tracked but has no published observation. That is a statement
                  about coverage, not about the market, and no figure is estimated to
                  fill the gap.
                </dd>
              </div>
              <div>
                <dt className="figure-label">The observation count</dt>
                <dd className="mt-1 text-[0.75rem] leading-relaxed text-terminal-text-secondary">
                  How many published observations exist for the commodity across all
                  series and markets. It is not a volume and it is not a trade count.
                </dd>
              </div>
              <div>
                <dt className="figure-label">The freshness state</dt>
                <dd className="mt-1 text-[0.75rem] leading-relaxed text-terminal-text-secondary">
                  Calculated from when the latest observation was collected and how
                  often that commodity is collected. It never reflects how recently
                  this page loaded.
                </dd>
              </div>
            </dl>
          </div>
        </section>
      )}
    </PageContainer>
  );
}

/**
 * Catalogue-level readiness, in aggregate.
 *
 * Every figure here is a count of recorded facts. None of them describes how the
 * market is performing, and none is an estimate &mdash; a commodity with no
 * published price is counted as having no published price, not as having one
 * inferred from its neighbours.
 */
function summariseCatalogue(
  readiness: Awaited<ReturnType<typeof listCommodityReadiness>>,
): {
  total: number;
  withPublishedPrice: number;
  withDefaultGrade: number;
  withSynonyms: number;
  totalGaps: number;
} {
  return {
    total: readiness.length,
    withPublishedPrice: readiness.filter(
      (entry) => entry.readiness.publishedObservationCount > 0,
    ).length,
    withDefaultGrade: readiness.filter((entry) => entry.readiness.hasDefaultGrade).length,
    withSynonyms: readiness.filter((entry) => entry.readiness.synonymCount > 0).length,
    totalGaps: readiness.reduce((sum, entry) => sum + entry.readiness.gaps.length, 0),
  };
}

/** The directory while its data loads. Mirrors the register it replaces. */
function DirectoryLoading() {
  return (
    <PageContainer>
      <PageHeader
        title="Commodity directory"
        description="Loading the catalogue and the freshness of each commodity."
      />
      <PanelSkeleton lines={1} />
      <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 12 }).map((_, index) => (
          <li key={index}>
            <CommodityCardSkeleton />
          </li>
        ))}
      </ol>
    </PageContainer>
=======
      ])
    : [[], [], []];

  // Legacy id redirect
  if (params.id) {
    const legacyId = Number(params.id);
    const match = commodities.find((c: any) => c.legacyId === legacyId);
    if (match) redirect(`/prices/${match.slug}`);
  }

  const data: CommodityExplorerData = {
    commodities,
    categories,
    freshness,
  };

  return (
    <>
      <BreadcrumbJsonLd items={[{ name: 'Commodity directory' }]} />
      <PageHero
        eyebrow="Commodity Directory"
        title={`Every commodity we track — ${commodities.length} in the catalogue`}
        lede="Search, filter and explore the complete catalogue of agricultural commodities. Each entry shows how many markets report it and how current the data is."
        breadcrumbs={[{ label: 'Commodities' }]}
        image={getPageImage('commodity-directory.hero')}
      />

      <div className="section">
        <div className="container-page">
          {!configured ? (
            <div className="card p-12 text-center">
              <h3 className="text-lg font-semibold text-ink-900">Database not configured</h3>
              <p className="mt-2 text-sm text-ink-500">
                Connect Supabase to see the commodity catalogue.
              </p>
            </div>
          ) : (
            <CommodityExplorer data={data} />
          )}
        </div>
      </div>
    </>
>>>>>>> b1d2c0d621d9dba5e8a1581c409af2072300d1f2
  );
}
