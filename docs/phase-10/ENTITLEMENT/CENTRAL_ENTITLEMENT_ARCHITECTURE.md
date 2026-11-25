# Phase 10 — Central Entitlement Architecture

**Phase:** 10 — Centralized Entitlement, Authorization & Feature Access Control Engine
**Document:** §20's `CENTRAL_ENTITLEMENT_ARCHITECTURE`
**Date:** 2026-11-14

---

## 1. The one-sentence design

One registry of features, one resolver of grants, one evaluator of policy, one
meter of usage — and every module asks the same question of the same service,
so there is no place where subscription logic lives except that service.

Phase 10 §23 puts the requirement as: *"Build a centralized platform, not a
collection of subscription checks."* The architecture below is organised around
that sentence.

---

## 2. The five layers (§3)

| Layer | Where it lives | What it does |
|---|---|---|
| **Identity** | `resolver.ts` | Resolves the principal from the session or the API key. Never from a request parameter. |
| **Subscription** | `resolver.ts` + the caller | Reads trusted server-side subscription records: status, grace, cancellation, trial, payment state. |
| **Entitlement** | `resolver.ts` + `legacy.ts` | Merges plan grants, org subscriptions, add-ons, feature purchases, promotional grants, admin temporary grants and contractual overrides into one effective set. |
| **Policy evaluation** | `policy.ts` | Applies §7's twelve-step order and returns a structured decision. |
| **Usage accounting** | `usage.ts` | Reserves, commits and releases metered usage atomically. |

The layers are separated because they fail differently. An identity failure
means the caller is not who they claim; a subscription failure means they are
who they claim but have not paid; an entitlement failure means they have paid
for something else. Collapsing them into one "can they?" question loses exactly
the information §7's twelve reason codes exist to carry.

### Why identity is resolved server-side

§3: *"Never trust a browser-supplied user, organization, plan, or role
identifier."*

`buildPolicyContext` therefore takes its facts from the caller's own
server-side records, and its defaults all fail closed: an unknown account
status is not an active one, an absent grant is not an implied one, an unknown
usage figure is not an unlimited one. A caller who forgets to supply a fact
gets a denial rather than a silent pass — which is the correct direction under
§17's fail-closed rule.

---

## 3. The modules (§14)

```
src/lib/entitlement/
  types.ts       the domain model: feature statuses, denial reasons, metering
                 types, usage units, the EntitlementDecision
  registry.ts    the FeatureRegistry — 27 keys across 11 modules
  policy.ts      the PolicyEvaluator — the twelve-step order
  usage.ts       the UsageMeter, the reservation lifecycle, the store contract
  authorize.ts   the server helper, the job authorizer, the HTTP mapping
  resolver.ts    buildPolicyContext — the identity layer
  legacy.ts      the §18 map from the six coarse keys to the registry
  ui.ts          the React capability helper — UX only, never the boundary
  index.ts       the barrel
```

Every module is pure except `resolver.ts` (marked `server-only`) and `ui.ts`
(marked `use client`). That split is deliberate: **every rule the engine
enforces can be tested without a database**, so an authorization decision cannot
be influenced by where it happens to run.

---

## 4. The FeatureRegistry (§4)

27 keys across the 11 modules §13 names. Each carries a stable machine key, a
display name, a description, a module, a category, a metering type, a default
access behaviour, an availability status and metadata.

### The rule that shapes the whole registry

§4: *"Do not expose an entitlement as available merely because its key exists in
the registry."*

So `available` is reserved for a capability that is implemented and tested. A
key that is planned is `registered`, and the engine will report
`feature_unavailable` for it — **not** `not_in_plan`. The difference matters
enormously to a customer: `not_in_plan` tells them to upgrade, which is a
lie when they already own the capability; `feature_unavailable` tells them it is
not offered yet, which is true.

This is why `research.premium_reports` is `registered`. The legacy `reports`
entitlement maps to it, so a subscriber keeps what they bought and is told the
truth about it, rather than being silently downgraded or falsely upsold.

### The six statuses

`registered` → `configured` → `enabled` → `implemented` → `tested` → `available`

Only `available` is purchasable. `summariseRegistry()` reports how many keys sit
at each stage, so the admin catalogue cannot advertise a placeholder.

---

## 5. The evaluation order (§7)

The twelve steps, in order, with the reason each is placed where it is:

| # | Step | Denial reason | Why here |
|---|---|---|---|
| 1 | Identity | `unauthenticated` | Nothing else can be true without a principal |
| 2 | Principal validation | `unauthorized` | A closed or unknown account is not a caller |
| 3 | Account/org status | `administrative_suspension`, `organization_access_missing` | §8: a suspension cannot be overridden by a plan |
| 4 | Resource authorization | `resource_restriction` | §8: explicit permissions are still checked |
| 5 | Role/action permissions | `unauthorized` | §10: a subscription never reaches this step |
| 6 | Entitlement grants | — | Public and authenticated defaults resolve here too |
| 7 | Subscription validity | `subscription_expired`, `subscription_inactive`, `not_in_plan` | Only once a grant was expected |
| 8 | Feature availability | `feature_unavailable` | §4: a key existing is not availability |
| 9 | Contextual restrictions | `geographic_restriction`, `temporary_service_restriction` | Region and service state |
| 10 | Usage allowance | `usage_exhausted` | §10: measured against the contract |
| 11 | Structured decision | — | Returned to the caller |
| 12 | Audit | — | The caller's responsibility |

Steps 11 and 12 are not branches. Step 11 is what `evaluatePolicy` returns; step
12 is performed by whoever calls it. That split is deliberate — a decision can be
logged without the evaluator depending on the database.

### Two orderings worth calling out

**A suspension outranks a live subscription.** A suspended account with an active
enterprise plan is reported as `administrative_suspension`, because that is the
actionable fact. §8 is explicit that security restrictions cannot be overridden
by ordinary plan entitlements.

**An unimplemented feature outranks the plan.** A caller holding
`research.premium_reports` is reported as `feature_unavailable`, not
`not_in_plan`, because they already own it.

---

## 6. Usage metering (§10)

### The forbidden pattern

§10: *"Explicitly forbidden is read → check → operate → increment."*

Two concurrent requests both read `used = 99` of 100, both pass the check, both
operate, and the account is at 101 — charged for one more request than was
bought, with a ledger nobody can reconcile.

**So `UsageMeter` has no `increment` method.** `reserve` is the only way to
claim usage, and a store implementation must make it a single atomic statement —
in Postgres, one `UPDATE ... WHERE used + n <= limit RETURNING used`. The
contract is stated in `UsageStore` because the engine cannot enforce atomicity
from outside: a store that reads, checks and writes separately is broken however
carefully this module is written, and a review must look for it.

### The lifecycle

```
                  ┌──────────────┐
   reserve ─────► │   reserved   │
                  └──┬────────┬──┘
                     │        │
            commit ──┘        └── release
                     ▼              ▼
              ┌───────────┐  ┌───────────┐
              │ committed │  │ released  │
              └───────────┘  └───────────┘
```

There is no third exit from `reserved`, because a reservation that is neither
committed nor released has consumed the customer's allowance for nothing.

`release` subtracts the claim back out, so **a failed operation never consumes
the quota**. `commit` leaves it counted. Releasing an already-released
reservation subtracts nothing a second time, which would otherwise hand the
customer a credit.

### Idempotency

A retried request with the same idempotency key returns the original
reservation rather than claiming twice. The key is scoped to
`(principal, feature, billingPeriod)`, so two accounts or two periods with the
same key are two different requests.

### The eight metering types

`unlimited`, `fixed_allowance`, `period_allowance`, `per_action_allowance`,
`organization_shared_allowance`, `concurrent_limit`, `one_time_allowance`, and
overage as a commercial arrangement.

Two distinctions the code enforces rather than documents:

- **A concurrent limit must be released, not committed.** Treating simultaneous
  activity as cumulative would leave the account permanently charged for
  something that has ended — a bug that looks like an exhausted allowance and is
  really a leaked reservation.
- **An org-shared allowance is scoped to the organization, not the member.**
  Two members of one organization draw on one allowance; another organization's
  consumption is not theirs. §8: enterprise entitlements must not leak between
  organizations.

### The ledger fields

§10 names them: principal, organization, feature, action, quantity, unit,
billing period, source request, idempotency key, timestamp, status, and the
adjustment or reversal reference. All are present in `UsageLedgerEntry`, because
a ledger that cannot answer "why is this number what it is" cannot be audited.

---

## 7. The decision (§6)

```ts
interface EntitlementDecision {
  allowed: boolean;
  feature: string;
  action: Action;
  reasonCode: DenialReason | 'allowed';
  source?: string;        // which source granted access
  limit?: number;
  used?: number;
  remaining?: number;
  resetAt?: string;
  upgradeRequired?: boolean;
  evaluatedAt: string;
  policyVersion?: string;
}
```

`policyVersion` and `evaluatedAt` mean a decision can be reproduced after the
policy changes — which is what makes an audit log meaningful rather than
anecdotal.

`source` answers §8's *"explain which source granted access"*: a plan grant, an
organization subscription, a promotional grant, an admin temporary grant or a
contractual override. Without it, "why do I have this?" is unanswerable.

---

## 8. The HTTP mapping (§7, §16)

A denial is not a flat 403:

| Reason | Status | Customer action |
|---|---|---|
| `unauthenticated` | 401 | Sign in |
| `usage_exhausted` | 429 + `Retry-After` | Wait for the reset |
| `not_in_plan`, `subscription_*` | 403 + `upgradeRequired` | Upgrade |
| `administrative_suspension`, `geographic_restriction` | 403 | Contact support |
| `temporary_service_restriction` | 503 | Retry later |

The denial body carries the feature, the action, the reason and — on an
exhausted period — the allowance, usage, remaining and reset date, per §16. It
carries nothing about how the decision was reached.

---

## 9. What the frontend may and may not do

§14: *"Frontend helpers are UX only and never the security boundary."*
§7: *"A frontend-only authorization result must never override the server's."*

`useCapability` answers one question — what should the interface show this
visitor? It takes a decision the server already made and must not re-derive it.
When no decision was supplied it shows the prompt rather than the control,
because the server has not been asked.

A UI that hides a button a user is entitled to is a product bug. A UI that
shows a button a user is not entitled to is a bug the server then fixes. Only
the second is a security failure.

---

## 10. Migration order (§18)

The existing engine in `src/lib/entitlements.ts` is sound and is **not**
removed. `createApiHandler` runs the central engine first and the legacy check
second, so no route is ever less protected during migration than it was before.

1. Feature registry, decision type and policy evaluator as pure logic — **done**
2. Usage meter and reservation lifecycle — **done**
3. Authorization helpers, resolver and legacy key map — **done**
4. Wire the API routes, comparing old and new results — **`/api/v1/prices/history` done**
5. The UI modules, one at a time
6. Remove the legacy check, per module, only after verification

Each stage has its own rollback: the legacy check is restored by removing the
`feature` option.

---

## 11. Open decisions

The four in the discovery audit remain open, and P10-2 is the one that blocks
progress: **are `watchlists` and `alerts` public capabilities?** Phase 08 has
already built them for every authenticated user, while `PUBLIC_CAPABILITIES` is
empty, so the entitlement layer currently says no account may hold a watchlist.
The two are in direct conflict, and the conflict is invisible because nothing
calls the legacy check.
