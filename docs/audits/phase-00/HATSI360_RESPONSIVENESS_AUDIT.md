# Hatsi360 Markets — Responsiveness Audit

**Audit-only; source inspection and HTTP smoke checks. No browser viewport was freshly rendered.**

## Evidence and limitation

The installed Playwright package cannot launch because its Chromium headless-shell binary is absent. Installing/downloading it is outside the audit-only rules. Therefore **none of the eight requested viewport rows below is marked visually verified**; no screenshots are claimed or attached.

Static evidence inspected: Tailwind breakpoints used in source (`sm`, `md`, `lg`, `xl`; no `2xl` utilities found), `src/components/terminal/MobileNavigation.tsx`, `TerminalShell.tsx`, `MarketWatchTable.tsx`, `AdminShell.tsx`, `AgentShell.tsx`, tables/charts and the project’s `scripts/check-responsive.mjs`.

The existing script is configured for 7 routes × 8 viewport widths (360×800, 390×844, 430×932, 768×1024, 1024×768, 1280×800, 1366×768, 1440×900); its previous report records 56 passes after two fixes. It does not cover the requested 320×568, 375×812 or 1920×1080; it also reports only document overflow, main text and nav visibility, not target size, focus, modal clipping, table usability, line length, chart labels or safe-area interaction. These historical records are not a substitute for current revalidation.

## Viewport-by-viewport static risk review

| Requested viewport | Source-derived layout behavior | Risks to inspect in browser | Current status |
|---|---|---|---|
| **320 × 568** | Mobile terminal: desktop module nav hidden (<1024), drawer and fixed four-item bottom bar; page content full width with `px-3`; tables mostly become internal scrollers or cards. | Narrowest header/search/actions; 9px bottom-nav labels; fixed bottom bar vs `main.pb-10`; safe-area inset; dialogs at only 568px height; long commodity and market names. | **Not viewport verified.** Highest-priority check. |
| **375 × 812** | Same mobile mode; `sm` (640px) does not activate. | Category/filter wrapping, 30px terminal controls, 46rem table scrollers, visible indication that content scrolls horizontally, bottom nav obstruction. | **Not viewport verified.** |
| **430 × 932** | Same mobile mode; more room for cards and drawer. | Check chart ticks/legend; drawer height/scroll; long CTA wrap; price cards preserve unit, market, freshness and verification. | **Not viewport verified.** Existing historical test uses 430×932 but cannot be reproduced here. |
| **768 × 1024** | `md` activates: homepage desktop watch table is shown at `md` while mobile `MarketWatchCards` hides; desktop module nav remains hidden until `lg`; mobile drawer/bottom bar remain. | Table can become a horizontally scrolling desktop table at tablet width rather than cards; verify this tradeoff with real content, keyboard/trackpad and touch. | **Not viewport verified.** Historical script includes this viewport. |
| **1024 × 1366** | `lg` activates: full terminal module navigation and desktop watch table; admin desktop sidebar becomes visible at `lg`; mobile nav hidden. | Six module labels, search, freshness strip and user controls may compete for width; dropdowns at trailing modules; ensure page—not only menus—does not overflow. | **Not viewport verified.** Historical check used 1024×768, not requested height. |
| **1280 × 720** | `xl` activates; terminal page max width 110rem (1760px), public legacy container max 80rem (1280px); several grids gain columns. | Short vertical height; fixed/sticky header reduces work area; charts/forms and first table rows may be pushed down; contrast between terminal-wide and editorial centered pages. | **Not viewport verified.** Historical check used 1280×800. |
| **1440 × 900** | Desktop terminal and full nav; terminal content can occupy wide canvas; editorial `.container-page` stays centered at 1280px. | Uneven content-width transition between page families; density and whitespace need consistent task-level judgment. | **Not viewport verified.** Historical script includes this viewport. |
| **1920 × 1080** | Terminal `PageContainer` max 1760px; editorial `container-page` max 1280px. | Large blank margins in editorial pages compared with full-width terminal; table columns may stretch too far unless capped; chart axes/labels should not expand without limit. | **Not viewport verified.** Not in existing responsive script. |

## Mobile-specific findings

1. **The shell has a mobile-specific model**, not merely a compressed desktop nav: compact header, right-side drawer, 4-item fixed bar. This is a strong direction to preserve.
2. **Primary watch table has a card variant**, but only the public home page uses the explicit table/cards switch. Other price/admin/report tables use horizontal scrolling. This is acceptable for data that requires columns, provided scroll affordance and column context are visible and touch-tested.
3. **Safe-area support is not present in source** (`env(safe-area-inset-bottom)` search found none). Both mobile bottom bars are fixed at `bottom-0`; confirm iOS home-indicator clearance.
4. **Terminal bottom clearance is suspicious by static dimensions**: bar is 3.25rem (52px), terminal main bottom padding is `pb-10` (40px). That leaves a potential 12px overlap before safe-area insets. This is not reported as a measured overlap.
5. **Minimum text**: mobile bar labels are 9px; terminal label class is 12px and micro is 10px. Verify at actual device pixel ratio and user zoom; redesign essential labels to 12px minimum.
6. **Touch target**: `.terminal-control` is 30px high. Agent nav item is at least 52px and uses a five-item grid. Check actual hit box and separation for every high-frequency mobile action.
7. **Drawer accessibility**: code handles Escape, scroll lock and backdrop close, but focus management is not evident; test tab, screen-reader, route change, return focus and low-height scroll.
8. **Forms**: GET search/filter forms are robust and bookmarkable. Browser testing must check native select/date pickers, keyboard focus, labels and date field width at 320px.
9. **Tables**: min-width wrappers seen between 28rem and 46rem. They remain structurally readable but can require horizontal gestures. Provide a shadow/gradient cue or accessible scroll hint, not a squeezed table.
10. **Charts**: Recharts uses `ResponsiveContainer`; source axis labels include 10–11px. Test x-axis collisions, legend wrapping, tooltip dismissal and alternatives at 320–430px.

## Tablet, laptop and large desktop

- The switch at 1024px between drawer/bottom navigation and full module nav is deliberate, but exact 1024px is the breakpoint boundary and must be tested on both sides (1023/1024).
- At 768px the homepage changes from mobile cards to the table because the code uses `md`; verify the table is genuinely more useful at 768px portrait, not merely technically visible.
- The two page containers have different maximum widths: `.container-page` 80rem and terminal `PageContainer` 110rem. This may be justified by long-form vs market data, but the transition should be a documented page-family rule.
- At 1280×720, fold height and sticky navigation matter more than grid count; measure useful price rows visible without scroll.
- At 1920px, cap prose and charts; do not let all 12 data columns stretch across the entire width.

## Required fresh browser run after approval

Use browser automation already specified by the repository, without changing the application:

1. Provide an approved Chromium environment and run `scripts/check-responsive.mjs` against the built app.
2. Extend run parameters to exactly: 320×568, 375×812, 430×932, 768×1024, 1024×1366, 1280×720, 1440×900, 1920×1080 (including 1px boundary tests 639/640, 767/768, 1023/1024, 1279/1280).
3. Capture full-page and first-viewport screenshots for representative routes: `/`, `/prices`, `/commodities`, `/charts`, `/compare`, `/insights`, `/admin/overview`, `/agent/home`, plus table and form states.
4. Record `documentElement.scrollWidth`, viewport width, visible content, element rectangles for fixed bars, bottom-most focusable control, all table scroll containers, chart SVG bounds, and drawer dialog bounds.
5. Test touch/keyboard focus and reduced motion; measure hit targets; test 200% zoom/reflow; verify forms and contrast in both surface environments.
6. Save screenshots and machine-readable results in the audit evidence folder; only then convert the static risks in this report into verified findings.
