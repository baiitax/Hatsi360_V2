import SiteLayout from '@/app/(site)/layout';

/**
 * The market detail route shares the public shell, but sits outside the public
 * site's loading boundaries. That lets Next send an actual HTTP 404/500 before
 * streaming begins when a market is missing or a required query fails.
 */
export default function MarketDetailLayout({ children }: { children: React.ReactNode }) {
  return <SiteLayout>{children}</SiteLayout>;
}
