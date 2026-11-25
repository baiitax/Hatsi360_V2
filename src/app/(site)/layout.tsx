import { SiteFooter } from '@/components/site/SiteFooter';
<<<<<<< HEAD
import { TerminalHeader, TerminalShell } from '@/components/terminal/TerminalShell';
import { getTerminalSummary } from '@/lib/terminal/summary';
import { getProfile } from '@/lib/auth';
import { landingPathForRole } from '@/lib/auth/routing';

/**
 * The layout of the public market terminal.
 *
 * Everything a visitor, trader, analyst or customer reads shares this shell:
 * the markets homepage, the commodity catalogue, the market directory, the
 * price directory, the comparison, the trade terminal, the charts workspace,
 * the fundamentals, the insights, the reports, the legal pages and the customer
 * workspace.
 *
 * The shell is the dark market terminal — Environment A. The editorial
 * surfaces inside it (research, market briefs, the institutional pages) declare
 * their own light canvas with the `.editorial` class, so a reader moves between
 * the two environments without ever leaving the product.
 *
 * The access portal and the two operator applications deliberately do not
 * appear here. They are in their own route groups, because a person signing in
 * or collecting prices should not be looking at the public navigation.
 *
 * The header's summary is resolved here rather than in the header, so it is
 * fetched once per render rather than once per component.
=======
import { Navbar } from '@/components/homepage/Navbar';
import { getTerminalSummary } from '@/lib/terminal/summary';
import { getProfile } from '@/lib/auth';

/**
 * The layout of the public site.
 *
 * Uses the new professional Navbar component with light theme.
 * The navbar supports:
 * - Sticky positioning with scroll-aware background
 * - Desktop dropdown navigation with logo colors
 * - Mobile drawer with smooth animations
 * - Search integration
 * - Active route indicators
>>>>>>> b1d2c0d621d9dba5e8a1581c409af2072300d1f2
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [profile, summary] = await Promise.all([getProfile(), getTerminalSummary()]);

<<<<<<< HEAD
  const workspaceHref = profile ? landingPathForRole(profile.role) : '/dashboard';

  return (
    <TerminalShell
      header={
        <TerminalHeader
          signedIn={Boolean(profile)}
          userEmail={profile?.email ?? null}
          workspaceHref={workspaceHref}
          freshness={summary.freshness}
          coverageLine={summary.coverageLine}
        />
      }
      footer={<SiteFooter />}
    >
      {children}
    </TerminalShell>
=======
  const workspaceHref =
    profile?.role === 'agent'
      ? '/agent/home'
      : profile?.role === 'admin' ||
          profile?.role === 'verification_officer' ||
          profile?.role === 'super_admin'
        ? '/admin/overview'
        : '/dashboard';

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        signedIn={Boolean(profile)}
        userEmail={profile?.email ?? null}
        workspaceHref={workspaceHref}
        freshness={summary.freshness}
      />
      <main className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
>>>>>>> b1d2c0d621d9dba5e8a1581c409af2072300d1f2
  );
}
