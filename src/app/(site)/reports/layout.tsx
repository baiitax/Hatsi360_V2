import type { Metadata } from 'next';
import { PaidIntelligenceGate } from '@/components/trade/PaidIntelligenceGate';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** Reports archive and detail routes are for paid customers and admins. */
export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PaidIntelligenceGate returnTo="/reports" product="Market Research">
      {children}
    </PaidIntelligenceGate>
  );
}
