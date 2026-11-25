import Link from 'next/link';
import { Suspense, cache } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getDataSource } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import {
  getCommodityMovementFromObservations,
  getCommoditySeriesOptions,
} from '@/lib/trade/queries';
import { getCommodityProfileBySlug } from '@/lib/commodity/queries';
import { describeReadiness } from '@/lib/commodity/readiness';
import { PRICE_RANGES } from '@/components/data/CommodityPriceView';
import { PageContainer, PageHeader, SectionHeader } from '@/components/terminal/TerminalShell';
import { MarketOverviewCard } from '@/components/market/MarketOverview';
import { PriceMovementIndicator } from '@/components/market/PriceDisplay';
import { VerificationBadge } from '@/components/ui/data-display';
import { EmptyStatePanel, PanelSkeleton } from '@/components/feedback/TerminalFeedback';
import { IconArrowRight, IconCharts, IconTable } from '@/components/ui/icons';
import { formatMoney } from '@/lib/money';
import type { PriceObservation } from '@/types/domain';

export const dynamic = 'force-dynamic';

// Metadata resolves before Next streams the route shell. Resolving the slug here
// lets unknown detail URLs retain a real HTTP 404 even though the route has a
// loading boundary. React request memoization also shares the lookup with page.
const getCommodityForRequest = cache(async (slug: string) => {
  const source = await getDataSource();
  return source.getCommodityBySlugForDetail(slug);
});

/**
 * The commodity profile.
 *
 * The register view of one commodity: what it is, which series it is quoted in,
 * which markets report it, and how current the record is. It is deliberately
 * *not* the deep price view — that is `/prices/<slug>`, which carries the
 * history, the chart and the full observation list. Splitting the two keeps the
 * profile answerable in one screen and leaves the analysis where it belongs.
 *
 * Everything on this page is derived from published observations. There is no
 * hand-written summary, no forecast and no estimated figure.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const commodity = await getCommodityForRequest(slug);
  if (!commodity) notFound();

  return {
    title: `${commodity.name} profile`,
    description:
      commodity.description ??
      `The reporting markets, comparable series and freshness of the published record for ${commodity.name} on Hatsi360 Markets.`,
    alternates: { canonical: `/commodities/${commodity.slug}` },
    openGraph: {
      title: `${commodity.name} profile — Hatsi360 Markets`,
      description: commodity.description ?? `The commodity profile for ${commodity.name}.`,
      url: `/commodities/${commodity.slug}`,
    },
  };
}

export default async function CommodityProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const commodity = await getCommodityForRequest(slug);
  if (!commodity) notFound();

  return (
    <Suspense fallback={<ProfileLoading />}>
      <CommodityProfileContent commodity={commodity} slug={slug} rangeParam={query.range} />
    </Suspense>
  );
}

async function CommodityProfileContent({
  commodity,
  slug,
  rangeParam,
}: {
  commodity: NonNullable<Awaited<ReturnType<typeof getCommodityForRequest>>>;
  slug: string;
  rangeParam?: string;
}) {
  const source = await getDataSource();

  // The range is preserved from the previous shared URL so an existing link
  // still lands on the window it asked for. It scopes the per-market summary.
  const range =
    PRICE_RANGES.find((candidate) => candidate.key === rangeParam) ??
    PRICE_RANGES.find((candidate) => candidate.key === 'all')!;
  const rangeKey = range.key;

  const observations = await source.listObservationsForAnalysis({
    commodityId: commodity.id,
  });

  const windowed = applyRange(observations, range.days);

  const configured = isSupabaseConfigured();
  const [seriesOptions, profile] = configured
    ? await Promise.all([
        getCommoditySeriesOptions(commodity.id, observations),
        getCommodityProfileBySlug(slug, observations),
      ])
    : [[], null];

  // The page already has this commodity's observations. Calculate its movement
  // from those rows rather than loading every commodity to find one result.
  const movement = getCommodityMovementFromObservations(commodity, observations);

  const byMarket = groupByMarket(windowed);
  const marketCount = commodity.marketCount ?? profile?.readiness.marketCount ?? byMarket.length;
  const synonyms = profile?.synonyms ?? commodity.synonyms ?? [];
  const units = uniqueStrings(windowed.map((o) => o.unitCode ?? o.unitName));
  const grades = uniqueStrings(windowed.map((o) => o.gradeName));
  const priceTypes = uniqueStrings(windowed.map((o) => o.priceType.replace(/_/g, ' ')));

  // The range is anchored to the newest observation, so the caption can say so.
  const windowAnchor = range.days === null ? null : newestCollectedAt(observations);

  const latest = [...observations].sort((a, b) => b.collectedAt.localeCompare(a.collectedAt))[0];

  return (
    <PageContainer>
      <PageHeader
        title={commodity.name}
        description={
          commodity.description ??
          `A tracked commodity in the Hatsi360 Markets catalogue. ${marketCount} market${
            marketCount === 1 ? '' : 's'
          } have published a price for it.`
        }
        actions={
          <>
            <Link href={`/prices/${commodity.slug}`} className="terminal-action">
              <IconTable className="size-3.5" />
              Price history
            </Link>
            <Link href={`/charts?commodity=${commodity.slug}`} className="terminal-action">
              <IconCharts className="size-3.5" />
              Chart it
            </Link>
          </>
        }
      />

      {/* -------------------------------------------- what the record holds -- */}
      {profile ? (
        <section aria-label="Record completeness">
          <SectionHeader
            title="What this record supports"
            action={{ href: '/methodology', label: 'How completeness is assessed' }}
          />
          <div className="terminal-panel p-4">
            <p className="figure-label">{profile.readiness.completeness} record</p>
            <p className="mt-1 text-[0.8125rem] leading-relaxed text-terminal-text-secondary">
              {describeReadiness(profile.readiness)}
            </p>

            {profile.readiness.gaps.length > 0 ? (
              <>
                <p className="mt-4 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-terminal-text-muted">
                  Not yet available for this commodity
                </p>
                <ul className="mt-2 space-y-1.5">
                  {profile.readiness.gaps.map((gap) => (
                    <li
                      key={gap}
                      className="flex gap-2 text-[0.8125rem] leading-relaxed text-terminal-text-secondary"
                    >
                      <span aria-hidden="true" className="text-terminal-text-muted">
                        &mdash;
                      </span>
                      <span>{gap}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 border-t border-terminal-border pt-3 text-[0.6875rem] leading-relaxed text-terminal-text-muted">
                  These are recorded as absent, not estimated. Where a figure could be filled in
                  by assumption, it is left out instead &mdash; a price or a quality level that
                  looks plausible but was never recorded is worse than a visible gap.
                </p>
              </>
            ) : (
              <p className="mt-3 border-t border-terminal-border pt-3 text-[0.6875rem] leading-relaxed text-terminal-text-muted">
                No gaps are recorded for this commodity. Everything below is drawn from
                published observations.
              </p>
            )}
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------- grades and varieties -- */}
      {profile && (profile.grades.length > 0 || profile.varieties.length > 0) ? (
        <section aria-label="Grades and varieties">
          <SectionHeader
            title="Grades and varieties"
            count={profile.grades.length + profile.varieties.length}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="terminal-panel p-4">
              <p className="figure-label">Grades defined</p>
              {profile.grades.length === 0 ? (
                <p className="mt-1 text-[0.8125rem] text-terminal-text-muted">
                  No grades are defined for this commodity.
                </p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {profile.grades.map((grade) => (
                    <li key={grade.id} className="text-[0.8125rem] text-terminal-text-secondary">
                      {grade.name}
                      {profile.commodity.defaultGradeId === grade.id ? (
                        <span className="ml-1.5 text-terminal-text-muted">default</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 border-t border-terminal-border pt-2 text-[0.6875rem] leading-relaxed text-terminal-text-muted">
                {profile.commodity.defaultGradeId === null
                  ? 'No default grade is set, so a price shown without an explicit grade cannot be tied to a known quality level.'
                  : 'Prices are quoted against a named grade wherever one is recorded.'}
              </p>
            </div>
            <div className="terminal-panel p-4">
              <p className="figure-label">Varieties recorded</p>
              {profile.varieties.length === 0 ? (
                <p className="mt-1 text-[0.8125rem] text-terminal-text-muted">
                  No varieties are recorded for this commodity.
                </p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {profile.varieties.map((variety) => (
                    <li key={variety.id} className="text-[0.8125rem] text-terminal-text-secondary">
                      {variety.name}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 border-t border-terminal-border pt-2 text-[0.6875rem] leading-relaxed text-terminal-text-muted">
                {profile.readiness.canShowGradeComparison
                  ? 'More than one grade appears in published observations, so grades can be compared against each other.'
                  : 'Fewer than two grades appear in published observations, so grade prices cannot yet be compared.'}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------- the record -- */}
      {observations.length === 0 ? (
        <EmptyStatePanel
          kind="no-observations"
          action={{ label: 'See collection coverage', href: '/coverage' }}
        />
      ) : (
        <>
          <section aria-label="The published record">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <MarketOverviewCard
                label="Observations"
                value={String(observations.length)}
                detail={`published, across ${byMarket.length} market${byMarket.length === 1 ? '' : 's'}`}
              />
              <MarketOverviewCard
                label="Reporting markets"
                value={String(byMarket.length)}
                detail="markets with at least one published price"
              />
              <MarketOverviewCard
                label="Units quoted"
                value={units.length === 0 ? null : String(units.length)}
                detail={units.length === 0 ? 'No unit recorded' : units.slice(0, 3).join(', ')}
                unavailableReason={units.length === 0 ? 'No unit is recorded on any published observation.' : undefined}
              />
              <MarketOverviewCard
                label="Grades recorded"
                value={grades.length === 0 ? null : String(grades.length)}
                detail={grades.length === 0 ? 'No grade recorded' : grades.slice(0, 3).join(', ')}
                unavailableReason={grades.length === 0 ? 'No grade is recorded on any published observation.' : undefined}
              />
            </div>
          </section>

          {/* ------------------------------------------------------ movement -- */}
          {movement ? (
            <section aria-label="Movement">
              <SectionHeader title="Movement between comparable observations" />
              <div className="terminal-panel p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="figure-label">Latest against previous, same series</p>
                    <p className="mt-1 text-[0.8125rem] leading-relaxed text-terminal-text-secondary">
                      A change is only calculated where both observations share a series
                      key — the same price type, grade, unit and currency. Otherwise the
                      difference would be between two different things.
                    </p>
                  </div>
                  <PriceMovementIndicator
                    change={movement.change}
                    changePercent={movement.changePercent}
                    currencyCode={movement.currencyCode}
                    size="md"
                  />
                </div>
                <p className="mt-3 border-t border-terminal-border pt-3 text-[0.6875rem] leading-relaxed text-terminal-text-muted">
                  A movement is a direction between two observations, not a recommendation,
                  and not a trend. {movement.observationCount} observation
                  {movement.observationCount === 1 ? '' : 's'} in the comparable series;
                  latest from {movement.marketName ?? 'an unnamed market'}.
                </p>
              </div>
            </section>
          ) : null}

          {/* ------------------------------------------------ series options -- */}
          {seriesOptions.length > 0 ? (
            <section aria-label="Comparable series">
              <SectionHeader
                title="Comparable series"
                count={seriesOptions.length}
                action={{ href: '/methodology', label: 'How comparability is decided' }}
              />
              <div className="hidden overflow-x-auto rounded-panel border border-terminal-border md:block">
                <table className="terminal-table">
                  <caption className="sr-only">
                    The comparable series published for {commodity.name}. A series is a
                    combination of price type, grade, unit and currency; only observations
                    inside one series can be compared with each other.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Series</th>
                      <th scope="col" className="text-right">Observations</th>
                      <th scope="col" className="text-right">Markets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seriesOptions.map((option) => (
                      <tr key={option.key}>
                        <td>
                          <span className="text-terminal-text">{option.label}</span>
                        </td>
                        <td className="num text-right">{option.observationCount}</td>
                        <td className="num text-right">{option.marketCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="space-y-2 md:hidden">
                {seriesOptions.map((option) => (
                  <li key={option.key} className="terminal-panel p-3">
                    <h3 className="text-sm font-semibold leading-snug text-terminal-text">
                      {option.label}
                    </h3>
                    <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-terminal-border pt-2.5">
                      <div>
                        <dt className="figure-label">Observations</dt>
                        <dd className="figure-num mt-0.5 text-sm font-semibold text-terminal-text">
                          {option.observationCount}
                        </dd>
                      </div>
                      <div>
                        <dt className="figure-label">Markets</dt>
                        <dd className="figure-num mt-0.5 text-sm font-semibold text-terminal-text">
                          {option.marketCount}
                        </dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[0.6875rem] leading-relaxed text-terminal-text-muted">
                A price in one series is not comparable with a price in another. Choosing a
                series — rather than a market and a grade separately — is how incompatible
                comparisons are avoided.
              </p>
            </section>
          ) : null}

          {/* -------------------------------------------------- per-market -- */}
          <section aria-label="Reporting markets">
            <SectionHeader
              title="Reporting markets"
              count={byMarket.length}
              action={{ href: `/markets`, label: 'The market register' }}
            />
            {byMarket.length === 0 ? (
              <EmptyStatePanel kind="no-commodity-results" />
            ) : (
              <>
                <div className="hidden overflow-x-auto rounded-panel border border-terminal-border md:block">
                  <table className="terminal-table">
                    <caption className="sr-only">
                      The most recent published price for {commodity.name} in each reporting
                      market, over the selected range ({range.label}).
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Market</th>
                        <th scope="col">Price</th>
                        <th scope="col">Unit</th>
                        <th scope="col">Grade</th>
                        <th scope="col">Status</th>
                        <th scope="col">Observed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byMarket.map((row) => (
                        <tr key={row.marketId}>
                          <th scope="row" className="font-medium text-terminal-text">
                            {row.marketName ?? `Market ${row.marketId}`}
                            {row.stateName ? (
                              <span className="ml-1 font-normal text-terminal-text-muted">
                                {row.stateName}
                              </span>
                            ) : null}
                          </th>
                          <td className="num">
                            {row.amount === null ? (
                              <span className="text-terminal-text-muted">Not observed</span>
                            ) : (
                              formatMoney(row.amount, { currency: row.currencyCode })
                            )}
                          </td>
                          <td>{row.unitCode ?? '—'}</td>
                          <td>{row.gradeName ?? '—'}</td>
                          <td>
                            <VerificationBadge
                              status={row.verificationStatus}
                              surface="terminal"
                            />
                          </td>
                          <td className="num text-terminal-text-secondary">
                            {new Date(row.collectedAt).toLocaleDateString('en-NG')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ul className="space-y-2 md:hidden">
                  {byMarket.map((row) => (
                    <li key={row.marketId} className="terminal-panel p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-terminal-text">
                            {row.marketName ?? `Market ${row.marketId}`}
                          </h3>
                          {row.stateName ? (
                            <p className="text-xs text-terminal-text-muted">{row.stateName}</p>
                          ) : null}
                        </div>
                        <VerificationBadge
                          status={row.verificationStatus}
                          surface="terminal"
                        />
                      </div>
                      <p className="figure-num mt-3 text-lg font-bold text-terminal-text">
                        {row.amount === null
                          ? 'Not observed'
                          : `${formatMoney(row.amount, { currency: row.currencyCode })}${
                              row.unitCode ? ` / ${row.unitCode}` : ''
                            }`}
                      </p>
                      <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-terminal-border pt-2.5">
                        <div>
                          <dt className="figure-label">Grade</dt>
                          <dd className="mt-0.5 text-xs text-terminal-text-secondary">
                            {row.gradeName ?? 'Not recorded'}
                          </dd>
                        </div>
                        <div>
                          <dt className="figure-label">Observed</dt>
                          <dd className="figure-num mt-0.5 text-xs text-terminal-text-secondary">
                            {new Date(row.collectedAt).toLocaleDateString('en-NG')}
                          </dd>
                        </div>
                      </dl>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[0.6875rem] leading-relaxed text-terminal-text-muted">
                  Every price is shown with its unit, because a price without a unit is not
                  a price. {windowed.length} observation
                  {windowed.length === 1 ? '' : 's'} fall inside the selected range
                  {priceTypes.length > 0 ? ` · price types recorded: ${priceTypes.join(', ')}` : ''}
                  {windowAnchor
                    ? ` · the window ends at the newest observation, ${new Date(windowAnchor).toLocaleDateString('en-NG')}`
                    : '.'}
                </p>
              </>
            )}
          </section>

          {/* ---------------------------------------------------- the range -- */}
          <nav aria-label="Time range" className="flex flex-wrap gap-1.5">
            {PRICE_RANGES.map((entry) => (
              <Link
                key={entry.key}
                href={`/commodities/${commodity.slug}?range=${entry.key}`}
                aria-current={entry.key === rangeKey ? 'page' : undefined}
                className="terminal-control"
              >
                {entry.label}
              </Link>
            ))}
          </nav>
        </>
      )}

      {/* ------------------------------------------------------- synonyms -- */}
      {synonyms.length > 0 ? (
        <section aria-label="Also known as">
          <SectionHeader title="Also known as" />
          <p className="text-[0.8125rem] leading-relaxed text-terminal-text-secondary">
            {synonyms.join(' · ')}
          </p>
        </section>
      ) : null}

      {latest ? (
        <p className="text-[0.6875rem] leading-relaxed text-terminal-text-muted">
          The most recent published observation for {commodity.name} was collected on{' '}
          {new Date(latest.collectedAt).toLocaleString('en-NG')}. Freshness describes the
          collection time, not the time this page loaded.{' '}
          <Link
            href={`/prices/${commodity.slug}`}
            className="inline-flex items-center gap-1 font-semibold text-harvest-300 underline decoration-terminal-border underline-offset-2"
          >
            Open the full price history
            <IconArrowRight className="size-3" aria-hidden="true" />
          </Link>
        </p>
      ) : null}
    </PageContainer>
  );
}

/* ------------------------------------------------------------- helpers ---- */

interface MarketRollup {
  marketId: number;
  marketName: string | null;
  stateName: string | null;
  amount: number | null;
  currencyCode: string;
  unitCode: string | null;
  gradeName: string | null;
  verificationStatus: PriceObservation['verificationStatus'];
  collectedAt: string;
}

/** The newest collection timestamp in the record, or `null` when empty. */
function newestCollectedAt(observations: PriceObservation[]): string | null {
  return observations.reduce<string | null>(
    (newest, observation) =>
      newest === null || observation.collectedAt > newest ? observation.collectedAt : newest,
    null,
  );
}

/**
 * The observations inside a day range.
 *
 * The range is anchored to the newest observation in the record rather than to
 * the wall clock. A record whose latest observation is a week old should show
 * its own last ninety days, not a window that ends a week before today and
 * silently drops the most recent data.
 */
function applyRange(observations: PriceObservation[], days: number | null): PriceObservation[] {
  if (days === null) return observations;
  const newest = newestCollectedAt(observations);
  if (newest === null) return observations;
  const cutoff = new Date(new Date(newest).getTime() - days * 86_400_000).toISOString();
  return observations.filter((observation) => observation.collectedAt >= cutoff);
}

/** The most recent published observation per market. */
function groupByMarket(observations: PriceObservation[]): MarketRollup[] {
  const byMarket = new Map<number, PriceObservation>();
  for (const observation of observations) {
    const existing = byMarket.get(observation.marketId);
    if (!existing || observation.collectedAt > existing.collectedAt) {
      byMarket.set(observation.marketId, observation);
    }
  }
  return [...byMarket.values()]
    .map((observation) => ({
      marketId: observation.marketId,
      marketName: observation.marketName ?? null,
      stateName: observation.stateName ?? null,
      amount: observation.normalizedAmount ?? observation.reportedAmount ?? null,
      currencyCode: observation.currencyCode,
      unitCode: observation.unitCode ?? null,
      gradeName: observation.gradeName ?? null,
      verificationStatus: observation.verificationStatus,
      collectedAt: observation.collectedAt,
    }))
    .sort((a, b) => b.collectedAt.localeCompare(a.collectedAt));
}

/** Unique, non-empty values in the order they first appear. */
function uniqueStrings(values: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

/* ------------------------------------------------------------- fallbacks -- */

/** The profile while its data loads. */
function ProfileLoading() {
  return (
    <PageContainer>
      <PageHeader
        title="Commodity profile"
        description="Loading the commodity's record, its series and its reporting markets."
      />
      <PanelSkeleton lines={6} />
    </PageContainer>
  );
}
