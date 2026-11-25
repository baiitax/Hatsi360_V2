import SiteLayout from '../(site)/layout';

/**
 * Uses the public terminal shell without inheriting `(site)/loading.tsx`.
 * Keeping this detail route non-streamed until its slug is validated lets
 * Next.js return an actual HTTP 404 for unknown commodity URLs instead of the
 * HTTP 200 required for a streamed not-found response.
 */
export default function CommodityProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SiteLayout>{children}</SiteLayout>;
}
