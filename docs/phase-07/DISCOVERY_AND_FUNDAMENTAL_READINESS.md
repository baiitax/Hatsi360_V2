# Phase 07 — Discovery and Fundamental Readiness

**Phase:** 07 — Fundamental Market Intelligence & Agricultural Market Drivers Engine
**Stage:** 1 of N (mandatory pre-implementation discovery, §2)
**Date:** 2026-11-14
**Method:** privileged `pg` probe against the live database plus inspection of the
existing codebase. Reproduce the database figures with `node scripts/discovery-probe.mjs`.

> §28: *"Begin with discovery. Establish the evidence architecture first."*
> This document was produced before any implementation code was written.

---

## 1. Headline finding

**Phase 07 has no data in any of its eight domains, and no tables for most of them.**

§3 defines eight fundamental domains: production, supply, demand, weather, trade
policy, currency, freight, and fundamental analysis. Against the live database:

| §3 domain | Table | Rows |
|---|---|--:|
| A. Production intelligence | **none exists** | — |
| B. Supply intelligence | **none exists** | — |
| C. Demand intelligence | **none exists** | — |
| D. Weather and climate | **none exists** | — |
| E. Trade and policy | **none exists** | — |
| F. Currency and financial | **none exists** | — |
| G. Freight and logistics | **none exists** | — |
| H. Fundamental analysis | **none exists** | — |

The two tables that come closest are both empty:

| Table | Rows | Note |
|---|---:|---|
| `commodity_seasonality` | **0** | exists, correct shape for §5, no rows |
| `commodity_fundamentals` | **0** | exists, no rows |
| `observation_market_intelligence` | **0** | the platform's only field-intelligence source; nothing has been written to it |

So §5's seasonal module, §6's production and supply engine, §7's demand
intelligence, §8's weather module, §9's policy tracker, §10's FX module, §11's
logistics module and §14's assessment engine all have **zero source records**.

This is not a query problem. It is what the data is.

---

## 2. Second finding: Phase 04 and Phase 05 were never implemented

§2 requires auditing *"Phase 04 commodity intelligence"* and *"Phase 05 historical
analytics and chart methodology."* Neither exists.

- `src/lib/commodity/` **does not exist.** Phase 04 stopped after its discovery
  document. No approval decision is on record.
- No `src/lib/analytics/` **exists.** Phase 05 stopped after its discovery
  document.

This matters concretely for Phase 07:

| Phase 07 requirement | Depends on | Status |
|---|---|---|
| §15 *"Connect fundamentals to Phase 05 historical analytics"* | Phase 05 chart workspace | **unbuilt** |
| §16B *"Price context — reuse Phase 03–05 services"* | Phase 03–05 | Phase 03 exists; 04 and 05 do not |
| §27 acceptance test step 11 *"Open the commodity's historical price chart"* | Phase 05 `/charts` | Phase 02 `/charts` exists; the Phase 05 workspace does not |
| §16 route `/fundamentals/[commodity-slug]` | Phase 04 commodity profiles | Phase 02 `/commodities/[slug]` exists |

The available integration surface is the **Phase 02** build: `/commodities/[slug]`
and `/charts`. Those are real, working routes and can be integrated with. They are
not the Phase 04/05 structures the brief describes.

---

## 3. Third finding: no external integration exists

§19 asks for a controlled integration layer. There is nothing to extend.

| Requirement | Status |
|---|---|
| External API clients | **none exist** |
| Ingestion adapters | **none exist** |
| `ingestion_jobs` / `ingestion_logs` tables | **do not exist** |
| `scheduled_job_runs` | exists, **0 rows** — the only ingestion-shaped table |
| `price_source_registry` | 3 rows: `agent_app`, `manual_entry`, `legacy_import` |

`price_source_registry` is the closest thing to a source catalogue. Its three
entries are all *internal* collection channels; none is an external statistical,
meteorological or policy source. §19's source categories — NiMet, NBS, FAO, USDA,
CBN, BCEAO, Nigeria Customs, ECOWAS, WTO — have **no representation in the
database at all**.

The brief anticipates this: §28 says *"When external data is unavailable, build a
controlled manual evidence-entry workflow rather than fabricating a live
integration."* That is the only compliant path, and it is the path recommended
below.

---

## 4. What does exist and is reusable

### 4.1 The honest fundamentals surface

`/trade/fundamentals` (308 lines, Phase 02) reads `getFundamentalSignals()`, which
queries `observation_market_intelligence`. With 0 rows it renders
`EmptyStatePanel kind="no-fundamentals"`.

This is already the correct behaviour and it is already shipped. Phase 07 should
**extend** this route into the `/fundamentals` workspace rather than build a
competing one — §2 says *"Do not duplicate existing modules."*

### 4.2 RBAC, which §18 needs

The role model already contains the boundaries §18 asks for:

| Role | Present | Phase 07 use |
|---|---|---|
| `analyst` | **yes** | research analyst / data contributor |
| `verification_officer` | yes | research reviewer |
| `admin`, `super_admin` | yes | research publisher, administrator |

Supporting infrastructure that already exists:

- `requireRole(roles, returnTo)` — `src/lib/auth/guards.ts`
- `isStaffRole(role)` — includes `analyst`
- `hasOperationsAccess(role)`
- `profiles.role` — a USER-DEFINED enum column
- `audit_logs` — 6 rows, the existing audit trail
- `scheduled_job_runs` — ingestion-shaped, unused

**§18's permission boundaries map onto roles that already exist.** No new role
type is required, and §28's *"Do not grant additional privileges to existing users
automatically"* is satisfied by not touching the role enum.

### 4.3 Services Phase 07 can reuse

| Service | Location | Phase 07 use |
|---|---|---|
| `getCommodityFreshness` | `src/lib/trade/queries.ts` | §16B price context |
| `getCommodityOpportunities` | `src/lib/trade/queries.ts` | §16B market comparison |
| `getMarketMovements` | `src/lib/trade/queries.ts` | §15 price movement linkage |
| `getFundamentalSignals` | `src/lib/trade/queries.ts` | the existing field-intelligence reader |
| `assessFreshness` / `freshnessOf` | `src/lib/market/freshness.ts` | freshness — **never add a fourth computation** |
| `seriesKeyId` | `src/lib/trade/series.ts` | comparability, if a relationship touches prices |
| `getMarketWatch`, `getMarketCoverage` | `src/lib/market/*` | commodity/region context |

### 4.4 Design system and components

Phase 02's terminal components, the dark/editorial split §22 asks for, and
`EmptyStatePanel` with its `no-fundamentals` kind are all present and in use.

---

## 5. Identified blockers

| # | Blocker | Severity | Blocks | Resolvable by code? |
|---|---|---|---|---|
| P7-1 | **No fundamental data in any domain** | **P1** | §4–§14 entirely | **No** — requires evidence entry or integration |
| P7-2 | No tables for weather, policy, FX, logistics, production, supply, demand, evidence or assessment | **P1** | §3 A–H | **Partly** — schema can be added incrementally, but with 0 rows it stays an empty shell |
| P7-3 | Phase 04 and 05 unbuilt | **P1** | §15, §16B, §27 | **Partly** — can integrate with Phase 02 routes |
| P7-4 | No external integration layer | P2 | §19 | **Yes** — but §28 directs manual entry when sources are unavailable |
| P7-5 | `commodity_seasonality` empty | P2 | §5 | **No** |
| P7-6 | `observation_market_intelligence` empty | P2 | the existing fundamentals surface | **No** — the Field app has never written to it |
| P7-7 | No evidence-versioning or contradiction tables | P2 | §13, §23 | **Yes** — schema |
| P7-8 | 0 published price observations | P1 | §15's price-linkage demonstration | **No** — authorization |

**None of P7-1, P7-5 or P7-6 is resolvable by writing code.** They are
data-availability facts. The brief's own instruction applies: *"Never manufacture
fundamental data to make an intelligence report appear complete."*

---

## 6. Recommended architecture

Per §28, the evidence architecture comes first and source management comes before
AI analysis. The recommended sequence:

### Stage 1 — Evidence architecture (no data required)

Pure, fully testable code with no database dependency:

- The evidence domain model from §13: classification (10 values), status (8
  values), the timestamp set (publication, event, retrieval, verification), and
  versioning.
- The confidence framework from §14, as a documented, testable function over
  source quality, recency, geographic relevance, commodity relevance,
  **independent** source count, consistency, measurement quality and
  contradictory evidence.
- The relationship categories from §15, with the causal guard: a factor whose
  date overlaps a price movement is a *temporal association*, never a *directly
  documented impact*, unless documented impact evidence exists.
- The assessment vocabulary from §14: bullish, bearish, neutral, mixed,
  **insufficient evidence** — with the rule that insufficient evidence is a
  first-class result, not a failure.

This stage is deliverable now and is what §13 calls *"the most important component
of Phase 07."*

### Stage 2 — Schema and services (requires authorization)

Incremental, non-destructive migrations for the evidence, seasonal, policy, FX,
logistics, production, supply, demand, weather and assessment tables, plus RLS
policies that restrict unpublished evidence to staff. §20 requires migrations be
incremental and non-destructive; this stage is a schema change and therefore a
separate authorization.

### Stage 3 — Manual evidence entry (§28's fallback)

The admin workflow §18 describes: create evidence, associate commodities and
regions, attach sources, verify, record contradictions, publish. This is the only
compliant way to get data in while P7-1 and P7-4 stand.

### Stage 4 — AI-assisted analysis (§21)

Only after the evidence architecture exists, only server-side validated, only
referencing evidence already in the application, and never auto-published.

---

## 7. Decision requested

Phase 07's discovery is complete. **Implementation has not started.**

The phase has an unusual shape: its entire subject matter is absent from the
database, and two of its dependencies were never built. Building the §4 dashboard,
the §16 commodity reports and the §15 price overlays now would produce exactly
what §1 forbids — an intelligence report that appears complete while containing
nothing.

**Stage 1 is the exception and is genuinely deliverable now.** The evidence
architecture, the confidence framework and the relationship categories are pure
logic. They can be written and fully unit-tested against fixtures with no data at
all, and they are the foundation §28 says to establish first. When evidence
eventually exists, nothing about them changes.

Approval is requested on:

1. **Proceeding with Stage 1 now** — the evidence architecture, confidence
   framework and relationship categories as tested pure code.
2. **The status of Phases 04 and 05**, which Phase 07 depends on and which were
   never implemented. Options: implement them, defer them, or integrate Phase 07
   with the Phase 02 routes that exist.
3. **Whether to raise schema authorization for Stage 2**, since adding the
   fundamental-domain tables is a database change and outside what I should do
   unilaterally.
4. **Which external sources are actually available**, since §19's list is
   explicitly *"potential source categories, not a declaration that all
   integrations are available."* Without knowing which of NiMet, NBS, FAO, CBN or
   BCEAO we can legitimately access, the ingestion layer cannot be scoped.
