# Phase 03 — Stage 1: Audit and Readiness

**Hatsi360 Markets · Market Terminal and Homepage Transformation**

Status: **COMPLETE — one blocker identified, one scope reduction required.**
Verified against the live database on the implementation date by read-only queries. Every count
below was measured.

---

## 1. Verification of the previous phases

Phase 03 §2 requires the previous deliverables to be verified rather than assumed. They were.

### 1.1 Phase 01 — present and accurate

| Document | Status |
|---|---|
| `docs/audits/phase-01/EXECUTIVE_SUMMARY.md` | ✅ |
| `DATABASE_AUDIT.md` | ✅ |
| `DATA_FLOW_AND_INTEGRATION_MAP.md` | ✅ |
| `FEATURE_STATUS_MATRIX.md` | ✅ |
| `PRICE_DATA_INTEGRITY_AUDIT.md` | ✅ |
| `SECURITY_AND_RLS_AUDIT.md` | ✅ |
| `REMEDIATION_BACKLOG.md` | ✅ |
| `TARGET_ARCHITECTURE.md` | ✅ |
| `PHASE_02_READINESS.md` | ✅ |
| `REPOSITORY_AND_ARCHITECTURE.md` | ✅ |
| `ROUTE_AND_FEATURE_INVENTORY.md` | ✅ |

11 documents, 2,007 lines, all measured against the live database.

### 1.2 Phase 02 — was incomplete at the start of Phase 03, now complete

**Finding, stated plainly:** at the moment Phase 03 began, `docs/design-system/hatsi360-markets/`
and `docs/audits/phase-02/IMPLEMENTATION_REPORT.md` **did not exist**. Phase 03's audit could not
read them because they had not been written.

The Phase 02 *code* was substantially complete and verified (tokens, component library, shell, page
prototypes, `tsc` clean, build clean, 787 tests passing). The *documentation* was not.

**Action taken:** the ten design-system documents and the Phase 02 implementation report were
written before Phase 03 implementation began, so that this audit reads verified documents rather
than assumptions. They are now present, and every value in them was read from the source.

Phase 02's implementation report records the verification gates, the seven defects they found, and
the honest statement that `npm run lint` is now restored and reports **10 pre-existing errors and
zero Phase 02 ones**.

---

## 2. The current state of the market data — measured

| Measure | Value | Phase 01 said | Verdict |
|---|---|---|---|
| `price_observations` | 58 rows | 58 | unchanged |
| `verification_status` | submitted 16 · **verified 12** · rejected 9 · draft 7 · pending 7 · correction_requested 7 | verified 11 | **+1** — the demo admin verified another fixture |
| `published_at IS NOT NULL` | **0** | 0 | unchanged |
| `published_price_observations` (public view) | **0 rows** | 0 | unchanged |
| Markets | 11, all active | 11 | unchanged |
| Markets with any observation | **5 of 11** | 5 | unchanged |
| Commodities | 22 (21 active) | 22 | unchanged |
| Commodities with any observation | **16 of 21** | 16 | unchanged |
| Latest `collected_at` | 2026-11-10T23:19:34Z | 2026-11-10 | unchanged |
| `observation_market_intelligence` | **0 rows** | 0 | unchanged |
| `market_zones` | **0 rows** | — | no zone hierarchy exists |
| States | 11, one market each | 11 | unchanged |

### 2.1 The public view, read exactly

```sql
WHERE o.is_current
  AND o.published_at IS NOT NULL
  AND (o.verification_status = ANY (ARRAY['verified','legacy_unverified']))
  AND COALESCE(o.source_system,'agent_app') <> 'test_fixture'
  AND COALESCE(o.source_reference,'') <> 'test_fixture'
```

Every public price surface reads this view. It returns **zero rows**, so every analytical section of
the terminal correctly reports that it has nothing.

**This is not a defect to be engineered around.** The platform has never published a price. Phase 01
established this, and Phase 02's page prototypes were built to render it honestly.

---

## 3. Blocker analysis (Phase 03 §2.2)

### 3.1 BLOCKER-1 — No published observations (R-08, P1)

**Issue.** `published_price_observations` holds 0 rows. Nothing has completed the publication act.

**Impact on Phase 03.** Phase 03 asks the homepage to show, immediately: what is happening today,
which commodities are moving, where prices are changing, which markets have the best comparable
prices, and what to investigate further.

| Phase 03 section | Blocked? | Why |
|---|---|---|
| §5 Global market overview | **Partially** | Commodity and market counts are real; observation and movement counts are 0. |
| §6 Commodity market watch | **Blocked** | The watch reads the public view. 0 rows. |
| §7 Daily / weekly movement | **Blocked** | Requires ≥2 comparable *published* observations per series. |
| §8 Gainers and decliners | **Blocked** | Requires a movement to rank. |
| §9 Regional comparison | **Blocked** | Requires ≥2 comparable published observations across markets. |
| §10 Market activity | **Partially** | Coverage counts are real; the published-observation feed is empty. |
| §11 Recently updated observations | **Blocked** | Reads the public view. |
| §12 Coverage and freshness | **Available** | 11 configured markets, 0 reporting — real and honest. |
| §13 Global search | **Available** | Commodities, markets and states all exist. |

**Minimum required remediation.** Publish the 12 `verified` observations. They have passed
verification; `published_at` is the separate act that has never been performed.

**Not done, and why.** Publishing is a data mutation on a production database. The standing rules
require inspection, backup, staging, count/RLS verification and rollback for migrations, and require
that **approval and publication remain separate acts**. Phase 03 does not grant authorization to
mutate production data, so the dependent implementation is **not** blocked from being *built* — it is
blocked from being *demonstrated with live data*.

**What is built instead.** Every section is implemented against the real query path. When publication
happens, the terminal shows real prices with **no code change**. The empty states are the product's
honest current behaviour, exactly as Phase 03 §21 requires.

### 3.2 BLOCKER-2 — No market zones (R-11 adjacent)

**Issue.** `market_zones` holds 0 rows. The 11 markets each sit in a different state, one per state.

**Impact.** §9 asks for regional comparison. With one market per state, a "regional" comparison is
eleven single-market rows. That is still a valid comparison — one commodity across markets — but it
is **not** a regional aggregate, and it must not be labelled as one.

**Decision.** The comparison is built as **one commodity across markets**, which is what the data
supports. Regional aggregation is **not** implemented, because a one-market "region" is not a region.
§9.4's requirement to document which markets were included and whether the average is weighted is
honoured by stating that no aggregate is computed at all.

### 3.3 BLOCKER-3 — No fundamental data

**Issue.** `observation_market_intelligence` holds 0 rows.

**Impact.** Phase 03 §10's activity feed has no field reports to show. The fundamentals surface
already renders an honest `no-fundamentals` empty state from Phase 02.

**Decision.** No change needed. The Phase 02 empty state is correct and names what would change it.

### 3.4 Not a blocker — the P0 demo-admin finding

Phase 01's P0 (always-visible demo admin credentials, and the admin having verified a fixture)
remains open. It is a **security** finding, not a Phase 03 dependency: it does not prevent the
terminal from being built, and it conflicts with a standing instruction, so it is surfaced rather
than actioned. The fixture-isolation test failure it causes is recorded as pre-existing.

---

## 4. Existing functionality identified for reuse (Phase 03 §2.1)

Phase 03 §16 says not to create unnecessary service files where equivalent functionality exists. It
largely does exist.

| Phase 03 asks for | Already exists | Action |
|---|---|---|
| `MarketOverviewService` | `getTerminalSummary()` in `src/lib/terminal/summary.ts`; `getCommodityFreshness()` | **Extend**, not duplicate. |
| `MarketWatchService` | `listObservationsForAnalysis()` in `src/lib/data/supabase.ts` — already reads the public view with filters | **Extend** with search/sort/pagination. |
| `PriceMovementService` | `getMarketMovements()` in `src/lib/trade/queries.ts` — already groups by series key | **Reuse as-is.** |
| `MarketMoversService` | `MarketMovers` component + `getMarketMovements()` | **Reuse.** |
| `RegionalComparisonService` | `getCommodityOpportunities()` — already computes spread, best buy, best sell with comparability | **Reuse.** |
| `MarketActivityService` | — | **New**, small. |
| `MarketCoverageService` | `getCommodityFreshness()`, `MarketCoverageSummary` | **Extend.** |
| `MarketSearchService` | — | **New.** |

The comparison-eligibility logic already exists in `src/lib/trade/series.ts` (`compareSeries`,
`areCompatible`, `seriesKeyId`) and `src/lib/trade/opportunities.ts`. **It is not re-implemented.**
This is the single most important reuse decision in Phase 03: the eligibility rules are already
correct, and a second implementation would be a second place to be wrong.

---

## 5. Index analysis for the new query patterns

Read from `pg_indexes`:

| Index | Definition | Serves |
|---|---|---|
| `published_idx` | `(published_at DESC) WHERE published_at IS NOT NULL` | The recency feed. ✅ |
| `collected_at_idx` | `(collected_at DESC)` | Ordering. ✅ |
| `commodity_market_idx` | `(commodity_id, market_id)` | Per-commodity/market lookups. ✅ |
| `type_idx` / `market_idx` / `status_idx` | single-column | Filters. ✅ |
| `duplicate_guard` | `(commodity_id, market_id, price_type, grade_id, reported_amount, reported_unit_id, …)` | Duplicate suppression. ✅ |

**Gap identified, not fixed:** there is **no composite index on `(commodity_id, collected_at DESC)`**
or `(market_id, collected_at DESC)`. The watch query filters by commodity and orders by recency, so
Postgres must choose between `commodity_market_idx` (which does not cover the sort) and
`collected_at_idx` (which does not cover the filter). At 58 rows this is irrelevant. At 58,000 it is
a sequential scan.

**Recommendation (not applied):** `CREATE INDEX CONCURRENTLY price_observations_commodity_recency_idx
ON price_observations (commodity_id, collected_at DESC);` — plus the market equivalent. This requires
authorization and is recorded in `MARKET_QUERY_ARCHITECTURE.md` rather than executed.

---

## 6. Implementation plan

| Stage | Scope | Status |
|---|---|---|
| 1 | Audit and readiness | ✅ this document |
| 2 | Market data foundation — extend the query layer with watch, activity, coverage and search services; verify RLS | next |
| 3 | Market overview metrics | |
| 4 | Market watch — search, filters, sort, pagination, responsive | |
| 5 | Market movers — daily, weekly, ranking, insufficient-data handling | |
| 6 | Regional comparison — one commodity across markets | |
| 7 | Market activity — recent published observations | |
| 8 | Global search | |
| 9 | Homepage assembly | |
| 10 | Testing and release readiness | |

---

## 7. What Phase 03 will not claim

Stated up front so the final report cannot be read as overclaiming:

- **No live prices.** There are none published. Every price surface renders its honest empty state.
- **No movements, gainers or decliners.** They require ≥2 comparable published observations.
- **No regional aggregates.** One market per state is not a region.
- **No performance improvement claims.** Measurements will be reported as measured, and "not
  measured" will be said where it was not measured.
- **No "real-time".** The platform collects on a cadence and publishes after verification.
