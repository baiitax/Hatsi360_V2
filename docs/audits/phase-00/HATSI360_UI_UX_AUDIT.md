# Hatsi360 Markets — UI/UX Forensic Audit

**Phase 0 · Audit-only · Repository snapshot reviewed 2026-10-22**  
**Status:** Static repository audit complete; runtime viewport audit is **not verified** because a browser executable is absent.  
**Modification boundary:** Only audit documentation is being created. No application source, styles, configuration, schema, data, dependencies, commits or deployments were changed for this audit.

## Executive assessment

Hatsi360 has a well-considered product identity and a relatively mature design foundation: a dark data-terminal environment, a light editorial environment, a centralized token system, tabular numerals, explicit market-data states, a responsive mobile navigation concept, and distinct public, admin, agent and sign-in shells. The market-watch table has a real card alternative on small screens; chart and table components are shared rather than page-local; brand and design-system tests exist.

The central risk is not absence of design intent. It is **implementation drift at the seams**: global focus styling is low-contrast on the dark terminal; some metadata and chart/header text is too small or low-contrast for ordinary text; the root skip link does not reach a main landmark in the admin and agent shells; the mobile market drawer declares a modal dialog but has no focus-management implementation; and the mobile fixed bar lacks safe-area treatment and has less bottom clearance than its own height. The three application surfaces also use distinct styling idioms, with one unused older site header still in the component tree.

No P0 finding was confirmed from static evidence. P1 items below are accessibility and critical task discoverability risks to verify and fix first. No visual-quality claim in this report is based on a screenshot: a browser could not be launched in this environment.

## Scope and evidence

### Repository facts inspected

- Next.js App Router **16.4.2**, React **19.3.1**, TypeScript **5.9.3**, Tailwind CSS **4.3.3**, Recharts **3.10.1**, Supabase SSR/client libraries and Zod. No general-purpose component library is installed.
- Build manifest: **86 page route patterns** — 34 public/site, 4 access-portal, 29 admin, 19 field-agent — plus 14 `route.ts` handlers and static metadata/image handlers. The manifest includes the internal `/coverage-report` route; the public alias is `/coverage`.
- `src/components/`: 72 component files; `src/app/globals.css`: 1,121 lines; `src/components/terminal/TerminalShell.tsx`: 441 lines; `src/components/market/MarketWatchTable.tsx`: 453 lines.
- Design system: `@theme` tokens and component layers in `src/app/globals.css`; mirrored brand/type/navigation values in `src/lib/brand.ts`; chart roles in `src/lib/chart-colours.ts`; prior design-system specifications in `docs/design-system/hatsi360-markets/`.
- Tests: `tests/design-system/`, `tests/ux/`, and `scripts/check-responsive.mjs` exist. The historical responsive document says it passed 56 checks at 8 widths for 7 routes. This audit did **not** reproduce that claim.
- HTTP spot-check against the existing local production server: `/`, `/markets`, `/commodities`, `/prices`, `/compare`, `/charts`, `/trade`, `/trade/best-buy`, `/trade/best-sell`, `/trade/fundamentals`, `/trade/alerts`, `/trade/watchlist`, `/dashboard`, `/about`, `/reports`, `/insights`, `/api-docs`, `/login`, `/register` returned 200; `/admin` and `/agent` returned 307 unauthenticated. This establishes routing responses only, not visual quality.

### Browser and viewport limitation

Playwright is in `package.json` and present in the installed dependency tree, but its expected Chromium executable (`/home/user/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell`) is missing. No browser installation was attempted because Phase 0 forbids installing dependencies or modifying the environment. Therefore:

- no screenshot was captured;
- no viewport geometry, actual overflow, tap target, modal fit, focus order, or visual rendering was freshly verified;
- the eight target sizes are evaluated below from breakpoint and component source only;
- findings dependent on browser appearance are explicitly recommendations or verification tasks, not observed defects.

The existing `RESPONSIVE_DESIGN.md` records earlier Playwright results at 360, 390, 430, 768, 1024, 1280, 1366 and 1440 widths. The requested 320, 375 and 1920 sizes are not in that saved matrix, and 1280/1440 heights differ from some requested values. Treat that prior report as historical evidence, not a fresh Phase 0 result.

## Findings register

Complexity is a rough implementation estimate for one experienced frontend engineer, excluding product approval.

| ID | Priority | Finding / evidence | User impact | Recommendation | Complexity |
|---|---|---|---|---|---|
| UX-01 | **P1** | Global `:focus-visible` in `src/app/globals.css` uses `--color-brand-700` (`#174D35`) on every surface. Contrast against terminal background `#101713` is **1.86:1** and against terminal surface `#17211B` **1.69:1**. | Keyboard focus can be difficult to locate in the primary dark workspace. | Define surface-aware focus tokens; use a high-contrast harvest/outline ring on dark surfaces and a dark brand ring on light surfaces; verify 2px+ visible perimeter and clipping across all shells. | S |
| UX-02 | **P1** | Root skip link targets `#main` (`src/app/layout.tsx`). Terminal main has `id="main"`; portal layout has it; `AdminShell.tsx` and `AgentShell.tsx` render `<main>` without that id. | Skip-to-content is a dead destination for the two operational portals. | Give each shell one stable `main#main`; automate an assertion for all layout families. | XS |
| UX-03 | **P1** | Terminal muted text is `#748278`: calculated contrast is **4.51:1** on terminal background, **4.10:1** on surface and **3.75:1** on elevated. It is used on small headings, table headers, timestamps and metadata. The existing `COLOR_SYSTEM.md` understates/overstates several pairs (e.g. editorial secondary is 5.65:1, not its stated ≈6.4:1). | Some normal-size text does not meet WCAG 2.2 AA 4.5:1 on its actual surface; small uppercase labels are also hard to scan. | Recalculate every token on each actual surface; reserve low-contrast tokens for decorative content; use a ≥4.5:1 muted text token for normal text and separately name dividers. Add an automated contrast table/test from the CSS source. | S |
| UX-04 | **P1** | `MobileNavigation.tsx` sets `role="dialog"` and `aria-modal="true"`, closes on Escape and locks body scroll, but contains no visible focus placement, focus trap, or return-focus code. This is source inspection, not a keyboard-browser test. | Keyboard and screen-reader users may tab behind the modal or lose their place when it closes. | Add initial focus, tab containment, return focus and robust route-close handling; or use a native dialog primitive with equivalent tested behaviour. | M |
| UX-05 | **P1** | The fixed terminal bottom bar is `3.25rem` high; `TerminalShell` only adds `pb-10` (2.5rem) to main. Neither `MobileNavigation` nor `AgentShell` uses `env(safe-area-inset-bottom)`. | Last content can sit under fixed navigation; iPhone home-indicator safe area may further reduce usable space. This is a static geometry risk, not a measured overlap. | Add safe-area padding and page-bottom clearance ≥ bar height plus safe area; test final focusable control and final page content at 320×568 and 375×812. | S |
| UX-06 | **P1** | Several text roles are 10px (`--text-micro`), 11px metadata, and chart ticks at 10–11px (`PriceChart.tsx`, operational charts); bottom-bar captions use 9px. | Prices may be legible while context, dates, axis labels and navigation are not. | Raise essential metadata and chart labels to 12px minimum and body to 14–16px; keep 10px only for nonessential micro-labels with a larger accessible equivalent. | M |
| UX-07 | **P2** | Three application shells deliberately diverge, but public pages mix `PageHero` / `.card` / `container-page` with `PageHeader` / `.terminal-panel` / `PageContainer`; header H1 scales range from 20–22px terminal to 30–48px `PageHero`. There are 157 source uses of `rounded-xl`, `rounded-2xl` and `rounded-3xl` alongside 6–14px terminal radii. | Page-to-page changes in density, heading size, surface and radii may make one product feel like several templates. Static source evidence; actual visual transitions not captured. | Keep the intentional dark terminal, light editorial, admin and field environments, but define explicit page-family contracts and migrate page families to one approved header/container/card API. | L–XL |
| UX-08 | **P2** | `src/components/site/SiteHeader.tsx` has no imports elsewhere; it includes the older navigation system and a `MainNavigation` given `hidden`. The live public shell is `TerminalHeader` in `TerminalShell.tsx`. | Two competing shell implementations increase visual drift and maintenance ambiguity. | After dependency/route verification, mark as legacy or remove in an approved implementation phase; do not change during this audit. | S |
| UX-09 | **P2** | Admin and field nav use 27 distinct Unicode/symbol icon values (`navigation.ts`, `agent/layout.tsx`), while the public terminal uses a hand-drawn SVG icon registry. | Glyph shape, baseline and meaning vary by OS font; dense operator navigation looks less systematic. | Reuse the existing SVG icon registry or a typed role-specific icon map; retain text labels and accessible names. | M |
| UX-10 | **P2** | Core price table is responsive by replacing desktop rows with cards below `md`; other tables use `overflow-x-auto` with `min-width` from 28rem to 46rem. | Horizontal scrolling is valid for comparison data, but discoverability and row/column context can be weak on a narrow phone. | Preserve essential fields; add a visible scroll affordance or mobile detail-card alternative by task; keep row headers and sticky headings, and test keyboard/touch scroll. | M–L |
| UX-11 | **P2** | Chart components use Recharts `ResponsiveContainer`, but axes include 10–11px labels; some chart IDs are derived directly from series keys, and chart colors combine SVG palette variables with older literal colors in `CandleChart.tsx`. | Dense labels and chart palette drift reduce comparison clarity; duplicate IDs can become a maintenance risk if multiple instances share a key. | Standardize chart frame, minimum text size, color/line-style encoding, empty state, accessible data summary and unique per-instance IDs. | M |
| UX-12 | **P2** | Market terminal has a compact 30px `terminal-control`; public mobile controls share the same base class in some locations. Agent shell separately uses larger bottom navigation. | Touch usability may differ by control and route; source does not prove the actual hit area in every composition. | Define 44px touch targets for primary mobile controls and preserve compact desktop density where appropriate; verify target size and spacing in browser. | M |
| UX-13 | **P2** | Two navigation vocabularies are explicit (`MARKET_NAV` vs site `PRIMARY_NAV`); mobile drawer expands all module destinations and a fixed bottom bar duplicates four destinations. | The approach is coherent, but duplicate destinations and long drawer length need testing on short screens. | Keep the mobile bottom bar to high-frequency destinations; ensure drawer scroll/focus behavior and active module context are tested at 320×568. | S–M |
| UX-14 | **P3** | 19 raw hex occurrences exist outside the main token stylesheet and `brand.ts`; CandleChart has hardcoded brand/neutral/market colors, and loader/manifest carry standalone values. | Small sources of palette drift and extra review burden. | Move chart-specific values to named chart tokens; keep platform metadata colors synchronized via a generated or tested token mapping. | S |
| UX-15 | **P3** | Client charts contain inline styles for dimensions and Recharts configuration (28 `style={{` occurrences across `src`); these appear mostly chart-specific rather than general layout styles. | Limited design-token visibility and screenshot testing friction, not proof of a performance defect. | Keep data-driven SVG styles inline where necessary; move reusable dimensions/colors to tokens and benchmark before optimizing. | S |

### Strengths to preserve

- Product identity is specific and evidence-led in `docs/design-system/hatsi360-markets/BRAND_IDENTITY.md`.
- The two visual environments are an intentional product distinction, not an accidental `dark:` cascade.
- Table numerals use tabular figures; `PriceDisplay` avoids rendering missing prices as zero; movement uses glyph/sign and text, not color alone.
- The main market-watch table has an explicit mobile card rendition; the agent surface has a thumb-reachable 5-item bottom bar.
- Empty/loading/error patterns and reduced-motion tokens are centralized.
- Main public shell is a Server Component; stateful mobile navigation and charts are isolated client components; no third-party icon library is present.
- HTTP routes spot-checked remained reachable; admin/agent routes redirected without a session rather than exposing a portal.

## Color system audit

The existing system has a coherent base palette. Keep its identity; fix usage and measured contrast rather than replacing it arbitrarily. Exact existing values are in `src/app/globals.css` and `src/lib/brand.ts`.

| Role | Current token/value | Audit note |
|---|---|---|
| Primary brand | `brand-700 #174D35`; deep brand `#123B2A` | Strong on white; too low-contrast as the global focus ring on dark terminal. |
| Supporting green | `leaf-500 #5B9A57`; movement `#2F8F57` | Do not use light-vs-dark variants interchangeably for text and fills. |
| Grain accent | `harvest-500 #D5A441`; `harvest-300 #E9C97E` | Strong highlight on dark; darker gold needed for small text on light. |
| Terminal bg/surface/elevated | `#101713` / `#17211B` / `#1C2921` | Consistent, professional dark green-charcoal. |
| Terminal text/secondary/muted | `#F3F6F2` / `#A8B5AA` / `#748278` | Primary and secondary excellent; muted fails 4.5:1 on surface/elevated. |
| Editorial bg/surface/soft | `#F7F8F5` / `#FFFFFF` / `#F0F3EE` | Warm, readable surfaces. |
| Editorial text/secondary | `#202923` / `#59665E` | Calculated 14.04:1 and 5.65:1 on bg; safe. |
| Terminal divider | `#2C3A31` | 1.52:1 against bg; appropriate only as decorative hairline, not the only indicator of a control boundary. |
| Semantic/market | success `#228B55`, warning `#D69E2E`, danger `#C84B45`, info `#3478B8`, movement down `#D0584F` | `success-500` on white is 4.29:1; warning-500 on white is 2.39:1. Avoid these as text on white. |

Contrast ratios were recalculated from the exact CSS hex values using the WCAG relative-luminance formula. They are code-based, not a browser capture. The existing `COLOR_SYSTEM.md` ratios do not all reproduce; the full recommended token/contrast table is in `HATSI360_DESIGN_SYSTEM.md`.

## Typography and data readability

- **Families:** Inter (UI and figures) + Manrope (display) loaded with `next/font/google`; Next self-hosts build artifacts. Good two-family constraint.
- **Scale:** 10px micro; 11px metadata; 12px label; 13px small body; 15px figure; 20px large figure; 28px XL figure. `PageHero` uses 30/36/48px H1 while terminal PageHeader uses 20/22px; typography is appropriate to different contexts but needs a page-family contract.
- **Strength:** tabular numerals and a single `formatMoney` function, with unit/provenance state components.
- **Risk:** ordinary metadata, the table header and chart ticks are frequently 10–11px; dense numerical views require scaling/zoom and excellent contrast, not just a premium font.
- **Recommendation:** keep Inter/Manrope; define body 14–16px, essential metadata 12px+, chart axis 12px+, section title 18–20px and page title 24–32px; retain tabular figures for price, quantity, count and percent; expose a compact/comfortable density preference only if validated by users.

## Layout, dashboard, data, charts and interaction audit

### Shell and information architecture

- Public market terminal: sticky compact rail, horizontal six-module navigation at `lg`, search/account actions, secondary collection summary, mobile drawer and 4-item bottom bar.
- Access portal: intentionally standalone, no public nav.
- Admin Control Centre: fixed collapsible desktop sidebar (16rem/4.5rem), mobile drawer, sticky header/search, role-filtered grouped nav.
- Field app: mobile-first single-column max width, status/alerts in header, 5-item fixed bottom navigation.
- These are suitable distinct contexts; establish shared design tokens/interaction contracts across shells rather than forcing one layout onto all.

### Dashboard hierarchy

`/` is the market terminal landing page and acts as the public market dashboard: page header; global search; overview metrics; market watch (table desktop/cards mobile); movers; comparison; recent activity; editorial/coverage support. The information sequence is credible and data-oriented. The signed-in `/dashboard` is a customer workspace (saved commodities/markets, alerts, API applications and plan), not the same dashboard. Redesign plans must keep them distinct.

Static review recommends making the first viewport answer, in order: coverage/data freshness, a small set of published-market KPIs, the most recent comparable prices, then movers/comparison. Do not use “live” framing or invented metrics if no current verified observations exist.

### Tables

`MarketWatchTable` has captions, scopes, sort-state attributes, right-aligned figures, sticky headers and a `MarketWatchCards` alternative. Other price/admin/report tables generally scroll inside `overflow-x-auto` containers with minimum widths. Preserve all provenance/units/status fields. Test scroll affordance, sticky headers, focus visibility and mobile access; do not collapse the price into a naked number.

### Charts

Recharts is used in price and operational charts; `ResponsiveContainer` is present, with intentional empty states. Price history distinguishes observed range and median; `PeriodRangeChart` avoids falsely calling a range a candlestick. Remaining audit work: small ticks, legend/touch-target verification, multi-series contrast/shape distinction, stable unique IDs, accessible nonvisual data summary and tested no-data states.

### Forms and interaction

Most public filters are GET forms, which is shareable and resilient. Admin/agent components have local state and explicit validation patterns. Global `focus-visible` exists but its color is not surface-aware. Verify every control's focus, active, disabled, loading, error and success states; avoid treating hover as the only affordance. Confirm touch sizes and safe-area behavior in browser.

## Performance and frontend architecture

- Server-first App Router composition is appropriate for database-backed pages. Client code is concentrated in interactions, charts, and the distinct operator shells.
- `src/app/(site)/layout.tsx` resolves profile and terminal summary for every request, and individual pages query their own data. Because page/layout dynamic behavior is not benchmarked here, treat repeated data resolution as a performance **risk to measure**, not a proven latency defect.
- `next.config.ts` configures responsive image sizes and AVIF/WebP; `HatsiImage` centralizes the image registry. `next/font` avoids runtime third-party font requests after build.
- Recharts is the main substantial visual dependency. Profile real route payloads, hydration and chart render time before reducing it.
- Global CSS is a 1,121-line token/base/component stylesheet, not evidence by itself of harmful CSS bloat. Keep semantic tokens and reduce literal values outside the token/chart layer.
- Static repository lint reports **10 errors and 33 warnings** under the inspected ESLint configuration. Errors are React hook purity/effect/ref diagnostics in 8 existing files: AdminShell, AgentShell, CollectionFlow, CollectionSession (2), CommodityPriceView, DataCoverageNotice, HatsiBootRecovery and `use-field-queue`. This audit does not fix them; audit the specific findings in the relevant implementation stage.

## Severity summary

- **P0:** none confirmed from this audit.
- **P1:** UX-01 through UX-06: dark-surface focus visibility; skip-link target; actual muted-text contrast; modal focus management; fixed-bar clearance/safe area; essential text-size floor.
- **P2:** UX-07 through UX-13: shell/page-family consistency, orphan header, operator glyphs, table mobile affordance, chart system, touch sizes, navigation behavior.
- **P3:** UX-14 and UX-15: literal chart colors and carefully scoped inline styles.

## Next action

Review and approve the proposed tokens and P1 findings before any implementation. The next authorized work should first produce screenshots and fresh viewport evidence at all eight requested sizes, then fix focus/landmarks/modal/safe-area issues, then establish page-family contracts, and only then redesign the dashboard and data surfaces.

## Source references

`src/app/globals.css`; `src/lib/brand.ts`; `src/lib/chart-colours.ts`; `src/app/layout.tsx`; `src/app/(site)/layout.tsx`; `src/app/(portal)/layout.tsx`; `src/app/admin/layout.tsx`; `src/app/agent/layout.tsx`; `src/components/terminal/TerminalShell.tsx`; `src/components/terminal/MobileNavigation.tsx`; `src/components/market/MarketWatchTable.tsx`; `src/components/data/PriceChart.tsx`; `src/components/charts/PeriodRangeChart.tsx`; `src/components/ops/Charts.tsx`; `src/components/admin/AdminShell.tsx`; `src/components/agent/AgentShell.tsx`; `src/components/site/SiteHeader.tsx`; `next.config.ts`; `scripts/check-responsive.mjs`; `tests/design-system/`; `tests/ux/`; `docs/design-system/hatsi360-markets/`.
