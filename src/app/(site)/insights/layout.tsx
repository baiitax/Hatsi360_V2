import type { Metadata } from 'next';
import { PaidIntelligenceGate } from '@/components/trade/PaidIntelligenceGate';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** Research archive and its detail routes are for paid customers and admins. */
export default function InsightsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PaidIntelligenceGate returnTo="/insights" product="Research">
      {children}
    </PaidIntelligenceGate>
  );
}
