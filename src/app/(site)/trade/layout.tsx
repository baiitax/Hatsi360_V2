import type { Metadata } from 'next';
import Link from 'next/link';
<<<<<<< HEAD
import { PaidIntelligenceGate } from '@/components/trade/PaidIntelligenceGate';
=======
>>>>>>> b1d2c0d621d9dba5e8a1581c409af2072300d1f2
import { TRADE_NAV } from '@/lib/trade/navigation';

export const metadata: Metadata = {
  title: {
<<<<<<< HEAD
    default: 'Trade Intelligence',
    template: '%s · Hatsi360 Trade Intelligence',
  },
  description:
    'Agricultural commodity market terminal for Nigeria: latest verified prices, price movement, market comparison and trading opportunities.',
  robots: { index: false, follow: false },
};

/** Trade Intelligence is available to active paid customers and administrators. */
export default function TradeLayout({ children }: { children: React.ReactNode }) {
  return (
    <PaidIntelligenceGate returnTo="/trade" product="Trade Intelligence">
      <div className="min-h-screen bg-soft">
        <div className="border-b border-ink-200 bg-white">
          <div className="container-page">
            <nav aria-label="Trade Intelligence" className="-mb-px flex gap-1 overflow-x-auto">
              {TRADE_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.description}
                  className="shrink-0 border-b-2 border-transparent px-3 py-2.5 text-sm font-semibold text-ink-600 transition-colors hover:border-brand-300 hover:text-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-700"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
        <div className="container-page py-6">{children}</div>
      </div>
    </PaidIntelligenceGate>
=======
    default: 'African Agricultural Trade Intelligence | Hatsi360 Markets',
    template: `%s | Hatsi360 Markets`,
  },
  description:
    'Explore agricultural trade intelligence, commodity export insights, market access information and available buyer and supplier discovery opportunities.',
};

/**
 * The Trade Intelligence section shell.
 *
 * Brief §3 asks for concise navigation with the terminal as the primary
 * destination. Six destinations, in that order, and nothing else — the section
 * is a working tool, not a brochure.
 */
export default function TradeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-soft">
      <div className="border-b border-ink-200 bg-white">
        <div className="container-page">
          <nav
            aria-label="Trade Intelligence"
            className="-mb-px flex gap-1 overflow-x-auto"
          >
            {TRADE_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 border-b-2 border-transparent px-3 py-2.5 text-sm font-semibold text-ink-600 transition-colors hover:border-brand-300 hover:text-brand-800"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <div className="container-page py-6">{children}</div>
    </div>
>>>>>>> b1d2c0d621d9dba5e8a1581c409af2072300d1f2
  );
}
