# Hatsi360 Markets — public route inventory (W0)

**Source of truth:** App Router files in `src/app/(site)`, `src/app/(commodity-profile)`, `src/app/(portal)` and `src/app/api`.  
**Live spot checks:** As listed in `WEBSITE_AUDIT.md`; only selected public pages were fetched. “Not sampled” means no conclusion about live HTTP status, layout or runtime behaviour. This is an inventory, not an assertion that all features work.

## Public website pages

| Route | Purpose | Local implementation / source | Live W0 observation | SEO / data / priority |
|---|---|---|---|---|
| `/` | Brand proposition and discovery landing page | `(site)/page.tsx`; shared `src/lib/market/*` services | Live route responds, but rendered content differs materially from current local page source; duplicated strips, mixed counts and stale data with “real-time/Live” claims. | Dynamic public market data; metadata present in local source. P0. |
| `/prices` | Searchable published observation directory | `(site)/prices/page.tsx`; `DataSource` published view | Live says 100 published total and latest 14 Nov 2026; conflicting 259 elsewhere; observed date is future relative to audit date. | Query filters, pagination and Dataset JSON-LD in source. P0; count/date reconciliation. |
| `/prices/[commodity]` | Commodity-specific price observations | `(site)/prices/[commodity]/page.tsx` | Not sampled. Distinct from `/commodities/[slug]`. | Dynamic commodity + published observations; metadata generated. P0. |
| `/commodities` | Commodity catalogue and coverage | `(site)/commodities/page.tsx` | Not sampled. | Database catalogue, freshness/readiness; metadata present. P0. |
| `/commodities/[slug]` | Commodity profile | `(commodity-profile)/commodities/[slug]/page.tsx` | `/commodities/groundnut` returned a generic application error in live fetch. | Dynamic commodity/profile data; metadata generated. P0; route reliability. |
| `/markets` | Market directory | `(site)/markets/page.tsx` | Live says 11 registered, 10 with prices, 11 “active”; one market had no data. Headline may conflate registered with reporting. | Database markets/observations; Dataset JSON-LD. P0. |
| `/markets/[slug]` | Market profile, commodity observations and history | `(site)/markets/[slug]/page.tsx` | Gusau page returned 18 observations; all were marked stale. Content included a representative-image disclosure. | Market profile plus published observations. P1. |
| `/compare` | Compare observations for a commodity across markets | `(site)/compare/page.tsx` | Live page rendered cross-market median/ranges and counts for selected commodity. No exhaustive compatibility testing performed. | Shared market comparison service in local architecture; P1. |
| `/charts` | Historical time-series workspace | `(site)/charts/page.tsx` | Not sampled. | `src/lib/trade` series/freshness; metadata present. P1. |
| `/insights` | Research/brief directory | `(site)/insights/page.tsx` | Not sampled; local source uses editorial content and entitlement check. | Static articles/reports; metadata present. P1. |
| `/insights/[slug]` | Individual insight | `(site)/insights/[slug]/page.tsx` | Not sampled. | Content + access control; dynamic metadata. P1. |
| `/reports` | Market report directory | `(site)/reports/page.tsx` | Not sampled. | Static report catalogue and entitlement design; P1. |
| `/reports/[slug]` | Individual report | `(site)/reports/[slug]/page.tsx` | Not sampled. | Content + access control; dynamic metadata. P1. |
| `/coverage` | Coverage and freshness dashboard | Internal `(site)/coverage-report/page.tsx`, rewritten via `src/lib/route-map.ts` | Live says 10/11 reporting, 17/18 commodities observed, 0 fresh, 16 stale and 2 without data. | Public market/commodity counts and freshness; P1. |
| `/solutions` | Business audience/value proposition | `(site)/solutions/page.tsx` | Live shows segments and explicitly lists several price types as “not yet recorded”; however some opening copy asserts 259/17/10. | Database-backed presence plus static positioning; P1. |
| `/pricing` | Commercial status and plans | `(site)/pricing/page.tsx` | Live clearly marks paid tiers proposed, on-agreement, and no self-serve payment. | Mostly static product copy; metadata present. P1. |
| `/api-docs` | API access documentation | `(site)/api-docs/page.tsx` | Live page describes open endpoints and shows a preview-looking Vercel hostname as base URL; live latest-price endpoint returned JSON. | Endpoint docs; verify production base URL/auth claims. P2. |
| `/api-policy` | API usage policy | `(site)/api-policy/page.tsx` | Not sampled. | Static policy/metadata. P2. |
| `/methodology` | Data collection, publication and comparison methodology | `(site)/methodology/page.tsx` | Live presents a useful staged verification/publication chain, price types and unit rules. | Public methodology; metadata present. P0. |
| `/about` | Organisation and product context | `(site)/about/page.tsx` | Not sampled. | Static/content; P1. |
| `/contact` | Business enquiry | `(site)/contact/page.tsx` | Form fields rendered; official phone/address were not visible in the sampled page. Submission not tested. | Server action/API must be verified; metadata present. P1. |
| `/faq` | Frequently asked questions | `(site)/faq/page.tsx` | Not sampled. | Static content; metadata present. P2. |
| `/privacy` | Privacy notice | `(site)/privacy/page.tsx` | Not sampled. | Static legal content; metadata present. P0. |
| `/terms` | Terms of use | `(site)/terms/page.tsx` | Not sampled. | Static legal content; metadata present. P0. |
| `/disclaimer` | Market-data disclaimer | `(site)/disclaimer/page.tsx` | Not sampled. | Static legal content; metadata present. P0. |
| `/cookies` | Cookie information | `(site)/cookies/page.tsx` | Not sampled. | Static legal content; P2. |
| `/solutions` (business target) | Business services | Existing route above; no `/business` route found | Existing route is `/solutions`, not requested `/business`. | Do not duplicate without product approval. P1. |
| `/trends` | Dedicated trends experience | No route found | Not implemented as a distinct route; `/charts` and homepage trend areas serve related functions. | Target route is not in current tree. P1/backlog. |
| `/` + trade module | Trade intelligence discovery | `/trade` and child routes below | Not sampled. | Auth/entitlement protected portions; do not market as execution/exchange. P1/P2. |
| `/trade` | Trade intelligence overview | `(site)/trade/page.tsx` | Not sampled. | Dynamic/entitlement-aware; P1. |
| `/trade/terminal` | Trade terminal view | `(site)/trade/terminal/page.tsx` | Not sampled. | Dynamic analytics; P1. |
| `/trade/best-buy` | Best-buy opportunity view | `(site)/trade/best-buy/page.tsx` | Not sampled. | Comparable series/entitlement; P1. |
| `/trade/best-sell` | Best-sell opportunity view | `(site)/trade/best-sell/page.tsx` | Not sampled. | Comparable series/entitlement; P1. |
| `/trade/fundamentals` | Commodity fundamentals | `(site)/trade/fundamentals/page.tsx` | Not sampled. | Separate fundamentals dataset; P2. |
| `/trade/alerts` | Price alert workspace | `(site)/trade/alerts/page.tsx` | Not sampled. | Signed-in/entitlement; P2. |
| `/trade/watchlist` | Saved market/commodity watchlist | `(site)/trade/watchlist/page.tsx` | Not sampled. | Signed-in/entitlement; P2. |
| `/dashboard` | Signed-in customer landing | `(site)/dashboard/page.tsx` | Not sampled. | Authenticated; exclude from SEO. Not public-site redesign scope. |

## Public access/account routes (not indexed product pages)

| Route | Purpose | Source | W0 status |
|---|---|---|---|
| `/login` | Sign in | `(portal)/login/page.tsx` | Source exists; live not sampled. |
| `/register` | Account creation | `(portal)/register/page.tsx` | Source exists; live not sampled. |
| `/forgot-password` | Recovery request | `(portal)/forgot-password/page.tsx` | Source exists; live not sampled. |
| `/reset-password` | Password reset | `(portal)/reset-password/page.tsx` | Source exists; live not sampled. |
| `/auth/callback` | Auth callback | `src/app/auth/callback/route.ts` | Route handler; not sampled. |

## Public API and system endpoints (not marketing pages)

| Route | Purpose/source | W0 notes |
|---|---|---|
| `/api/v1/[...path]` | Versioned API fallback | Source exists; inspect precedence and auth on complete API test. |
| `/api/v1/commodities` | Commodity API | Source exists; public docs claim open read access. |
| `/api/v1/insights` | Insights API | Source exists. |
| `/api/v1/markets` | Market API | Source exists. |
| `/api/v1/prices/compare` | Comparable prices | Source exists. |
| `/api/v1/prices/history` | Historical data | Source exists. |
| `/api/v1/prices/latest` | Latest prices | Live query returned data with a future `generatedAt` relative to audit date; investigate. |
| `/api/v1/reports` | Reports API | Source exists. |
| `/api/search` | Global search | Source exists. |
| `/api/agent/*`, `/api/jobs/run`, `/api/notifications/read` | Internal/operational APIs | Excluded from public marketing; authorization and deployment security review required. |
| `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest` | SEO/PWA metadata | Generated in source; live content not fetched in this audit. |

## Gaps against the target route list

- No `/trends` page (related `/charts` route exists).
- No `/business` page (related `/solutions` route exists).
- No standalone `/api` page (related `/api-docs` exists).
- `/coverage` is a rewrite to `/coverage-report` internally.
- Both `/commodities/[slug]` and `/prices/[commodity]` exist; their purposes and internal links should be made explicit to avoid duplicate/thin page indexing.

## Completion caveat

The route table describes the checked-out workspace and selected live responses, not a certified inventory of the active Vercel deployment. Exact deployment commit is unverified because Vercel project access was denied. Complete the route-by-route HTTP/browser smoke test after owner confirms the production project and commit.
