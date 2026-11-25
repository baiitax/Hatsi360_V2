/**
 * Hatsi360 Markets — the terminal application shell.
 *
 * Environment A. This is the shell a trader, exporter, analyst or institutional
 * buyer lives in: the header bar, the module navigation, the global search, the
 * data-freshness summary, the account menu and the mobile drawer.
 *
 * The design brief is specific about what this shell is for. It optimises for
 * *useful information visible within the initial screen* — no corporate hero,
 * no oversized whitespace, no decorative section. It is a working surface.
 *
 * Four things about it are deliberate:
 *
 *  1. **The header is thin.** 3.25rem on desktop. A header that eats 5rem of a
 *     laptop screen is a header that hides a row of the watch table.
 *  2. **The freshness summary is only shown when it is backed by data.** The
 *     component takes an optional `freshness` summary and renders nothing at all
 *     when there is no observation to summarise. It never shows "Live" as a
 *     decorative label.
 *  3. **The mobile drawer is a real dialog.** It traps nothing it should not,
 *     it closes on Escape and on a backdrop click, and it is a `<dialog>`-role
 *     panel rather than a hidden div.
 *  4. **Navigation is the product's IA, not the website's.** The six modules
 *     come from `MARKET_NAV`; the full site index stays in the footer.
 *
 * This is a Server Component. The only client parts are the mobile drawer's
 * open state and the search field's controlled value, both isolated in
 * `MobileNavigation` and `SearchInput`.
 */

import Link from 'next/link';
import { BRAND, MARKET_NAV } from '@/lib/brand';
import { BrandLogo } from '@/components/brand/Logo';
import { SearchInput } from '../ui/primitives';
import { IconBell, IconChevronDown, IconMenu, IconSearch, IconUser } from '../ui/icons';
import { MobileNavigation } from './MobileNavigation';

/* ---------------------------------------------------------------- the bar */

/**
 * The terminal header.
 *
 * `freshness` is the one line that says how current the platform's data is. It
 * is `null` when there is nothing published, and the header then shows the
 * coverage statement instead of a fake pulse — which is the honest thing to do
 * on a platform that has never published a price.
 */
export function TerminalHeader({
  signedIn = false,
  userEmail,
  workspaceHref = '/dashboard',
  freshness,
  coverageLine,
}: {
  signedIn?: boolean;
  userEmail?: string | null;
  workspaceHref?: string;
  freshness?: { state: string; label: string; observedAt: string | null } | null;
  coverageLine?: string;
}) {
  return (
    <header className="terminal-rail sticky top-0 z-[var(--z-header)]">
      {/* ---------------------------------------------------- the module bar */}
      <div className="flex h-[3.25rem] items-center gap-3 px-3 lg:px-4">
        {/* One supplied lockup keeps the mark and wordmark optically aligned. */}
        <Link
          href="/"
          className="flex shrink-0 items-center rounded-control focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-harvest-300"
          aria-label={`${BRAND.productName} home`}
        >
          <BrandLogo size={32} tone="dark" priority />
        </Link>

        {/* The six modules. */}
        <MainNavigation className="ml-2" />

        <div className="ml-auto flex items-center gap-2">
          {/* Global search. Hidden below lg, where the drawer carries it. */}
          <SearchInput
            label="Search commodities, markets and states"
            action="/prices"
            placeholder="Search commodities…"
            className="hidden w-44 xl:block"
          />

          <Link
            href="/prices"
            className="terminal-control lg:hidden"
            aria-label="Open the market watch"
          >
            <IconSearch className="size-3.5" />
          </Link>

          {signedIn ? (
            <>
              <Link href="/trade/alerts" className="terminal-control hidden sm:inline-flex" aria-label="Price alerts">
                <IconBell className="size-3.5" />
                <span className="hidden md:inline">Alerts</span>
              </Link>
              <Link href={workspaceHref} className="terminal-control">
                <IconUser className="size-3.5" />
                <span className="hidden max-w-[9rem] truncate md:inline">{userEmail ?? 'Workspace'}</span>
              </Link>
            </>
          ) : (
            <Link href="/login" className="terminal-action">
              Sign in
            </Link>
          )}

          <MobileNavigation signedIn={signedIn} userEmail={userEmail} workspaceHref={workspaceHref} />
        </div>
      </div>

      {/* ------------------------------------------------- the context strip */}
      <div className="hidden items-center gap-3 border-t border-terminal-border px-3 py-1 lg:flex">
        {freshness ? (
          <FreshnessSummary state={freshness.state} label={freshness.label} observedAt={freshness.observedAt} />
        ) : coverageLine ? (
          <p className="figure-num truncate text-[0.6875rem] text-terminal-text-muted">{coverageLine}</p>
        ) : null}

        <span aria-hidden="true" className="ml-auto h-3.5 w-px bg-terminal-border" />
        <p className="text-[0.625rem] uppercase tracking-wider text-terminal-text-muted">
          {BRAND.endorsement}
        </p>
      </div>
    </header>
  );
}

/**
 * The desktop module navigation.
 *
 * The six modules of the terminal, each a link to its landing route with a
 * disclosure beside it. This is the *terminal's* navigation — the product's
 * working IA. The full site index stays in the footer, and the site vocabulary
 * (`PRIMARY_NAV`) stays in `src/lib/brand.ts` for the metadata and the sitemap.
 *
 * Two behaviours are deliberate:
 *
 *  - The disclosure opens on hover *and* on focus-within, so it works with a
 *    keyboard and with JavaScript disabled.
 *  - The module label itself is always the landing route, so a click never
 *    depends on the menu being open.
 */
export function MainNavigation({ className = '' }: { className?: string }) {
  return (
    <nav
      aria-label="Market modules"
      className={`hidden min-w-0 flex-1 items-center gap-0.5 lg:flex ${className}`}
    >
      {MARKET_NAV.map((module, index) => (
        <ModuleLink
          key={module.id}
          module={module}
          // The trailing modules align their menu to the right edge of the bar.
          // Anchored to the left edge, the last module's menu would run past a
          // 1024px viewport and force the whole page to scroll sideways.
          align={index >= MARKET_NAV.length - 2 ? 'end' : 'start'}
        />
      ))}
    </nav>
  );
}

/**
 * One module in the bar.
 *
 * A module is a link with a disclosure beside it. The disclosure opens the
 * module's destinations on hover *and* on focus-within, so it works with a
 * keyboard and without JavaScript. The link itself is the module's landing
 * route, so a click never depends on the menu being open.
 */
function ModuleLink({
  module,
  align = 'start',
}: {
  module: (typeof MARKET_NAV)[number];
  align?: 'start' | 'end';
}) {
  return (
    <div className="relative">
      <div className="flex items-center">
        <Link
          href={module.href}
          className="inline-flex h-[1.875rem] items-center rounded-l-control px-2.5 text-[0.75rem] font-semibold uppercase tracking-wide text-terminal-text-secondary transition-colors duration-150 hover:bg-terminal-interactive hover:text-terminal-text"
        >
          {module.label}
        </Link>
        {module.items.length > 0 ? (
          <details className="relative">
            <summary className="inline-flex h-[1.875rem] cursor-pointer list-none items-center rounded-r-control px-1 text-terminal-text-muted transition-colors duration-150 hover:bg-terminal-interactive hover:text-terminal-text focus-visible:bg-terminal-interactive focus-visible:text-terminal-text [&::-webkit-details-marker]:hidden">
              <span className="sr-only">{module.label} destinations</span>
              <IconChevronDown className="size-3" aria-hidden="true" />
            </summary>
            <div
              className={`absolute top-full z-[var(--z-header)] w-60 rounded-panel border border-terminal-border bg-terminal-elevated py-1.5 shadow-terminal-lift ${
                align === 'end' ? 'right-0' : 'left-0'
              }`}
            >
              <p className="px-2.5 pb-1 text-[0.625rem] leading-4 text-terminal-text-muted">
                {module.summary}
              </p>
              {module.items.map((item) => (
                <Link
                  key={`${module.id}-${item.label}`}
                  href={item.href}
                  className="block px-2.5 py-1 transition-colors hover:bg-terminal-interactive"
                >
                  <span className="block text-[0.8125rem] font-medium text-terminal-text">
                    {item.label}
                  </span>
                  {item.description ? (
                    <span className="block text-[0.625rem] leading-4 text-terminal-text-muted">
                      {item.description}
                    </span>
                  ) : null}
                </Link>
              ))}
              {module.planned && module.planned.length > 0 ? (
                <p className="mt-1 border-t border-terminal-border px-2.5 pt-1.5 text-[0.5625rem] leading-4 text-terminal-text-muted">
                  <span className="font-semibold uppercase tracking-wider">In development</span>
                  <span className="ml-1">{module.planned.join(', ')}</span>
                </p>
              ) : null}
            </div>
          </details>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The one-line freshness summary in the header's context strip.
 *
 * It reports the *collection* state of the most recent published observation,
 * never the state of the page. A page that loaded a second ago is not the same
 * fact as a market that was observed a second ago, and this component exists to
 * keep them apart.
 */
function FreshnessSummary({
  state,
  label,
  observedAt,
}: {
  state: string;
  label: string;
  observedAt: string | null;
}) {
  const tone =
    state === 'fresh' || state === 'today'
      ? 'text-success-700'
      : state === 'stale' || state === 'timestamp_review'
        ? 'text-warning-700'
        : 'text-terminal-text-secondary';

  return (
    <p className="flex items-center gap-1.5 text-[0.6875rem]">
      <span aria-hidden="true" className={`size-1.5 rounded-pill bg-current ${tone}`} />
      <span className={`font-semibold ${tone}`}>{label}</span>
      {observedAt ? (
        <span className="figure-num text-terminal-text-muted">
          last observation {formatMoment(observedAt)}
          {/* The absolute timestamp is correct but a reader should not have to
              subtract dates to know whether a price is current. The age is
              stated in words beside it. */}
          {formatAge(observedAt) ? (
            <span className="text-terminal-text-secondary"> · {formatAge(observedAt)}</span>
          ) : null}
        </span>
      ) : null}
    </p>
  );
}

/**
 * How old an observation is, in words. Deliberately coarse: "today", "3 days
 * ago", "in 2 days". Returns null when the timestamp cannot be read.
 */
function formatAge(iso: string): string | null {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  const minutes = Math.round((then - Date.now()) / 60000);
  const abs = Math.abs(minutes);
  const ago = minutes < 0;
  const say = (value: number, unit: string) => {
    const plural = value === 1 ? unit : `${unit}s`;
    return ago ? `${value} ${plural} ago` : `in ${value} ${plural}`;
  };
  if (abs < 60) return abs <= 1 ? (ago ? 'just now' : 'in a moment') : say(abs, 'minute');
  if (abs < 60 * 24) return say(Math.round(abs / 60), 'hour');
  if (abs < 60 * 24 * 60) return say(Math.round(abs / (60 * 24)), 'day');
  return say(Math.round(abs / (60 * 24 * 30)), 'month');
}

function formatMoment(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'at an unrecorded time';
  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(date);
}

/* --------------------------------------------------------- the page frame */

/**
 * The page container.
 *
 * One horizontal measure for the whole terminal: full-bleed to the viewport
 * edges with a gutter that widens at `lg`. The terminal deliberately does *not*
 * use a centred 80rem column — a market table is a wide object and centring it
 * wastes the space a trader needs.
 */
export function PageContainer({
  children,
  className = '',
  width = 'wide',
}: {
  children: React.ReactNode;
  className?: string;
  /** `wide` is the terminal default; `prose` is the editorial measure. */
  width?: 'wide' | 'prose';
}) {
  return (
    <div
      className={`mx-auto w-full px-3 lg:px-4 ${
        width === 'prose' ? 'max-w-4xl' : 'max-w-[110rem]'
      } ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * The page header.
 *
 * A title, an optional subtitle, and an optional toolbar. The title is the page
 * in one line — no eyebrow, no marketing strapline, nothing that is not a fact
 * about the page. The toolbar holds the page's filters and actions.
 */
export function PageHeader({
  title,
  description,
  actions,
  meta,
  className = '',
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 py-4 ${className}`}>
      <div className="min-w-0 max-w-2xl">
        <h1 className="font-display text-[1.25rem] font-bold tracking-tight text-terminal-text lg:text-[1.375rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-[0.8125rem] leading-5 text-terminal-text-secondary">{description}</p>
        ) : null}
        {meta ? <div className="mt-2">{meta}</div> : null}
      </div>
      {actions ? (
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5">{actions}</div>
      ) : null}
    </div>
  );
}

/**
 * A section header inside a page.
 *
 * The section's own title, an optional count, and an optional action. The count
 * is the count the database holds, and it is always a real number — never a
 * rounded "many" and never omitted when it is zero.
 */
export function SectionHeader({
  title,
  count,
  countLabel,
  action,
  href,
  className = '',
}: {
  title: string;
  count?: number;
  /** What the count counts. A bare numeral beside a heading is a riddle. */
  countLabel?: string;
  action?: { href: string; label: string };
  href?: string;
  className?: string;
}) {
  return (
    // `flex-wrap` and `min-w-0` on both children: a section heading with a long
    // action label used to overflow a 360px phone by 16px, because neither the
    // title nor the action was allowed to move to its own line. The action now
    // wraps below the title instead of pushing the row off screen, and it keeps
    // its full label rather than being truncated — a truncated "Read more" is
    // worse than a stacked one.
    <div className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pb-2 ${className}`}>
      <h2 className="flex min-w-0 items-baseline gap-2 font-display text-[0.9375rem] font-bold text-terminal-text">
        {href ? (
          <Link href={href} className="underline decoration-terminal-border underline-offset-4 hover:text-harvest-300">
            {title}
          </Link>
        ) : (
          title
        )}
        {typeof count === 'number' ? (
          <span className="figure-num text-[0.6875rem] font-semibold text-terminal-text-muted">
            {count}
            {countLabel ? <span className="ml-1 font-normal">{countLabel}</span> : null}
          </span>
        ) : null}
      </h2>
      {action ? (
        <Link href={action.href} className="terminal-control min-w-0">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

/**
 * The shell itself.
 *
 * The header, the main region and the footer, in the terminal's own canvas. The
 * `<main>` carries `id="main"` so the skip link in the root layout has
 * somewhere to go.
 */
export function TerminalShell({
  header,
  children,
  footer,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="terminal flex min-h-screen flex-col">
      {header}
      <main id="main" className="flex-1 pb-10">
        {children}
      </main>
      {footer}
    </div>
  );
}

/** The trigger for the mobile drawer, exported for the header's own use. */
export { IconMenu as TerminalMenuTrigger };
