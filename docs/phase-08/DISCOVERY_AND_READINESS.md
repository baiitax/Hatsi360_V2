# Phase 08 — Discovery and Readiness

**Phase:** 08 — Personalization, Watchlists & Daily Market Engagement Engine
**Stage:** Mandatory pre-implementation discovery (§2)
**Date:** 2026-11-14
**Method:** privileged `pg` probe against the live database plus inspection of the
existing codebase. Reproduce the database figures with `node scripts/discovery-probe.mjs`.

> §2: *"Before development, inspect the existing implementation and documentation
> from Phases 01–07."*
> This document was produced before any Phase 08 implementation code was written.

---

## 1. Headline finding

**Phase 08 is largely already built, and what is missing is blocked by missing data.**

The brief describes eleven services. Five of them, or close equivalents, **already
exist in production code and hold real rows**:

| §15 service | Existing implementation | Rows |
|---|---|--:|
| `SavedCommodityService` | `saved_commodities` table, owner-scoped RLS | **6** |
| `SavedMarketService` | `saved_markets` table, owner-scoped RLS | **3** |
| `PriceAlertService` (create/list) | `price_alerts` table, owner-scoped RLS | **4** |
| `NotificationService` | `src/lib/notifications/index.ts`, 293 lines | **64** notifications |
| `NotificationDeliveryService` | `notification_delivery_logs`, adapter-based | **64** deliveries |
| Scheduled jobs | `src/lib/jobs/` + `scheduled_job_runs` + authenticated `/api/jobs/run` | 5 jobs |

What does **not** exist: the watchlist engine (§4), alert **evaluation** (§6.3–6.4),
the notification centre UI (§7.2), daily summaries (§8), user preferences (§9),
recently viewed (§10), and `/my-market` (§3).

And the reason several of those cannot be built honestly:

**There are zero eligible published price observations.**

```
price_observations: 58 rows, 0 with published_at
```

Every one of the 58 observations is `source_system = 'test_fixture'` with a null
`published_at`. §6.4 rule 1 requires alert evaluation to *"evaluate only eligible
published observations."* With none published, **no alert can ever fire.**

---

## 2. Readiness matrix (§2's required table)

| Area | Finding | Status |
|---|---|--|--|
| **Authentication** | 5 `auth.users`, 5 `profiles`, role enum, `getUser()`, `requireRole()` | **Ready** |
| **User profiles** | `profiles` has `timezone` and `locale` — §9's timezone requirement is partly satisfied | **Partial** |
| **Commodities** | 22 commodities, stable ids and slugs | **Ready** |
| **Markets** | 11 markets, stable ids, 5 with observations | **Ready** |
| **Price observations** | 58 rows, **0 published**, all `test_fixture`, all NGN | **BLOCKED** |
| **Historical data** | `src/lib/analytics/` exists but is **operational** analytics (agents, tasks, coverage) — not price history. Phase 05 price analytics unbuilt. | **Partial** |
| **Alerts** | `price_alerts` exists with threshold + percent + direction + channel + active + last-triggered | **Partial** |
| **Notifications** | Full service + delivery logs + adapters + idempotency | **Ready** |
| **Background jobs** | `src/lib/jobs/`, 5 jobs, idempotent, secret-authenticated | **Ready** |
| **Security (RLS)** | All 5 personalization tables have RLS enabled with owner-only policies | **Ready** |
| **Design system** | Phase 02 terminal components, theme system | **Ready** |

---

## 3. What already exists, in detail

### 3.1 Saved commodities and markets (§5) — **largely done**

```
saved_commodities(id, user_id, commodity_id, note, created_at)      6 rows
saved_markets(id, user_id, market_id, note, created_at)             3 rows
```

Both have RLS enabled with a single owner policy (`user_id = auth.uid()`, `ALL`
command). §5's requirements are mostly met: save from any page, clear
saved/following state, no duplicate save records.

**Gap:** no unique constraint visible on `(user_id, commodity_id)`, so §5's *"avoid
creating duplicate save records when the user repeatedly clicks"* is enforced by
application code, not by the database. This should be a constraint, not a
convention.

### 3.2 Price alerts (§6) — **partially done**

```
price_alerts(id, user_id, commodity_id, market_id, price_type, direction,
             threshold_amount, threshold_percent, channel, is_active,
             last_triggered_at, created_at, updated_at)              4 rows
```

Four alerts exist, all `is_active = true`, **none ever triggered** — consistent
with there being no published observations to trigger on.

**What the schema already supports:** §6.1A/B (price above/below) via
`direction` + `threshold_amount`; §6.1C/D (percentage) via `threshold_percent`;
§6.2's active/paused via `is_active`; §6.2's last-triggered date.

**What is missing:**

| §6.2 field | Present? |
|---|---|
| Alert name | **no** |
| Grade | **no** |
| Unit | **no** |
| Currency | **no** |
| Comparison period | **no** |
| Expiration date | **no** |
| Delivery history | separate table exists, not linked |
| §6.4 evaluation state (last evaluated observation) | **no** |
| §6.4 "cannot be evaluated" explanation | **no** |
| §6.1F spread alert | **no** |

`price_type` is present, which matters: §6.4 rule 3 requires price-type
compatibility checking, and the field to check on already exists.

### 3.3 Notifications and delivery (§7) — **the strongest existing asset**

`src/lib/notifications/index.ts` already provides:

```
listNotifications, unreadCount, markRead, createNotification, deliverPending,
channelStatus, hashIdentifier, DeliveryAdapter, externalChannelAdapters
```

`notification_delivery_logs` already tracks exactly what §7.3 asks for:
notification, channel, status, provider, provider message id, **attempt count**,
error, timestamps. `hashIdentifier` is the idempotency mechanism §7.3 and §12.1
require.

**Two significant gaps:**

1. **The `notification_kind` enum has no personalization kinds.** Its 13 values are
   all field-agent and operations oriented: `task_assigned`, `deadline_reminder`,
   `submission_received`, …, `coverage_gap`, `quality_warning`. None of §7's nine
   categories exists: no price-threshold-reached, no new-price-published, no
   watched-market-updated, no daily-summary.
2. **All 64 notifications are `assignment_changed`** and **all 64 delivery logs are
   `in_app` / `delivered`** with zero read. This is the field-agent domain working
   correctly; the market-personalization domain has never been exercised.

§7.3's *"implement in-app notifications first"* is already the state — in-app is the
only channel with any delivery, and `channelStatus()` reports external channels as
unconfigured rather than pretending otherwise.

### 3.4 Background jobs (§13) — **ready to extend**

`src/lib/jobs/` defines five jobs — `generate_collection_tasks`,
`mark_overdue_tasks`, `refresh_analytics_snapshot`, `retry_notification_delivery`,
`expire_exports` — invoked through `POST /api/jobs/run`, which:

- compares `JOB_RUNNER_SECRET` with `timingSafeEqual` and never logs it
- is idempotent per `(job name, scheduled slot)`, enforced by a unique constraint
- writes every run to `scheduled_job_runs` with start, finish, status, records
  processed and error

**This is exactly §13's requirement, already satisfied.** Phase 08 adds an alert
evaluation job to this list rather than building a second scheduler. Note
`scheduled_job_runs` currently holds **0 rows**, so the scheduler has never
actually run in this environment.

### 3.5 Comparability (§6.4 rule 3) — **the asset to reuse**

§6.4 rule 3 requires checking *"currency, unit, grade and price type
compatibility."* §15 forbids duplicating existing services. `src/lib/trade/series.ts`
already defines this once:

```ts
interface SeriesKey {
  commodityId, marketId, priceType, gradeId, unitId, currencyCode, varietyId
}
areCompatible(a, b)   // compareSeries(a,b).compatible
seriesKeyId(key)      // the single definition of comparability
```

This is also what makes §6.1F (spread alerts) answerable: §6.1F says *"do not
implement spread alerts using incompatible grades, currencies, units or price
types"* — which is precisely `areCompatible`. Phase 06's `calculateSpread` already
refuses incompatible series.

---

## 4. Blockers

| # | Blocker | Severity | Blocks | Code-resolvable? |
|---|---|---|---|---|
| P8-1 | **0 published price observations** (58 rows, all `test_fixture`, null `published_at`) | **P1** | §3B/C, §6 evaluation, §8 daily summaries, §21 acceptance | **No** — publication authorisation |
| P8-2 | No watchlist tables | P1 | §4, §3B | **Yes** — schema migration |
| P8-3 | `notification_kind` enum lacks all nine §7 categories | P1 | §7 | **Yes** — enum extension |
| P8-4 | `price_alerts` lacks name, grade, unit, currency, comparison period, expiry | P1 | §6.2 | **Yes** — schema migration |
| P8-5 | No alert evaluation engine or job | P1 | §6.3, §6.4 | **Yes** — pure logic |
| P8-6 | No `/my-market`, `/notifications`, `/settings/preferences` routes | P2 | §3, §7.2, §9 | **Yes** — UI |
| P8-7 | No unique constraint on `(user_id, commodity_id)` in `saved_commodities` | P2 | §5 | **Yes** — constraint |
| P8-8 | `scheduled_job_runs` has 0 rows — the scheduler has never run here | P2 | §13 verification | **No** — deployment |
| P8-9 | All personalization data belongs to **1 user** (5 auth users) | P2 | §17.5 cross-user isolation *demonstration* | **No** — needs a second test user |
| P8-10 | Phase 05 price history unbuilt | P2 | §3B "view historical movement" | **Partly** — Phase 02 `/charts` exists |
| P8-11 | **`calculateSpread` cannot produce a cross-market spread** (see §5 below) | P2 | §6.1F spread alerts | **Yes** — but it is Phase 06 code |

**P8-1 is the phase's defining constraint.** It is not resolvable by writing code,
and §20's DoD items 3, 5 and 9 cannot be honestly marked complete until it is.
§21's acceptance scenario requires *"an eligible published test observation"* —
which does not exist.

---

## 5. Pre-existing defect found: Phase 06 cross-market spread

While building the §6.1F spread alert I found a defect in Phase 06 that Phase 08
surfaces. It is reported here rather than worked around, because silently patching
another phase's module would hide it.

**`calculateSpread` in `src/lib/trade/opportunities.ts` cannot produce a
cross-market spread for real data.**

The mechanism:

1. `selectReferenceSeries` picks the largest comparable group's `SeriesKey` as a
   reference.
2. Every observation is then filtered against that reference with `compareSeries`.
3. `compareSeries` compares `marketId` — and `SeriesKey`'s own docs say two
   different markets are *"only comparable as an explicitly-labelled aggregate,
   never as a single market's price."*

So an observation from market 7 is excluded when the reference is market 5, and the
function always returns *"Only one comparable observation exists. A spread needs at
least two markets."* The downstream code that groups by market and requires two
markets is therefore unreachable.

**Why Phase 06's tests pass anyway.** The fixture helper in
`tests/trade/opportunities.test.ts` holds `seriesKey` constant — `marketId: 7` for
every observation — while varying only the separate top-level `marketId` metadata
field. The reference filter therefore never sees a market difference, and the test
at line 245 asserts a working spread. Real observations, whose series keys carry
their own market, cannot produce one.

**Consequence for Phase 08.** §6.1F is explicitly conditional: *"Where Phase 06
supports reliable comparable market spread calculations."* It does not, for real
data. The alert engine therefore delegates to `calculateSpread` — reuse over
duplication, per §15 — and reports `cannot_evaluate` with a reason naming the
cause, rather than inventing a spread. Three tests in
`tests/personalization/alerts.test.ts` hold this behaviour in place.

**The likely fix, offered as a decision rather than applied unilaterally:**
`selectReferenceSeries` should return a market-agnostic reference, or the reference
filter should be skipped when the caller is explicitly comparing markets. That is a
Phase 06 change and outside Phase 08's scope.

---

## 6. Recommended architecture

Extend, do not rebuild. Concretely:

1. **Reuse** `saved_commodities` / `saved_markets` / `price_alerts` /
   `notifications` / `notification_delivery_logs` / `scheduled_job_runs` exactly as
   they are, and add to them.
2. **Reuse** `areCompatible` / `seriesKeyId` from `src/lib/trade/series.ts` for every
   §6.4 compatibility decision. There must be exactly one definition of
   comparability in this platform.
3. **Reuse** the job runner in `src/lib/jobs/` for alert evaluation. Do not create a
   second scheduler.
4. **Add** the watchlist tables, the alert-evaluation state, the personalization
   notification kinds and the preferences tables as incremental, non-destructive
   migrations.

### The one component that is fully deliverable now

**The alert evaluation engine** (§6.3–6.4) is pure logic. It needs no database and
no published observations to be written, tested and correct: it takes an alert, a
set of observations and a clock, and decides whether the condition is met, whether
it is a *crossing* or merely a *qualifying observation*, whether the observations
are compatible, and — when it cannot decide — **why not**.

That last part is §6.4 rule 10, and it is the part that makes the difference
between a dependable engine and a notification-spam platform. An engine that
returns "cannot evaluate: no eligible published observations for this series" is
honest; one that returns nothing at all is indistinguishable from one that is
broken.

---

## 7. Decision requested

Phase 08's discovery is complete. **No Phase 08 implementation code has been
written.**

1. **Proceed with the alert evaluation engine now?** It is pure logic, fully
   testable against fixtures, reuses `areCompatible`, and is unaffected by P8-1 —
   it will report "cannot evaluate" rather than fabricate a trigger. It is the
   component §6.4's ten integrity rules are actually about.
2. **P8-1 is the phase's gate.** DoD items 3, 5 and 9 and the whole of §21's
   acceptance scenario require at least one eligible published observation. Is
   publication authorised, or should the phase be delivered with the engine
   tested against fixtures and the data gap documented?
3. **Schema authorisation** for the watchlist tables, the alert-evaluation state,
   the nine new notification kinds and the preferences tables. All are additive
   and non-destructive, but they are still database changes.
4. **Confirm the milestone order.** §19 lists four milestones; given that five
   services already exist, I propose reordering to: (1) alert evaluation engine —
   pure logic, no data needed; (2) watchlist schema and services; (3) notification
   centre and preferences; (4) daily summaries and dashboard. Confirm or adjust.
5. **The Phase 06 spread defect (§5).** Fix it in Phase 06, or leave spread
   alerts reporting `cannot_evaluate` until it is fixed? I have not touched
   Phase 06 code.
