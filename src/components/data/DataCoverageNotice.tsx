import Link from 'next/link';
import { formatDate } from '@/lib/money';
import { getDataSource } from '@/lib/data';
import { relativeTime } from '@/lib/pricing';
import {
  classifyFreshness,
  requiresFreshnessWarning,
} from '@/lib/trade/freshness';

/**
 * A banner that states, honestly, how fresh the prices on the page are.
 *
 * It appears when the newest observation is outside its freshness window.
 * The alternative — presenting old figures as current — is exactly the
 * behaviour this platform is designed to prevent.
 */
export async function DataCoverageNotice({
  latestCollectedAt,
  observationCount,
}: {
  latestCollectedAt?: string | null;
  observationCount?: number;
}) {
  const source = await getDataSource();

  const parsedLatestTimestamp = latestCollectedAt ? new Date(latestCollectedAt).getTime() : null;
  const timestampIsInvalid =
    parsedLatestTimestamp !== null && !Number.isFinite(parsedLatestTimestamp);
  const freshness = latestCollectedAt
    ? classifyFreshness({
        collectedAt: latestCollectedAt,
        collectedAtPrecision: /^\d{4}-\d{2}-\d{2}$/.test(latestCollectedAt) ? 'date' : 'minute',
        // The price directory mixes commodities and does not receive their
        // operational collection schedules. Omit cadence rather than inventing
        // a daily schedule; the shared engine then applies its explicit legacy
        // no-cadence thresholds.
      })
    : null;
  const timestampNeedsReview = timestampIsInvalid || freshness?.state === 'future_timestamp';
  const freshnessNeedsNotice = freshness ? requiresFreshnessWarning(freshness.state) : false;

<<<<<<< HEAD
  if (!source.isMigrated && !freshnessNeedsNotice && !timestampNeedsReview) return null;

  const latest = latestCollectedAt
    ? timestampIsInvalid
      ? 'unreadable'
      : formatDate(latestCollectedAt)
    : provenance
      ? formatDate(provenance.dateRange[1])
      : null;
=======
  if (!stale) return null;

  const latest = latestCollectedAt ? formatDate(latestCollectedAt) : null;
>>>>>>> b1d2c0d621d9dba5e8a1581c409af2072300d1f2

  return (
    <aside
      className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 sm:p-6"
      aria-label="Data freshness notice"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-lg text-amber-800"
        >
          ⚑
        </span>
        <div className="min-w-0 flex-1">
<<<<<<< HEAD
          <h2 className="text-base font-bold text-amber-950">
            {source.isMigrated
              ? 'Migrated price records — read this first'
              : timestampNeedsReview
                ? 'Observation timestamp needs review'
                : 'Price coverage notice'}
          </h2>

          {source.isMigrated && provenance ? (
            <>
              <p className="mt-2 text-sm leading-relaxed text-amber-900">
                Every figure currently published on this site was migrated from the previous
                Pluck Live system — this platform&rsquo;s earlier name — on{' '}
                <strong>{formatDate(provenance.collectedAt)}</strong>. Those
                records carry no verification trail, no measurement unit and no collection time of
                day, so they are labelled{' '}
                <em>Legacy record — unverified</em> and must not be treated as a current market
                quote.
              </p>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                    Records migrated
                  </dt>
                  <dd className="mt-0.5 text-lg font-bold text-amber-950">{provenance.observedCount}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                    Collection range
                  </dt>
                  <dd className="mt-0.5 font-medium text-amber-950">
                    {formatDate(provenance.dateRange[0])} – {formatDate(provenance.dateRange[1])}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                    Newest observation
                  </dt>
                  <dd className="mt-0.5 font-medium text-amber-950">
                    {latest ?? '—'}
                    {latestCollectedAt && !timestampNeedsReview ? (
                      <span className="ml-1 font-normal text-amber-800">
                        ({relativeTime(latestCollectedAt)})
                      </span>
                    ) : null}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-sm leading-relaxed text-amber-900">
                The collection network is being re-established market by market. New observations
                are captured in the field by market agents, verified by a verification officer,
                and published with their unit, price type and timestamps attached.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/about"
                  className="rounded-full bg-amber-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-950"
                >
                  How we collect prices
                </Link>
                <Link
                  href="/disclaimer"
                  className="rounded-full border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100"
                >
                  Price data disclaimer
                </Link>
              </div>
            </>
          ) : timestampNeedsReview ? (
            <p className="mt-2 text-sm leading-relaxed text-amber-900">
              The most recent recorded collection time ({latest ?? 'unreadable'}) is later than, or
              cannot be parsed against, the platform clock. Its age and freshness cannot be
              established, so it must not be described as current until the timestamp is checked.
              {' '}{observationCount ?? 0} observation{observationCount === 1 ? '' : 's'} are in
              this result set.
            </p>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-amber-900">
              The newest observation in this result set is dated {latest} (
              {relativeTime(latestCollectedAt!)}). The shared freshness policy classifies it as{' '}
              <strong> {freshness?.label.toLowerCase() ?? 'requiring review'}</strong>.{' '}
              {freshness?.explanation}{' '}
              {observationCount ?? 0} observation{observationCount === 1 ? '' : 's'} are currently
              published; this status describes the newest timestamp, not every historical row.
            </p>
          )}
=======
          <h2 className="text-base font-bold text-amber-950">Price coverage notice</h2>

          <p className="mt-2 text-sm leading-relaxed text-amber-900">
            The most recent published observation is dated {latest ?? '—'}
            {latestCollectedAt ? (
              <span className="ml-1">({relativeTime(latestCollectedAt)})</span>
            ) : null}.
            Prices older than the commodity&rsquo;s freshness window are still shown,
            but they are marked as stale.{' '}
            {observationCount ?? 0} observation{observationCount === 1 ? '' : 's'} are currently
            published.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-amber-900">
            The collection network is active market by market. New observations are captured
            in the field by market agents, verified by a verification officer, and published
            with their unit, price type and timestamps attached.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/about"
              className="rounded-full bg-amber-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-950"
            >
              How we collect prices
            </Link>
            <Link
              href="/disclaimer"
              className="rounded-full border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100"
            >
              Price data disclaimer
            </Link>
          </div>
>>>>>>> b1d2c0d621d9dba5e8a1581c409af2072300d1f2
        </div>
      </div>
    </aside>
  );
}
