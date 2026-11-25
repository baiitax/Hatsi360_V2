import Link from 'next/link';
import { INTELLIGENCE_TIERS } from '@/lib/brand';
import { getTradeAccess, type TradeAccess } from '@/lib/trade/access';

const PAID_TIERS = INTELLIGENCE_TIERS.filter((tier) => tier.id !== 'public');

export function PaidIntelligenceNotice({
  access,
  returnTo,
  product,
}: {
  access: TradeAccess;
  returnTo: string;
  product: string;
}) {
  const isGuest = access === 'guest';
  const accountBlocked = access === 'inactive';

  return (
    <div id="main-content" className="editorial min-h-[70vh]">
      <div className="container-page py-10 sm:py-14">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">
            Hatsi360 · Plans
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">
            {accountBlocked ? 'Account access is restricted' : `${product} requires a paid plan`}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-ink-700">
            {accountBlocked
              ? 'This account is not currently active. Please contact the Hatsi360 team for help restoring access.'
              : 'Trade Intelligence and premium Research are available to customers with an active Professional or Enterprise subscription. Choose a plan below or speak with our team about access.'}
          </p>

          {accountBlocked ? (
            <div className="mt-7">
              <Link
                className="inline-flex min-h-11 items-center rounded-full bg-brand-700 px-5 font-semibold text-white hover:bg-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                href="/contact"
              >
                Contact support
              </Link>
            </div>
          ) : (
            <>
              <section aria-labelledby="paid-plan-options" className="mt-8">
                <h2 id="paid-plan-options" className="font-display text-xl font-bold text-ink-950">
                  Subscription plans
                </h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {PAID_TIERS.map((tier) => (
                    <article
                      key={tier.id}
                      className="flex flex-col rounded-2xl border border-ink-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-display text-lg font-bold text-ink-950">{tier.name}</h3>
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
                          By agreement
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-ink-700">{tier.summary}</p>
                      <ul className="mt-4 flex-1 space-y-2 text-sm text-ink-700">
                        {tier.features.map((feature) => (
                          <li key={feature} className="flex gap-2">
                            <span aria-hidden="true" className="font-bold text-brand-700">
                              ✓
                            </span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Link
                        href="/contact"
                        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-brand-700 px-5 text-sm font-semibold text-white hover:bg-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                      >
                        Talk to our team
                      </Link>
                    </article>
                  ))}
                </div>
              </section>

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
                <Link
                  href="/pricing"
                  className="font-semibold text-brand-800 underline underline-offset-4 hover:text-brand-950"
                >
                  Compare all plans
                </Link>
                {isGuest ? (
                  <Link
                    href={`/login?next=${encodeURIComponent(returnTo)}`}
                    className="font-semibold text-brand-800 underline underline-offset-4 hover:text-brand-950"
                  >
                    Already subscribed? Sign in
                  </Link>
                ) : (
                  <span className="text-ink-600">
                    An active subscription is not linked to this account. Contact us if you believe this is a mistake.
                  </span>
                )}
              </div>

              <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
                Paid plans are currently arranged by agreement; online checkout is not enabled. Public market prices remain available at no cost.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Shared server-rendered guard for section layouts. */
export async function PaidIntelligenceGate({
  children,
  returnTo,
  product,
}: {
  children: React.ReactNode;
  returnTo: string;
  product: string;
}) {
  const access = await getTradeAccess();
  if (access === 'admin' || access === 'paid') return children;
  return <PaidIntelligenceNotice access={access} returnTo={returnTo} product={product} />;
}
