# Hatsi360 Markets — W0 forensic website audit

**Status:** W0 findings documented; production-source and production-database identity still unverified.  
**Audit date:** 2026-10-22 (Africa/Lagos; system date used for age/future-date checks).  
**Scope:** Read-only source review, live public-site spot checks, read-only Supabase inspection of the workspace-configured project candidate, and audit documentation only. No application code, data, schema, secrets, deployments or settings were changed in this W0 pass.

## 1. Executive summary

The workspace is a production-oriented Hatsi360 Markets App Router application, not a greenfield site. It has public market discovery and price pages, statistical services, API routes, Supabase-backed auth/RLS, operational agent/admin areas, and a legacy-fixture fallback. The working tree already contains a large, pre-existing transformation: 625 staged files changed, with additional unstaged and untracked changes. Those changes predate this W0 audit and were not created by this task. The current workspace therefore cannot be treated as a clean representation of the deployed release.

The live site is reachable at `https://hatsi360-app.vercel.app`. Read-only rendering checks show it advertises a market-data product, but the live content and the current workspace source do not match in important areas. The live homepage repeats data blocks, reports several conflicting counts, claims “real-time” and “Live” while marking its own data stale, and appears to display prices dated after the audit date. The public price directory reports 100 published observations while the homepage and market directory report 259. A live commodity-detail route returned an application error. These are release-blocking data-trust and route-reliability findings until reconciled.

The workspace contains strong countervailing foundations: a shared `DataSource` abstraction; public reads intended to go through `published_price_observations`; compatibility checks for commodity, grade, price type, currency, unit and variety; shared movement, coverage, freshness, and comparison services; server-side auth guards; and database RLS policies. Those are source-level design facts, not proof that the deployed build uses this source or that the configured Supabase project is production.

The checked-out Git remote is the requested repository (`baiitax/Hatsi360_V2`). The `.env.local` Supabase URL host matches a project visible to the connected Supabase account (`umxzsdepbrenqysabtlt`), but neither that fact nor connector access proves that it is the production database. Its migration ledger differs substantially from the repository migration chain. Vercel project listing was denied by the connected account, so the deployed commit, project settings and build logs could not be tied back to the workspace.

**Recommendation:** finish W0 by confirming the production Vercel project/deployed commit and the intended Supabase project/ledger with the owner. Then reconcile live public data/counts/date behaviour against that exact release. Do not start W1 metric changes or W2–W7 implementation until these facts are approved. No W1 or redesign work was performed here.

## 2. Confirmed technology stack

| Area | Confirmed from repository |
|---|---|
| Web framework | Next.js 16.4.2, App Router, server components and route handlers. |
| UI/runtime | React 19.3.1; TypeScript 5.9.3, strict mode. |
| Styling | Tailwind CSS 4.3.3 through `@tailwindcss/postcss`; project CSS/design tokens in `src/app/globals.css`. |
| Charts | Recharts 3.10.1 plus custom SVG-based chart components. |
| Backend | Supabase PostgreSQL, Auth, `@supabase/ssr` and `@supabase/supabase-js`; Zod 4 validation. |
| Tests/tooling | Vitest 5, Testing Library, Playwright dependency, ESLint 9 flat config. Browser executable availability was not re-tested in this W0 pass. |
| Deployment | The public domain is served by Vercel. Vercel project metadata access from the connected account was denied. |
| Package runtime | `package.json` declares Node.js `>=22`. |

## 3. Existing architecture at a glance

- `src/app/(site)` owns the public-facing site; `(portal)` owns login/registration/reset pages; `(commodity-profile)` owns a commodity profile route. Admin and field-agent applications live under `/admin` and `/agent` and are outside the public-site transformation scope.
- `src/lib/data/source.ts` defines a shared contract. `getDataSource()` chooses Supabase when the required public URL and publishable key are present; otherwise it silently chooses the legacy fixture adapter. This fallback needs an explicit production guard/visibility check so a misconfigured deployment cannot accidentally present fixture records as current public data.
- `src/lib/data/supabase.ts` reads public observations from `published_price_observations`; operational code reads restricted records from `price_observations` through server-side clients and policies.
- `src/lib/market/` centralises overview, watch, movements, comparison, activity, coverage and search. `src/lib/trade/` provides series compatibility, historical queries, freshness and opportunities. `src/lib/pricing.ts` contains compatibility and freshness helpers.
- `src/lib/supabase/server.ts` uses request cookies and the publishable key. `src/lib/supabase/admin.ts` is marked `server-only` and creates a service-role client for exceptional privileged tasks. Route guards in `src/lib/auth/guards.ts` enforce role checks server-side; RLS is intended to remain authoritative.
- `src/app/api/v1` exposes public API routes and `src/lib/api/handler.ts` centralises validation/auth/rate limit/error handling. The sitemap is generated from current markets and commodities; `/coverage` rewrites internally to `/coverage-report`.
- `next.config.ts` adds security headers, image optimisation, legacy redirects and route rewrites. `src/proxy.ts` refreshes Supabase auth and handles configured canonical-host redirects.

## 4. Confirmed live-site findings (observed, not assumed)

Live checks fetched the homepage, `/prices`, `/markets`, `/markets/gusau-central-market`, `/commodities/groundnut`, `/compare`, `/pricing`, `/methodology`, `/contact`, `/api-docs`, `/api/v1/prices/latest?limit=1`, `/coverage`, and `/solutions`.

### High priority — data integrity and release identity

1. **Conflicting public observation totals.** Homepage and market directory say 259; the price directory says 100. Read-only counts in the workspace-configured Supabase candidate were 321 rows in `price_observations` and 259 in `published_price_observations`. This is consistent with 259 being the published-view count, but does not explain the live price-directory 100 or prove that candidate DB is production.
2. **“Real-Time” / “Live” overstates the observed freshness.** Homepage copy labels trends and performance “Live” and advertises real-time updates. It also says “Updated 11d ago”; coverage says 0 fresh and 16 stale; market rows were marked stale. Live page content at fetch time therefore contradicts its real-time claims.
3. **Future-dated observations and API clock.** The environment date for this audit is 2026-10-22. Public pages and API output contained collections through 2026-11-14, a submitted record through 2026-11-22 in the candidate DB, and API `generatedAt` of 2026-11-24. These are future relative to the audit date. Verify application, database and deployment clocks plus whether the rows are synthetic/test data before treating these as real observations. Do not make claims about real-world market values based on these records until resolved.
4. **Duplicate/overlapping homepage content.** The live homepage extraction repeats the same ten-price strip multiple times, then renders Price Trends, Recorded Products, Agro Commodity Performance, Performance Leaderboard, Market Insights, Market Summary, Market Analytics, Live Market Prices, Follow the Prices and Trends, Market Watch, Market Movers, Platform Coverage and more. Many sections repeat the same facts, and “Live Market Prices” is followed by a separate watch table.
5. **Current source and live page diverge.** Workspace `src/app/(site)/page.tsx` uses shared market services and a terminal-style homepage, while live HTML contains section names and copy not found in that page source. This indicates that the deployed version cannot yet be matched to the current worktree; Vercel project permissions/deployment commit were unavailable.
6. **Public commodity detail failure.** The live `/commodities/groundnut` request returned a generic application error rather than a commodity profile. Other routes may also fail intermittently; run a complete route smoke test against the confirmed production deployment.
7. **API host/canonical mismatch.** `/api-docs` shows a preview-looking `*.vercel.app` base URL rather than the canonical public host. The live API endpoint did return JSON, but returned the future `generatedAt` timestamp noted above. Confirm that docs use the production base URL and that response data is the same release/source as the website.

### Medium priority — user comprehension and trust

8. The homepage simultaneously displays configured-market and reporting-market concepts, but the live market directory headline “11 markets across 11 states” can be read as active coverage while 10 markets report and one has no data.
9. Observed homepage price lists repeat commodity prices with a reported bag unit, while trend/leaderboard areas use generic “per unit” and commodity-level change percentages. Verify those widgets apply identical grade/unit/price-type/market/period rules before showing a single movement as market-wide.
10. At least one commodity comparison offers a cross-market interface; source code has a comparability layer, but browser/API parity and all filter combinations were not exhaustively tested.
11. Methodology and pricing pages are relatively candid about verification, publication, units, proposed commercial tiers and payment status. Preserve this clear language. Contact uses a form and no physical/telephone contact details were visible in the sampled page; official business details still require owner verification.
12. Live market-detail page showed a useful “representative image” disclaimer, explicit unit/price type/timestamps, and stale markers. However, its chart axes start at zero even when the price range is much narrower; this may visually exaggerate apparent emptiness/variation and should be reviewed with context and accessible chart alternatives.

## 5. Read-only database and deployment inspection

### Supabase

- The local `.env.local` Supabase URL host matches `umxzsdepbrenqysabtlt.supabase.co`; its value/key secrets were not printed or read.
- The connected Supabase account listed that project as active/healthy. A read-only inspection found 22 commodities, 11 markets, 321 observations, 259 rows in `published_price_observations`, 0 articles, and 15 buyer offers plus 15 seller offers. These are **candidate-project counts only**, not confirmed production counts.
- Candidate migration history reported versions `0001`–`0004` plus timestamped migrations `20261114152034` and `20261114152829`. The repository has a numbered migration chain through `0032_daily_market_reporting.sql`; this is a material history/schema mismatch. Do not apply, reset, repair, or infer a production migration target from this audit.
- RLS is enabled on the inspected `price_observations`, `commodities`, `markets`, `buyer_offers` and `seller_offers` tables. The candidate's raw observation policy includes agent ownership/assignment and staff checks; public observation access is conditioned by `is_public_observation(...)`. Buyer/seller offers have separate owner, staff and consent/verified public policies. This is policy-definition inspection only, not a role-based adversarial RLS test. The published view was observed as a view; whether it is security-invoker and its exact definition must be checked against the confirmed production target.
- A preliminary grouped query failed because an enum was coalesced with text; it was corrected to cast enum columns to text. No data was changed.

### Vercel

- The live canonical site was readable over HTTP.
- Vercel project-list access returned “Access denied”; no project ID, Git integration, deployment commit, deployment status, environment variable list or build log could be verified. Do not deploy or alter settings.

## 6. Security and performance concerns to validate

- **Good source-level controls:** server-only service-role wrapper; request-bound Supabase client; role-based server guards; public observations queried through a publication view; RLS described as the final authorization layer; API request validation and rate-limit/auth wrapper; service-role secrets not exposed in client source in reviewed files.
- **Open security checks:** confirm deployment environment variable separation and production host; inspect the actual production view definition and grants; test RLS using anon, ordinary user, agent, verifier and admin JWTs; audit public API response schemas for private fields; exercise contact spam/rate limiting; check source maps and client bundles in the deployed artifact. These were not performed.
- **Performance risk in source:** homepage is `force-dynamic`; `getMarketOverview()` and related calculations load the entire public observation set for distinct market/commodity counts. `getPriceMovements()` loops through commodities and calls the unpaginated analysis method per commodity, creating an N+1 query pattern. Directory pages also do a full analysis read for counts and date coverage alongside paginated results. This may be acceptable at current volume but needs query-plan/volume review before scale; do not add caching until publication invalidation and freshness semantics are clear.
- **Performance/SEO checks:** sitemap says price directory hourly but several pages are dynamic; API routes are marked no-store; verify production cache headers, canonical metadata, structured data, robots exclusions and mobile Core Web Vitals using the actual deployment. No browser-based audit was run in this turn.
- **Systematic claims risk:** insights/solutions and homepage contain movement, coverage and operational capability claims. Trace each to the deployed data service, reporting period and sufficient sample sizes before calling those claims live.

## 7. Existing UI/component inventory summary

The full grouped inventory is in `WEBSITE_COMPONENT_INVENTORY.md`. Important families include:

- Public shell and navigation: `TerminalShell`, `MobileNavigation`, `SiteFooter`, `GlobalSearch`.
- Legacy/alternate site navigation: `SiteHeader`, `site/navigation.tsx` (confirm usage; source describes `SiteHeader` as unused in earlier audit docs).
- Price/data display: `PriceDisplay`, `PriceTable`, `PriceChart`, `CommodityPriceView`, `DataCoverageNotice`, `Cards`.
- Market analytics: `MarketOverview`, `MarketWatchTable`, `ChartFrame`, `PeriodRangeChart`, `CandleChart`, market/trade data services.
- Feedback/forms: `TerminalFeedback`, `ContactForm`, auth forms, data/empty/loading/error primitives.
- Brand/media/marketing: `Logo`, `HatsiImage`, `HeroPanel`, marketing sections, category glyph and JSON-LD components.
- Separate internal apps: `AdminShell` and administration controls; `AgentShell`, collection and field controls; portal/auth layouts. These are explicitly outside this public-website project scope and must not be altered under W0.

## 8. Recommended implementation approach

1. Keep this pass documentation-only. Do not make another homepage or design-system implementation before release identity is established.
2. Owner confirms the Vercel project/deployment and Supabase production project, and states which existing local changes are approved. Save the exact deployment commit and migration ledger as evidence.
3. Compare deployed source/build and current working tree. The worktree has hundreds of staged changes and cannot be safely attributed without an explicit baseline/branch decision.
4. Reproduce the live route/count/date observations against the confirmed deployment, and reconcile the public view, counts, page totals and API payload. Record all figures with a single as-of time and one shared metric definition.
5. Close W0 by approving route/source/architecture inventories and prioritised findings. Only then begin W1 (specifications, data validation and central calculations). Keep W2–W7 blocked until their phase dependencies and acceptance gates are met.

## 9. W0 completion and outstanding issues

- [x] Repository framework, package/config and route layout inspected.
- [x] Public route inventory drafted from actual App Router files.
- [x] Data-source architecture and primary component families documented.
- [x] Live public-site spot checks completed and factual discrepancies recorded.
- [x] Read-only candidate Supabase schema/count/migration/RLS metadata inspected.
- [ ] Production Supabase identity and migration target approved.
- [ ] Vercel project and deployed Git commit identified (connector access denied).
- [ ] Full public-route browser smoke test and responsive/accessibility inspection completed.
- [ ] User/product owner approves W0 findings and W1 scope.

**W0 status:** Findings/docs complete for the evidence available; phase exit gate remains **blocked** on production target and deployed-commit confirmation, plus approval. W1 has not started.
