# Hatsi360 Markets — existing architecture (W0)

**Reviewed:** 2026-10-22.  
**Scope:** Repository/source architecture plus non-mutating public-site and candidate-Supabase inspection. Production Vercel project/commit and production database identity remain unconfirmed.

## Stack and runtime

- Next.js 16.4.2 App Router; React 19.3.1; TypeScript 5.9.3 strict.
- Tailwind CSS 4.3.3; centralized design tokens and component layers in `src/app/globals.css`.
- Recharts 3.10.1, plus hand-authored SVG charts.
- Supabase Postgres/Auth using `@supabase/ssr` and `@supabase/supabase-js`; Zod 4 input validation.
- Vitest 5, Testing Library, Playwright dependency and ESLint 9.
- `package.json` declares Node `>=22`; local build logs in recent prior session mentioned a Node 20-or-below Supabase client warning, so runtime parity should be checked.

## Route and shell structure

- `(site)` contains public information, pricing, market, commodity, price, research, comparison, coverage, charts and trade routes.
- `(commodity-profile)` contains `/commodities/[slug]` separately from the site’s `/prices/[commodity]` price-detail route.
- `(portal)` contains sign-in, registration and password recovery.
- `/admin` and `/agent` are separate authenticated operations applications, not public site routes.
- `/coverage` is a public rewrite to `/coverage-report` using `src/lib/route-map.ts`.
- `/api/v1/*` has versioned routes plus a catch-all; other API handlers include search, agent submissions, job invocation and notifications.
- `next.config.ts` manages headers, image optimisation, redirects from legacy PHP paths and route aliases. `src/proxy.ts` performs canonical host redirect and Supabase session refresh; server route guards and RLS remain the authorization layer.

## Data flow

```text
Public route / API
  └─ src/lib/market/* or src/lib/trade/* query/service
       └─ getDataSource() [src/lib/data/index.ts]
            ├─ SupabaseDataSource [if URL + publishable key configured]
            │    └─ request-cookie Supabase client → published_price_observations view
            └─ FixtureDataSource [otherwise]
                 └─ migrated legacy dataset + provenance metadata
```

- `src/lib/data/source.ts` defines a common catalogue and observation interface; public list methods are paginated and an unpaginated analysis method is also available.
- `src/lib/data/supabase.ts` maps joined view columns into domain types. Its comment says public observations are read from `published_price_observations`, whose RLS/view policy excludes unpublished/test records.
- Operational collection, verification, reporting, admin and agent functions use server-side operations modules and direct tables/RPCs according to authorization rules.
- `src/lib/data/fixture.ts` serves a migrated historical dataset if Supabase is not configured. This is an intentional developer fallback, but deployment must fail closed or visibly label fixture content if misconfigured.
- `src/lib/market/` contains overview, watch, movement, comparison, activity, coverage and search. `src/lib/trade/` contains series, query, freshness and opportunity logic. `src/lib/pricing.ts` contains lower-level comparability and freshness functions. Avoid implementing overlapping metric calculations in routes.

## Database facts (candidate only)

The current `.env.local` Supabase host and a project listed by the connected account match reference `umxzsdepbrenqysabtlt`. The owner has previously cautioned that connector migration history did not match the repository and the project must not be assumed to be production or intended. This document follows that constraint.

Read-only project inspection found:

- 22 commodities; 11 markets.
- 321 rows in `price_observations`; 259 in `published_price_observations`.
- 0 articles; 15 buyer offers and 15 seller offers.
- Candidate migration API history: `0001` through `0004`, followed by timestamp versions `20261114152034` and `20261114152829`; repository SQL files instead have a numbered chain through `0032_daily_market_reporting.sql`.
- RLS enabled on the inspected observations, market, commodity, and buyer/seller offer tables. Selected policies were read-only inspected; no JWT role simulation or mutation test was performed.

This is a schema/source clue, not a production attestation. No migration, DDL or DML was run. Vercel connector access to project listings was denied; there is no verified deployment commit.

## Security boundaries visible in source

- `src/lib/supabase/server.ts` creates a cookie-bound client with the publishable key.
- `src/lib/supabase/admin.ts` imports `server-only` and reads `SUPABASE_SERVICE_ROLE_KEY` for narrowly privileged tasks.
- `src/lib/auth/guards.ts` provides server-side user/role guards. Admin/agent layouts are separate from public layouts.
- `src/lib/api/handler.ts` provides a common API wrapper for query validation, API key auth, entitlements, rate limits, logging and error envelopes.
- Local security headers include HSTS, frame denial, MIME sniffing protection and referrer policy. Public API route cache is set no-store in config.
- RLS policy definitions are defense in depth, not proven complete until production schema, role tests and actual API response payloads are checked.

## SEO and rendering

- Page-level metadata exists for most public pages. Dynamic routes construct metadata from catalogue records.
- `src/app/sitemap.ts` builds static and data-driven URLs; `src/app/robots.ts` disallows API/admin/agent/dashboard/auth routes.
- Several data-heavy pages are dynamic; homepage explicitly uses `force-dynamic`. Sitemaps revalidate hourly; API routes are intended no-store.
- Site title templates/canonical origin, sitemap contents, robots output, structured-data correctness and runtime cache behaviour were not verified on the active deployment.
- The live API documentation uses a Vercel preview-looking origin rather than the public site URL.

## W0 technical risk notes

1. The source abstraction is appropriate, but tests must prove fixture-vs-Supabase provenance cannot be hidden by UI labels.
2. Public source methods expose a full unpaginated analysis read. Overview, movement and directory calculations can read all observations and/or make per-commodity requests. Measure query count and plan at confirmed production scale before adding cache layers.
3. Current local code does not visibly match live homepage content. The deployed Git SHA and environment configuration are essential audit inputs.
4. The `/prices/[commodity]` and `/commodities/[slug]` distinction should be explicit; the sampled `/commodities/groundnut` route failed.
5. Candidate DB migration history is not safely aligned with the checked-out repository; no remote migrations may be applied absent owner authorization and reconciliation.

## Architecture recommendation

Retain Next.js App Router, the shared data-source contract, existing PostgreSQL domain and RLS, current market/trade calculation services, and reusable chart/table/display primitives. Do not add replacement tables or a competing statistics subsystem. W1 should specify each public metric, map it to one approved source/query, test comparability and freshness, and then refine the existing services with owner approval. Treat external deployment/database identifiers as unverified until the owner supplies and approves them.
