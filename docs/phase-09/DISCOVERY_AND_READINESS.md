# Phase 09 — Discovery and Readiness

**Phase:** 09 — Research, Agricultural Intelligence Reports & AI Market Analyst Engine
**Stage:** Mandatory pre-implementation audit (§2)
**Date:** 2026-11-14
**Method:** privileged `pg` probe against the live database plus inspection of the
existing codebase. Reproduce the database figures with `node scripts/discovery-probe.mjs`.

> §2: *"Before implementation, inspect all previous project phases."*
> This document was produced before any Phase 09 implementation code was written.
> It also records the state of Phases 04, 05, 07 and 08, which the user authorised
> to proceed in the same instruction that issued this brief.

---

## 1. Headline finding

**Phase 09's flagship feature has nothing to retrieve.**

§11 asks for a grounded AI market analyst that answers from approved Hatsi360
information. §1's core principle is that it *"must not invent market facts,
sources, statistics, forecasts or conclusions."*

Against the live database, the knowledge sources §11.2 lists are:

| §11.2 knowledge source | State | Rows |
|---|---|--:|
| 1. Approved published price observations | **0 published** (58 exist, all `test_fixture`, null `published_at`) | **0** |
| 2. Commodity profiles | 22 commodities exist; **no profile module** | 22 |
| 3. Market profiles | 11 markets exist | 11 |
| 4. Historical analytics | `src/lib/analytics/` is **operational**, not price history | — |
| 5. Approved fundamental intelligence | **no tables exist** | **0** |
| 6. Verified source registry and evidence | `price_source_registry` = 3 internal channels only | 3 |
| 7. Approved trade intelligence | `src/lib/trade/` implemented, but see §4 | — |
| 8. Published Hatsi360 research | **no research tables exist** | **0** |
| 9. Approved external research documents | **no table exists** | **0** |
| 10. Approved policy and regulatory information | **no table exists** | **0** |

So an AI analyst built today would be a retrieval layer over an empty index. It
could only answer *"I cannot verify that from the available Hatsi360 evidence"* —
which is the honest answer, and is what §11.5 requires, but is not a product.

This is the same wall Phases 05, 07 and 08 hit, and it has one root cause:
**nothing is published, and no evidence exists to publish.**

---

## 2. Verified state of each prior phase

| Phase | Discovery | Implementation | Notes |
|---|---|---|---|
| 01 | done | — | audit and architecture |
| 02 | done | **implemented** | design system, terminal components |
| 03 | done | **implemented** | markets terminal |
| 04 | done | **not implemented** | `src/lib/commodity/` absent. **Now authorised** |
| 05 | done | **not implemented** | no price-history analytics. **Now authorised** |
| 06 | — | **implemented** | `src/lib/trade/`; see §4 for a defect |
| 07 | done | **Stage 1 only** | evidence architecture pure logic + 47 tests. **Now authorised** |
| 08 | done | **Stage 1 only** | alert engine pure logic + 53 tests. Awaiting schema authorisation |

### 2.1 Phase 04 — authorised, not started

`src/lib/commodity/` does not exist. Available to build on: 22 commodities (21
active, 19 described), 58 grades, 42 synonyms across 15 commodities, 14 categories,
8 measurement units.

Blockers carried from its discovery: no commodity has a default grade or variety;
`commodity_specifications`, `commodity_varieties`, `commodity_unit_conversions` are
all empty; 56 of 58 observations use `bag` with no approved conversion.

### 2.2 Phase 05 — authorised, blocked on publication

Phase 05's discovery established that all 29 commodity×market pairs have exactly 2
observations on a single calendar day, so every §12 indicator is arithmetically
impossible (a 7-period SMA needs 7 observations; the maximum is 2). This is a
**data** blocker, not a code one, and it has not changed.

`buildCandles` in `src/lib/trade/candles.ts` already implements the OHLC
aggregation Phase 05 needs, including gap detection and degenerate-candle flagging.
Phase 05 can be built and tested against fixtures; it cannot produce a chart from
current data.

### 2.3 Phase 07 — Stage 1 done, rest authorised

Committed in `5946a62`: the evidence domain model, the eight-factor confidence
framework (counting distinct *origins*, not records), and the §15 causal guard.

Still absent: every fundamental table. `commodity_fundamentals` and
`commodity_seasonality` exist with 0 rows; no `fundamental_evidence`, weather,
policy, FX, logistics, production, supply or demand tables exist at all.

### 2.4 Phase 08 — Stage 1 done, schema unauthorised

Committed in `f6f6441`: the alert evaluation engine, 53 tests, all ten §6.4 rules.

Already existing and reusable by Phase 09: `saved_commodities` (6),
`saved_markets` (3), `price_alerts` (4), `notifications` (64),
`notification_delivery_logs` (64), `src/lib/jobs/` with 5 idempotent jobs,
`scheduled_job_runs`, and owner-scoped RLS on all of them.

Phase 09 §10 wants an editorial workflow in the existing admin portal. The RBAC to
build on already exists: `analyst`, `verification_officer`, `admin`, `super_admin`,
with `requireRole` and `audit_logs` (6 rows).

---

## 3. Reusable components

Phase 09 must not duplicate these:

| Component | Location | Phase 09 use |
|---|---|---|
| `areCompatible`, `seriesKeyId` | `src/lib/trade/series.ts` | §11.6 calculation integrity, §20 step 14 |
| `buildCandles`, `validateSeries` | `src/lib/trade/candles.ts` | §5.3 weekly price performance |
| `calculateSpread` | `src/lib/trade/opportunities.ts` | §8E, §11.6 — **see §4** |
| `getCommoditySeries`, `getMarketMovements`, `getCommodityFreshness` | `src/lib/trade/queries.ts` | §4.1D price movements |
| `assessConfidence` | `src/lib/fundamentals/confidence.ts` | §12 confidence, per its instruction to reuse |
| `classifyRelationship` | `src/lib/fundamentals/relationship.ts` | §4.1E, §12 rule 5 |
| `isPubliclyVisible` | `src/lib/fundamentals/types.ts` | §3.1 "only published reports appear publicly" |
| `evaluateAlert` | `src/lib/personalization/alerts.ts` | the pattern for rule-returning pure logic |
| Job runner | `src/lib/jobs/` + `/api/jobs/run` | §13 scheduled report generation |
| Notification service | `src/lib/notifications/` | §10 editorial workflow |
| Design system | Phase 02 terminal components | §3 "must not resemble a generic blog" |
| Empty states | `EmptyStatePanel` | every section, since almost everything is empty |

§12 says *"Use the existing Phase 07 confidence framework if available."* It is
available and committed. Phase 09 uses it rather than writing a second one.

---

## 4. Pre-existing defect carried forward

**`calculateSpread` cannot produce a cross-market spread for real data.** Its
reference-series filter compares `marketId`, so two markets never survive the
filter together. Phase 06's tests pass only because their fixture holds `seriesKey`
constant while varying the separate `marketId` metadata field.

Full analysis is in `docs/phase-08/DISCOVERY_AND_READINESS.md` §5. Phase 09 §11.6
requires deterministic market spreads and §20 step 14 requires the analyst to
*"validate comparability before making a comparison"* — so this defect is now on the
critical path for the AI analyst too. It remains unfixed and unauthorised.

---

## 5. What is deliverable now

The brief's own framing helps here: §11.5 requires the analyst to say *"I cannot
verify that claim from the available Hatsi360 evidence"* when it has no source, and
§4.2 says *"The report must not invent daily market activity simply because a daily
report is scheduled."*

So the correct Phase 09 build is the machinery that **refuses to invent**, tested
against fixtures, with the empty-data behaviour as a first-class tested outcome
rather than a failure:

1. **The retrieval and grounding layer** — question classification (§11.3), the
   authorization and publication gates (§11.2), and the mandatory answer envelope
   (§11.4) including its Limitations and Last-Updated sections.
2. **The citation and calculation-integrity layer** — every claim carries its
   record ids; every number comes from a deterministic service, never from the
   model (§11.6).
3. **Prompt-injection resistance** (§12) — retrieved content is untrusted data.
4. **The report evidence snapshot** (§13) — a report freezes the evidence it was
   generated from, so later source changes cannot silently rewrite history.

All four are pure logic, fully testable, and independent of whether any
observation has been published. They are also the parts that determine whether the
AI analyst is trustworthy, which §21 says matters more than the number of reports.

---

## 6. Blockers

| # | Blocker | Severity | Blocks | Code-resolvable? |
|---|---|---|---|---|
| P9-1 | **0 published price observations** | **P1** | §4.1D, §5.2, §11.6, §20 steps 7–8 | **No** — publication authorisation |
| P9-2 | No research/report/version/source tables | P1 | §3, §5, §10, §13 | **Yes** — schema |
| P9-3 | No fundamental evidence tables (Phase 07) | P1 | §4.1E, §6, §7, §11.2 source 5 | **Yes** — schema; **no data** |
| P9-4 | Phase 04 unimplemented | P1 | §11.2 source 2, §5.2 | **Yes** — code |
| P9-5 | Phase 05 unimplemented | P1 | §5.3, §5.6, §6 | **Yes** — code; blocked by P9-1 for real data |
| P9-6 | `calculateSpread` cross-market defect | P1 | §8E, §11.6, §20 step 14 | **Yes** — Phase 06 code, unauthorised |
| P9-7 | No AI provider configured | P1 | §11 entirely | **No** — credentials |
| P9-8 | No AI conversation/usage tables | P1 | §11.7–11.9 | **Yes** — schema |
| P9-9 | No external research integrations | P2 | §15 | **Yes** — adapters; manual ingestion per §15 |
| P9-10 | `notification_kind` enum lacks research kinds | P2 | §10 workflow | **Yes** — enum extension |
| P9-11 | No document storage for report PDFs | P2 | §10 "PDF publication, if supported" | **No** — infrastructure |
| P9-12 | `scheduled_job_runs` has 0 rows | P2 | §13 verification | **No** — the scheduler has never run here |
| P9-13 | **A public read cannot count unpublished observations** (see below) | P2 | §4.2, §5.2, §9, §11.4 limitations | **No** — RLS is working as designed |

**P9-1 and P9-7 are not code problems.** P9-1 requires publication authorisation;
P9-7 requires AI provider credentials that §11.9 says not to assume exist.

---

---

## 7. A limitation Phase 09 inherits: the public cannot count unpublished records

`price_observations` is protected by RLS. The `anon` role sees only rows passing
`is_public_observation(verification_status, published_at, is_current, source_system,
source_reference)`; staff see everything. Since all 58 rows are `test_fixture` with a
null `published_at`, a public read returns **zero rows** — not because the table is
empty, but because the reader is not permitted to see them.

This matters for Phase 09 in three places:

- **§4.2** requires the daily brief to distinguish "no new development" from "no
  data". A public read cannot make that distinction.
- **§11.4** requires the analyst to state *"missing observations"* and *"limited
  market coverage"* honestly. It cannot report how many observations exist but are
  unpublished.
- **§20 step 12** requires the analyst to *"explain data gaps and coverage
  limitations"* — which it can only do for the records it can see.

The Phase 04 readiness assessment handles this explicitly: `ReadinessInput` carries a
`countsAreComplete` flag, and when it is false the wording says *"no published price
observation is available to you"* rather than *"nothing has been recorded"*. The
queries infer the flag by checking whether the reader sees more observations than are
published.

Getting the true totals to a public surface would require either a service-role read
(which bypasses RLS and is not acceptable) or a `SECURITY DEFINER` count function that
returns totals without exposing rows. Both are database changes and are not
authorised.

---

## 8. Recommended sequence

Given that Phases 04, 05, 07 and 09 are all authorised at once, the dependency
order is:

**Phase 04 first.** Commodity profiles are the substrate everything else attaches
to: Phase 05's charts are per-commodity, Phase 07's fundamentals attach to
commodities and regions, and Phase 09's research and retrieval are organised by
commodity. It is also the least blocked — 22 commodities, 58 grades and 42 synonyms
already exist to build from.

**Then Phase 07's schema and manual evidence entry**, which gives Phase 09 §4.1E
and §11.2 source 5 something real to retrieve.

**Then Phase 05's engine**, tested against fixtures until P9-1 lifts.

**Then Phase 09's retrieval, grounding and governance layer** — the part that
decides whether the AI analyst is trustworthy — followed by the research archive
and editorial workflow.

**Then Phase 08's schema**, so personalization can consume what Phase 09 publishes.

I am starting with Phase 04 in this turn, because it unblocks the most and is the
least dependent on data that does not exist.

---

## 9. Decisions requested

1. **P9-1 — publication authorisation.** Everything user-visible in Phases 05, 07,
   08 and 09 depends on at least one published observation. Until it is granted,
   those phases can be built and tested but not demonstrated. This is the single
   highest-leverage decision available.
2. **P9-7 — AI provider.** §11 needs a provider and credentials. Which one, and is
   a key available? Without it the retrieval and governance layers can be built and
   tested, but no live answer can be produced.
3. **P9-6 — the Phase 06 spread defect.** It is now on Phase 09's critical path
   (§11.6, §20 step 14). Fix it in Phase 06, or leave both phases' spread paths
   returning a documented refusal?
4. **Schema authorisation** for Phase 04's commodity-profile tables, Phase 07's
   fundamental tables, Phase 09's research tables and Phase 08's personalization
   tables. All additive and non-destructive, but they are database changes and I
   will not make them unilaterally.
