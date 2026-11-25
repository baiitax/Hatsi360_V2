# Hatsi360 Markets — Component Inventory and Architecture Audit

**Audit-only inventory.** Count: 72 files under `src/components/` at inspection. No component or application code was modified.

## Frontend architecture snapshot

| Layer | Current implementation |
|---|---|
| Framework | Next.js App Router 16.4.2; route groups for site, access portal, admin and agent. |
| UI runtime | React 19.3.1, TypeScript 5.9.3; server-first pages/layouts with isolated client interactivity. |
| Styling | Tailwind CSS 4.3.3 via `@import 'tailwindcss'` and `@theme` in `src/app/globals.css`; global base/components CSS, utility classes in pages, inline styles in chart/SVG contexts. |
| Brand/theme | CSS variables and `src/lib/brand.ts`; dark `.terminal`, light `.editorial`/legacy light site, global light root. No user theme toggle found. |
| Charts | Recharts 3.10.1 plus a custom period range chart and a custom trade candle-shaped/range visualization. |
| Icons | Custom SVG registry in `src/components/ui/icons.tsx` for shared public interface; Unicode/symbol icon strings remain in admin and agent navigation. No icon dependency. |
| Forms and primitives | Project-owned controls, `PageHero`, TerminalShell, data display, overlays and operator-specific forms. No third-party component framework. |
| Images/fonts | `HatsiImage` and a registry; Next Image configuration; Inter and Manrope via `next/font`. |
| Testing evidence | `tests/design-system`, `tests/ux`, loading tests and responsive Playwright script. Fresh browser run unavailable in this audit. |

## Component files by family

### Admin · 9 files
`admin/AdminShell.tsx` (role-aware shell/sidebar/header); `AgentManagement.tsx`; `JobControls.tsx`; `NotificationControls.tsx`; `QualityControls.tsx`; `ReportRunner.tsx`; `ScheduleControls.tsx`; `SettingsEditor.tsx`; `VerificationActions.tsx`.

### Agent / field app · 10 files
`agent/AgentShell.tsx`; `CollectionFlow.tsx`; `CollectionSession.tsx`; `CorrectionForm.tsx`; `EvidencePanel.tsx`; `FieldUi.tsx`; `NewCollectionForm.tsx`; `NotificationList.tsx`; `ProfileForm.tsx`; `TaskControls.tsx`. (10 files; shell plus nine task/form modules.)

### Brand, charts, data and feedback
- Brand: `brand/Logo.tsx`.
- Charts: `charts/ChartFrame.tsx`, `charts/PeriodRangeChart.tsx`.
- Data: `data/Cards.tsx`, `CommodityPriceView.tsx`, `DataCoverageNotice.tsx`, `HeroCarousel.tsx`, `PriceChart.tsx`, `PriceTable.tsx`.
- Feedback: `feedback/TerminalFeedback.tsx`.

### Forms, loading, market and marketing
- Forms: `forms/AuthForms.tsx`, `CentralSignInForm.tsx`, `ContactForm.tsx`, `CopyButton.tsx`, `DemoAccountsPanel.tsx`.
- Loading: `loading/HatsiActionLoader.tsx`, `HatsiBootRecovery.tsx`, `HatsiBootSignal.tsx`, `HatsiErrorRecovery.tsx`, `HatsiGlobalPreloader.tsx`, `HatsiLoadingIndicator.tsx`, `HatsiLoadingProvider.tsx`, `HatsiSkeletons.tsx`.
- Market: `market/GlobalSearch.tsx`, `MarketOverview.tsx`, `MarketWatchTable.tsx`, `PriceDisplay.tsx`.
- Marketing: `marketing/CategoryGlyph.tsx`, `HeroPanel.tsx`, `StructuredData.tsx`, `home-sections.tsx`, `sections.tsx`.
- Media: `media/HatsiImage.tsx`.

### Operations, site, terminal, trade and UI
- Ops: `ops/Charts.tsx`, `DataTable.tsx`, `KpiCard.tsx`, `Primitives.tsx`.
- Site: `site/BareFrame.tsx`, `PortalFrame.tsx`, `SignOutButton.tsx`, `SiteFooter.tsx`, `SiteHeader.tsx`, `navigation.tsx`.
- Terminal: `terminal/MobileNavigation.tsx`, `TerminalShell.tsx`.
- Trade: `trade/CandleChart.tsx`, `Primitives.tsx`.
- UI: `ui/PageHero.tsx`, `data-display.tsx`, `icons.tsx`, `index.tsx`, `overlays.tsx`, `primitives.tsx`.

> The counts above are for inventory navigation; the component directory totals 72 files. Components within one file are not counted separately.

## Shared component contracts observed

| Family | Current components | Strengths | Audit follow-up |
|---|---|---|---|
| Shell/page structure | `TerminalShell`, `PageContainer`, `PageHeader`, `SectionHeader`, `PageHero`, `PortalFrame`, `AdminShell`, `AgentShell` | Clear role/surface separation; server shell with isolated client pieces. | Define page-family API and resolve `SiteHeader` legacy duplicate; ensure skip target in each shell. |
| Data display | `PriceDisplay`, `PriceMovementIndicator`, `MarketOverview`, `MarketWatchTable`, `MarketWatchCards`, `PriceTable`, badges | Domain-specific honesty, units, freshness, verification; table/cardless responsive pair. | Contrast per real background; minimum sizes; verify all price listings and row states. |
| Search/forms | `GlobalSearch`, `SearchInput`, legacy `SearchBar`, GET filter forms, `AuthForms`, field `CollectionFlow` | Native form semantics and URL-based filters; centralized field workflow. | Search contracts overlap; focus/error/success state audit; 30px vs 44px targets. |
| Feedback | `TerminalFeedback`, `HatsiSkeletons`, error recovery, boot recovery, action loader | Loading, empty, error and offline states have dedicated components. | Check duplicate global/route-level loader and boot curtain sequencing, reduced motion and perceived wait. |
| Charts | `PriceChart`, `PeriodRangeChart`, `ops/Charts`, `trade/CandleChart`, `ChartFrame` | Responsive containers; chart context and empty states; avoids unsupported candlestick semantics in period range. | Chart palette tokenization, tick minimum, accessible alternative and multi-instance IDs. |
| Overlays | `ui/overlays.tsx`, terminal drawer, admin mobile nav | Shared overlay primitives exist; drawer locks body scroll and closes on Escape. | Terminal dialog focus lifecycle is not evident; compare duplicated overlay behavior and standardize. |
| Icons | `ui/icons.tsx`, `IconArrow…`, symbol strings in `operations/navigation.ts` and agent NAV | No dependency; public icon geometry is centralized. | Replace string glyphs only after approved visual system; maintain role semantics and accessible names. |

## Duplication, coupling and unused/legacy evidence

1. **`SiteHeader` is an orphaned competing shell.** Repository search finds no import of `src/components/site/SiteHeader.tsx`; live public shell is `TerminalHeader` in `TerminalShell.tsx`. The old file imports old `site/navigation.tsx`; its `MainNavigation` invocation is explicitly `hidden`. `NotificationCenter` in that navigation module is still used by admin and field shells, so remove/retire only after splitting shared behavior and verifying usages.
2. **Two page-header/container idioms.** `PageHero` (light marketing header, 30–48px H1, `container-page`) coexists with terminal `PageHeader` (20–22px, `PageContainer`). This can be intentional for editorial/marketing vs terminal, but the route-to-family mapping is not enforced by type or test.
3. **Two card/surface idioms.** Legacy `.card`/`.card-hover` (white, shadow, 14px radius) and `.terminal-panel` (dark fill, 10px terminal radius, border-first) coexist. A third light `.editorial-panel` exists. These should be page-family roles, not arbitrary page-local choices.
4. **Site navigation duplication is partially intentional.** `MARKET_NAV` (six work modules) and `PRIMARY_NAV`/secondary site index serve different information needs; keep both only if destination parity and labels are tested. Mobile bottom bar duplicates common destinations from the full drawer by design.
5. **`PriceTable` vs `MarketWatchTable`** serve separate data contracts but need a shared row/typography/scroll contract rather than merged behavior.
6. **`ops/Primitives` and `ui/primitives`** appear to serve separate product surfaces. Inspect exports/consumers before consolidation; don't make a large shared abstraction based only on name overlap.
7. **Colors:** 19 raw hex occurrences were found outside `globals.css` and `brand.ts` (14 distinct strings); some are chart-specific literal colors in `trade/CandleChart.tsx`. This is low volume, not a broad raw-color sprawl, but it weakens the chart-token claim.
8. **Inline styles:** 28 `style={{` occurrences in `src` at scan time, mostly chart dimensions/coordinates and Recharts tooltips; not enough evidence to call this CSS bloat. Benchmark before refactoring.

## Architecture recommendations

- Keep domain components (price, freshness, source attribution, observation rows) composable but centralize surface variants (`terminal`, `editorial`, `operator`, `portal`) in a small documented contract.
- Ensure that every component's contrast tokens are surface-aware; use a typed `Surface` variant for reusable links, controls, badges and focus outlines.
- Give modal/drawer primitives one tested focus lifecycle API rather than recreating it in each shell.
- Establish data table building blocks around semantic headers, row density, sort, pagination, scroll cue and a mobile card/detail option. Do not remove essential data to fit.
- Keep operational/field interfaces role-specific: operator workflows need large task controls and resilient states, not a forced terminal table layout.
- Add route-component ownership and deprecation tests before deleting the orphan SiteHeader or any legacy page family.

## Change-control note

This file is an inventory/recommendation only. No component, style, source, database, configuration, dependency or runtime setting was modified for Phase 0.
