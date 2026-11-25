# Hatsi360 Markets — website component inventory (W0)

**Source reviewed:** `src/components/`, `src/app/` and shared libraries. This is a functional grouping of current files, not a claim that every component is used by the current Vercel deployment. The live homepage and workspace homepage do not match, and Vercel project access was denied.

## Public shell and navigation

| Component/files | Responsibility | W0 note |
|---|---|---|
| `src/components/terminal/TerminalShell.tsx` | Public header, desktop nav, page container/header/section primitives and terminal-style shell. | Current local public shell; current live source identity unconfirmed. |
| `src/components/terminal/MobileNavigation.tsx` | Public mobile drawer and bottom navigation. | Existing responsive implementation; keyboard/focus behavior needs browser validation. |
| `src/components/site/SiteHeader.tsx` | Alternate/older public header. | Earlier audit notes report no live imports. Confirm before deprecation/removal. |
| `src/components/site/navigation.tsx` | Primary/secondary navigation helpers. | Shared nav data sits in `src/lib/brand.ts`; check which implementation owns live UI. |
| `src/components/site/SiteFooter.tsx` | Public footer and legal/product links. | Verify all destinations and official contact details. |
| `src/components/site/BareFrame.tsx`, `PortalFrame.tsx`, `SignOutButton.tsx` | Minimal and access portal shells. | Shared infrastructure across auth pages. |

## Market, price and commodity UI

| Component/files | Responsibility | Data/service relationship |
|---|---|---|
| `src/components/market/GlobalSearch.tsx` | Search entry point. | Uses API/search service; check result parity with directory filters. |
| `src/components/market/MarketOverview.tsx` | Market summary widgets. | Should consume central overview/coverage service. |
| `src/components/market/MarketWatchTable.tsx` | Price watch table and small-screen card view. | Shared market watch rows; ensure units/status stay consistent at mobile breakpoints. |
| `src/components/market/PriceDisplay.tsx` | Price amount and unit display. | Central formatting component. |
| `src/components/data/PriceTable.tsx` | Price/market comparison tables. | Check sorting, URL filters, pagination and mobile layout. |
| `src/components/data/Cards.tsx` | Market and commodity cards. | Shared directory components. |
| `src/components/data/CommodityPriceView.tsx` | Commodity detail view and market-specific price display. | Used with observation/series services; a live commodity route errored. |
| `src/components/data/DataCoverageNotice.tsx` | Age/freshness and data coverage messaging. | Must use recorded timestamps and approved threshold; no static “live” claim. |
| `src/components/data/PriceChart.tsx` | Historical price chart. | Verify series compatibility, axis domain, dates, empty state and text alternative. |
| `src/components/data/HeroCarousel.tsx` | Hero or featured observation carousel. | Ensure repeated content does not appear as an accidental duplicated page block. |
| `src/components/ui/PageHero.tsx` | Editorial header/hero layout. | Public pages use alongside terminal shell primitives; document page-family contract. |

## Chart and trade visualisation

| Component/files | Responsibility | W0 note |
|---|---|---|
| `src/components/charts/ChartFrame.tsx` | Chart framing, title/context/accessibility wrapper. | Use to standardise period, unit, source and sample context. |
| `src/components/charts/PeriodRangeChart.tsx` | Historical range/trend visualisation. | Inspect actual production output; missing records must remain gaps. |
| `src/components/trade/CandleChart.tsx` | OHLC/candle-like trade visualization. | It explicitly has an empty state when candle data is absent; confirm input provenance and adequate OHLC data. |
| `src/components/trade/Primitives.tsx` | Trade module controls and primitives. | Keep trade as intelligence, not transaction execution. |
| `src/components/trade/PaidIntelligenceGate.tsx` | Paid feature/access state. | Must not claim inactive features are operational. |

## Brand, media, marketing and structured data

| Component/files | Responsibility | W0 note |
|---|---|---|
| `src/components/brand/Logo.tsx` | Hatsi360 brand mark/lockup. | Source asset, sizing and alt text should remain consistent. |
| `src/components/media/HatsiImage.tsx` | Approved image registry and responsive image rendering. | Live Gusau page labelled representative imagery; keep that disclosure. |
| `src/components/marketing/HeroPanel.tsx` | Hero/market proposition. | Older homepage component; confirm usage in the current route. |
| `src/components/marketing/home-sections.tsx`, `sections.tsx` | Home, category, business and value-proposition sections. | Check for duplicate sections and stale claims. |
| `src/components/marketing/CategoryGlyph.tsx` | Commodity/category visual identifiers. | Prefer accessible names and avoid implying data where none exists. |
| `src/components/marketing/StructuredData.tsx` | JSON-LD schemas. | Validate the deployed output against real route and data content. |

## Forms, status and operational UI

| Component/files | Responsibility | Scope |
|---|---|---|
| `src/components/forms/ContactForm.tsx` | Public business contact form. | Public scope; server validation, spam controls and privacy handling require test. |
| `AuthForms.tsx`, `CentralSignInForm.tsx`, `DemoAccountsPanel.tsx` | Portal auth and demo account UI. | Account infrastructure, not general public website redesign. |
| `src/components/feedback/TerminalFeedback.tsx` | Error, empty-state, provenance and status messaging. | Reuse for truthful no-data/failure communication. |
| `src/components/ui/` | Primitives, overlays, icons, data-display and common UI exports. | Inspect for overlap with terminal/page-level design conventions. |
| `src/components/loading/` | Boot, action, skeleton and global loading states. | Verify CLS, reduced motion and browser behavior later. |

## Separate application surfaces (explicitly out of this scope)

- `src/components/admin/*`, `src/components/ops/*`, and `src/app/admin/*`: administrator/operations tools.
- `src/components/agent/*`, `src/app/agent/*`: field-agent collection, queue, reporting and verification support.
- Do not refactor these as a side effect of W0–W7 public-site work. Reuse only when explicitly approved and avoid changing business workflows.

## Central non-component services (important dependencies)

- `src/lib/data/source.ts`, `fixture.ts`, `supabase.ts`: shared source contract and adapters.
- `src/lib/market/{overview,watch,movements,comparison,activity,coverage,search}.ts`: public market service layer.
- `src/lib/trade/{series,queries,freshness,opportunities}.ts`: comparability and analytics.
- `src/lib/pricing.ts`: lower-level price/unit/freshness rules.
- `src/lib/market/freshness.ts`: freshness status.
- `src/lib/images/registry.ts`: approved local image registry.

## W0 component decisions

1. Do not create replacement cards/tables/charts until live deployment alignment is known.
2. Choose one approved public shell per page family; retain separate operational/admin visual systems.
3. Consolidate public metric labels and empty/error states around shared domain services.
4. Validate every chart/tables mobile variant and accessible alternative in the browser in W7.
5. Decide whether `SiteHeader` and legacy marketing sections are still used only after route import analysis and the deployed commit are confirmed.
