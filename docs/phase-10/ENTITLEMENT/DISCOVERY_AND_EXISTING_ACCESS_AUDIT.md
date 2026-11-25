# Phase 10 — Discovery and Existing Access Audit

**Phase:** 10 — Centralized Entitlement, Authorization & Feature Access Control Engine
**Stage:** Mandatory pre-implementation audit (§2)
**Date:** 2026-11-14
**Method:** privileged `pg` probe against the live database plus a full-repository
search for every access-control implementation.

> §2: *"Do not implement the new engine until the existing access architecture is
> understood."*
> This document was produced before any Phase 10 implementation code was written.
>
> **Update, after the first build stage.** The engine now exists in
> `src/lib/entitlement/` and is live on `/api/v1/prices/history`. Section 5's
> recommended approach has been executed through step 3; sections 3 and 4 below
> remain the record of what was found, and each blocker is now marked with its
> status.

---

## 1. Headline finding

**A central entitlement engine already exists, and it is not being used.**

`src/lib/entitlements.ts` implements exactly the architecture §1 asks for: a
capability-key model, server-side resolution from trusted records, and a
fail-closed default. `entitlement_catalog` (6 rows) and `entitlement_tiers`
(3 rows) hold the same information as data, with public-read RLS. The API layer
already authenticates keys, resolves scopes, and inherits the owner's
entitlements.

**But `hasEntitlement` is called from exactly one place in the entire
repository — `src/lib/api/handler.ts` — and no `/api/v1` route actually declares
an entitlement.** So in the running application, nothing is gated by it. The
engine is wired, correct, and inert.

Phase 10's work is therefore **not to build a new engine**. It is to deepen the
existing one to the granularity §4 and §9 require, and to actually connect it to
the modules it is meant to govern.

---

## 2. Inventory of existing access-control implementations

### 2.1 The entitlement layer — `src/lib/entitlements.ts` (187 lines)

| Element | Finding |
|---|---|
| Capability keys | **6**: `watchlists`, `alerts`, `exports`, `reports`, `api`, `bulk` |
| Source of truth | `customer_subscriptions.entitlements` (jsonb), filtered to `status IN ('active','trialing')` |
| Expiry handling | checks `ends_at` and `trial_ends_at` against `Date.now()` |
| Resolution | `getEntitlements()` via the session client; `getApplicationEntitlements(userId)` via the admin client |
| Failure mode | `try/catch` returning `EMPTY_ENTITLEMENTS` — **fails closed**, which §17 requires |
| Tier derivation | `tierFor(keys)` — a **heuristic over the key set** |

### 2.2 The data catalogue

| Table | Rows | Notes |
|---|---:|---|
| `entitlement_catalog` | **6** | `key, label, description, sort_order` — public-read RLS for `anon, authenticated` |
| `entitlement_tiers` | **3** | `public`, `professional`, `enterprise`; `entitlements` is a jsonb **array**; `is_available` |
| `customer_subscriptions` | **0** | `user_id, organization_id, plan, status, starts_at, ends_at, renews_at, trial_ends_at, entitlements, external_ref`; RLS owner-read + admin-write |
| `api_applications` | **0** | `user_id, organization_id, name, key_prefix, key_hash, scopes, tier, rate_limit_per_minute, is_active, expires_at`; RLS owner + admin |
| `organizations` | **0** | `name, slug, kind, is_active`; RLS member-select + admin-write |
| `organization_members` | **0** | `organization_id, user_id, role_in_org`; RLS select + admin-write |
| `api_usage_logs` | exists | usage records for the API |
| `billing_events` | exists | payment lifecycle events |

### 2.3 The API authorization path

`src/lib/api/auth.ts` — `authenticateApiKey`:

- hashes the presented key (`hashApiKey`) and looks it up
- checks `requiredScope` against the key's `scopes`, allowing `*`
- **inherits the owner's entitlements** via `getApplicationEntitlements(data.user_id)` — so revoking a subscription revokes every key issued under it
- returns `{ scopes, rateLimitPerMinute, entitlements, entitlementSet }`

`src/lib/api/handler.ts` — `createApiHandler`:

- accepts an `entitlement?: EntitlementKey` option
- enforces it with `hasEntitlement(auth.application.entitlementSet, options.entitlement)`
- returns a structured error naming the entitlement and pointing at the free public endpoint

`src/lib/entitlements.ts` — `rateLimitFor`:

- key limit → `api` entitlement limit (**hardcoded 600**) → anonymous limit

### 2.4 Administrative authorization (separate, and correctly so)

`src/lib/auth/` provides `requireRole(roles, returnTo)`, `hasOperationsAccess(role)`,
`isStaffRole(role)` over the roles `verification_officer`, `market_supervisor`,
`analyst`, `admin`, `super_admin`. Used in 3 places in `src/lib/operations/actions.ts`
and 2 in `src/app/(site)/dashboard/page.tsx`.

**This is already the separation §10 demands**: commercial entitlements and
administrative RBAC are distinct code paths. Phase 10 must preserve it.

---

## 3. Gaps against the brief

### 3.1 Status of each blocker after the first build stage

| # | Blocker | Status |
|---|---|---|
| P10-1 | `hasEntitlement` is never called by any route | **RESOLVED** — the engine gates `/api/v1/prices/history`; the legacy check remains as a second layer |
| P10-2 | `PUBLIC_CAPABILITIES` empty conflicts with Phase 08 | **OPEN — decision requested** |
| P10-3 | `tierFor` duplicates `entitlement_tiers` data | **OPEN** |
| P10-4 | No feature registry beyond 6 coarse keys | **RESOLVED** — 27 keys across 11 modules |
| P10-5 | No action-level granularity | **RESOLVED** — `Action` is a 13-value union, carried on every decision |
| P10-6 | No usage ledger, reservations or periods | **PARTLY** — the lifecycle and store contract exist; the tables need authorisation |
| P10-7 | No structured decision type or decision logging | **PARTLY** — the decision type exists; logging needs a table |
| P10-8 | No temporary-grant table | **OPEN** |
| P10-9 | No organization resolution in the entitlement path | **PARTLY** — the policy evaluates org membership and org keys; 0 rows to test against |
| P10-10 | No AI usage controls | **OPEN** |
| P10-11 | All subscription tables 0 rows | **OPEN — blocks the §19 test matrix and §21 scenarios B–D, F** |
| P10-12 | No payment provider configured | **OPEN** |

### 3.2 The engine was correct but coarse

| § requirement | Current state |
|---|---|
| §4 feature registry with stable keys, module, category, metering type, default access | **6 coarse keys**, no module/category/metering metadata |
| §9 action-level authorization (view / read / download / export / bulk_access) | **single boolean per key** — `exports` cannot distinguish viewing from downloading |
| §5 plans as configurable entitlement sets | **partly** — `entitlement_tiers.entitlements` holds the data, but nothing reads it (see 3.3) |
| §10 metered usage with reservation lifecycle | **absent** — no usage ledger, no reservations, no periods |
| §7 structured denial reasons (12 distinguished outcomes) | **one generic error** from `createApiHandler` |
| §6 `EntitlementDecision` with `used`/`remaining`/`resetAt`/`policyVersion` | **absent** — `hasEntitlement` returns a boolean |
| §13 entitlement decision logging | **absent** — no decision log table |
| §8 temporary grants with scope, reason, issuer, expiration | **absent** — no grants table |
| §3 organization-level entitlements | **tables exist, 0 rows, unused by resolution** |

### 3.3 `PUBLIC_CAPABILITIES` is empty, which gates Phase 08's work off

```ts
export const PUBLIC_CAPABILITIES: EntitlementKey[] = [];
```

`hasEntitlement` therefore returns `false` for every key, **including
`watchlists` and `alerts`** — the two capabilities Phase 08 has already
implemented in the database (`saved_commodities`, `saved_markets`,
`price_alerts`, all with owner-scoped RLS).

So today the entitlement layer says *no account may hold a watchlist*, while the
Phase 08 schema lets every authenticated user create one. **These two are in
direct conflict**, and the conflict is invisible because nothing calls
`hasEntitlement`.

This must be resolved deliberately, not by picking whichever behaviour happens
to be wired up. Either watchlists and alerts become public capabilities, or
Phase 08's surfaces need a gate they do not currently have.

### 3.4 Two sources of truth for the same plans

`tierFor(keys)` derives the tier from the key set:

```ts
if (keys.has('api') || keys.has('bulk')) return 'enterprise';
if (keys.has('reports') || keys.has('exports')) return 'professional';
if (keys.size > 0) return 'professional';
return 'public';
```

Meanwhile `entitlement_tiers.entitlements` already records, as data, which keys
belong to which tier — and **nothing reads it**. §5 requires plans to be
configurable through data, and §23 forbids scattering plan conditionals through
application logic. `tierFor` is exactly such a conditional.

### 3.5 No route was actually gated

`grep -rn "entitlement" src/app/api/v1/*/route.ts` finds one hit — a **comment**
in `reports/route.ts` explaining that reports need the `reports` entitlement.
No route passes `entitlement` to `createApiHandler`.

So the API's premium endpoints are currently open to any authenticated key
holder, and the engine that would close them is never consulted.

### 3.6 No usage metering anywhere

§10's reservation lifecycle, ledger, periods and concurrency-safety have no
implementation and no tables. `api_usage_logs` exists but records API calls, not
entitlement consumption, and is not consulted before an operation.

---

## 4. Blockers as found

| # | Blocker | Severity | Blocks | Code-resolvable? |
|---|---|---|---|---|
| P10-1 | `hasEntitlement` is never called by any route or module | **P1** | the entire §13 integration matrix | **Yes** |
| P10-2 | `PUBLIC_CAPABILITIES` empty conflicts with Phase 08's live watchlist/alerts schema | **P1** | §13 alerts & personalization | **Yes** — a policy decision |
| P10-3 | `tierFor` duplicates `entitlement_tiers` data | P1 | §5 | **Yes** |
| P10-4 | No feature registry beyond 6 coarse keys | P1 | §4 | **Yes** |
| P10-5 | No action-level granularity | P1 | §9 | **Yes** |
| P10-6 | No usage ledger, reservations or periods | P1 | §10 | **Partly** — schema needs authorisation |
| P10-7 | No structured decision type or decision logging | P1 | §6, §7 | **Yes** — code; logging needs schema |
| P10-8 | No temporary-grant table | P2 | §8, §21 scenario E | **Partly** |
| P10-9 | No organization resolution in the entitlement path | P2 | §3.3, §21 scenario D | **Yes** — code; 0 rows to test against |
| P10-10 | No AI usage controls (no `ai_*` tables) | P2 | §13 AI Market Analyst | **Yes** |
| P10-11 | `customer_subscriptions`, `api_applications`, `organizations` all 0 rows | P2 | §19 test matrix, §21 scenarios B–D, F | **No** — needs test data |
| P10-12 | No payment provider configured | P2 | §3.2 provider-confirmed payment state | **No** |

---

## 5. Recommended approach: extend, do not rebuild

§2 says *"Do not remove existing security checks until equivalent or stronger
centralized enforcement has been implemented and tested."* The existing engine
is sound, so the plan is additive:

1. **A `FeatureRegistry`** with the granular keys §4 lists, each carrying module,
   category, metering type, default access and — critically — an
   *implementation status*, so a registered-but-unimplemented feature is
   distinguishable from a live one. §4: *"Do not expose an entitlement as
   available merely because its key exists in the registry."*
2. **A structured `EntitlementDecision`** replacing the boolean, carrying
   `reasonCode`, `limit`, `used`, `remaining`, `resetAt` and `policyVersion`.
3. **A `PolicyEvaluator`** implementing §7's twelve-step order and its twelve
   distinguished denial reasons.
4. **A usage meter and reservation lifecycle** that is concurrency-safe by
   construction rather than by read-check-increment.
5. **Resolution that reads `entitlement_tiers` as data** instead of
   re-deriving the tier from the key set.
6. **Migration one module at a time**, comparing old and new results before
   removing anything, per §18.

Items 1–3 are pure logic, fully testable, and need no schema change. They are
what I am building first.

---

## 6. Pre-existing lint failures, reported separately

Phase 08's instruction to report unrelated legacy failures separately applies
here. A repo-wide `eslint "src/**/*.ts" "src/**/*.tsx"` reports **10 errors in
8 files, none of them Phase 10's**:

| File | Errors | Rule |
|---|---:|---|
| `src/components/admin/AdminShell.tsx` | 1 | setState synchronously within an effect |
| `src/components/agent/AgentShell.tsx` | 1 | setState synchronously within an effect |
| `src/components/agent/CollectionFlow.tsx` | 1 | setState synchronously within an effect |
| `src/components/agent/CollectionSession.tsx` | 2 | setState within an effect; impure call during render |
| `src/components/data/CommodityPriceView.tsx` | 1 | impure call during render |
| `src/components/data/DataCoverageNotice.tsx` | 1 | setState synchronously within an effect |
| `src/components/loading/HatsiBootRecovery.tsx` | 1 | setState synchronously within an effect |
| `src/lib/agent/use-field-queue.ts` | 2 | impure call during render; ref access during render |

These are React `react-hooks` rules in components from earlier phases. They are
**not touched by this work**: Phase 07 §28 prohibits rewriting unrelated
modules, and fixing them here would mix an unrelated behavioural change into an
authorization migration. `src/lib/entitlement/` and every file Phase 10 has
modified lint clean.

---

## 7. Decisions requested

1. **P10-2 — are `watchlists` and `alerts` public capabilities?** Phase 08 has
   already built them for every authenticated user. Either the entitlement layer
   is updated to match, or Phase 08's surfaces need a gate. This is a product
   decision, not a technical one, and it is currently being made by accident.
2. **P10-6 — usage ledger schema.** The reservation lifecycle needs tables
   (`usage_ledger`, `usage_reservations`, `usage_periods`). All additive and
   non-destructive, but they are database changes and I will not make them
   unilaterally.
3. **Which `/api/v1` endpoints should be gated first?** §13 lists the full
   matrix. `prices/history` (extended history) and `reports` (premium reports)
   are the two the existing comments already identify, and gating them would
   make the engine real rather than inert.
4. **Confirm the migration order.** I propose: (a) feature registry + decision
   type + policy evaluator as pure logic; (b) wire the API routes, comparing old
   and new results; (c) then the UI modules, one at a time. Confirm or adjust.
