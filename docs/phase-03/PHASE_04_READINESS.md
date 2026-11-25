# Phase 04 Readiness

**Phase 03 — Homepage & Global Market Intelligence: COMPLETE**
**Next:** Phase 04 — Commodity Intelligence
**Status: Phase 03 is complete and awaiting explicit approval before Phase 04
begins.** Per §2.2, approval is not publication, and this document does not
constitute approval to proceed.

---

## 1. What Phase 03 delivered

| Deliverable | Status |
|---|---|
| `docs/phase-03/00_STAGE1_AUDIT_AND_PLAN.md` | complete |
| `docs/phase-03/HOMEPAGE_IMPLEMENTATION.md` | complete |
| `docs/phase-03/MARKET_DATA_METHODOLOGY.md` | complete |
| `docs/phase-03/MARKET_QUERY_ARCHITECTURE.md` | complete |
| `docs/phase-03/HOMEPAGE_TEST_REPORT.md` | complete |
| `docs/phase-03/PHASE_04_READINESS.md` | this document |
| `src/lib/market/` — 8 modules | complete, type-clean, lint-clean |
| `src/app/api/search/route.ts` | complete |
| `src/components/market/GlobalSearch.tsx` | complete |
| `src/app/(site)/page.tsx` | rewritten onto the services |

### 1.1 Verification gates

| Gate | Result |
|---|---|
| `tsc --noEmit` | exit 0 |
| `eslint` on Phase 03 paths | 0 errors, 0 warnings |
| `next build` | exit 0, 47/47 pages |
| `vitest run` | 816 passed / 1 pre-existing failure / 28 skipped |
| `npm run lint` | 12 errors, **all in pre-existing Phase 01 files**, 0 in Phase 03 |
| Responsive gate | 56/56 at 8 widths × 7 routes |
| Homepage | HTTP 200, no console errors |

---

## 2. Implementation status matrix

### 2.1 Phase 03 sections

| § | Section | Status | Note |
|---|---|---|---|
| 4 | Global search | **working** | Server-side, debounced, three distinct empty/loading/failed states |
| 5 | Market overview | **working** | 6 metrics, each with definition and source |
| 6 | Market watch | **working** | Latest per series; daily + weekly; price type |
| 7 | Gainers | **working** | Empty until publication |
| 8 | Decliners | **working** | Empty until publication |
| 9 | Regional comparison | **partial by data** | One commodity across markets; no regional aggregate (0 zone rows) |
| 10 | Coverage & freshness | **working** | Configured vs reporting, never summed |
| 11 | Recent observations | **working** | Bounded window, capped at 50 |
| 12 | (workspace) | **working** | Unaffected by the data blockers |
| 13 | Global search | **working** | §13.3 satisfied — no corpus to the browser |

### 2.2 The blockers, and what they block

| Blocker | Severity | Blocks | Phase 03 response |
|---|---|---|---|
| BLOCKER-1: `published_price_observations` = 0 rows | **P1** | §6, §7, §8, §9, §11 | Built against the real query path. Publication later needs **no code change**. |
| BLOCKER-2: `market_zones` = 0 rows, one market per state | P2 | §9 regional aggregates | Built as one commodity across markets. `notComputed[]` names what was declined. |
| BLOCKER-3: `observation_market_intelligence` = 0 rows | P3 | §10 fundamentals | The Phase 02 `no-fundamentals` empty state handles it. |

### 2.3 What is working today versus what is waiting on data

| Working now | Waiting on publication |
|---|---|
| Search (commodities, markets, states) | Watch rows |
| Overview: tracked commodities, configured markets | Overview: reporting markets, published observations, movement, observed |
| Coverage: configured vs reporting | Coverage: the reporting list |
| Freshness methodology and vocabulary | Any freshness figure |
| The comparison's `notComputed` disclosures | The comparison itself |
| All empty states | Nothing — they are the shipped behaviour |

---

## 3. What Phase 04 should reuse

Phase 04 is Commodity Intelligence. The following already exist and should not be
re-built.

| Existing | Phase 04 use |
|---|---|
| `seriesKeyId` (`src/lib/trade/series.ts`) | Comparability. The single definition. |
| `assessFreshness` / `freshnessOf` (`src/lib/market/freshness.ts`) | Age classification. **Never add a fourth computation.** |
| `getCommoditySeries` (`src/lib/trade/queries.ts`) | `CommoditySeriesRequest {commodityId, timeframe, marketId?, priceType?, gradeId?}` → `{candles, unavailableReason, observationCount, excludedCount, freshness}`. It is **not** a windowed series-list. |
| `getCommodityFreshness`, `getCommodityOpportunities`, `getCommoditySeriesOptions` | Already exist. |
| `Candle` | `{periodStart, periodEnd, open, high, low, close, observationCount, marketCount, sourceCount, isDegenerate, isCalculated, observationIds}` — **no `median`, no `id`, no `collectedAt`.** |
| `MarketWatchTable` / `MarketWatchCards` | The watch, already responsive. |
| `MarketOverviewCard` | Now accepts `definition`. |
| `PriceDisplay`, `PriceMovementIndicator`, `VerificationBadge` | Honest rendering of absent values. |
| `getPriceMovements({window: 'daily'|'weekly'})` | Movements, already series-scoped. |

### 3.1 API shapes that are easy to get wrong

Recorded so Phase 04 does not rediscover them:

- `MarketOverviewCard` has **no `caption`**. A `null` value renders "Not available".
- `PriceMovementIndicator` = `{change, changePercent, currencyCode?, size?, unavailableReason?, className?}` — **no `direction`/`currency`**. It derives direction from the sign and renders "No comparison" when either is null.
- `ProvenanceNotice` = `{source, collectedAt?, children?, className?}` — **no `title`/`body`**.
- `EmptyStateKind` is 10 kinds. **`'no-database'` and `'no-commodities'` do not exist.**
- `ReportScope` = `{categorySlugs?, priceType?, windowDays}` — no `label`/`commodity`.
- `Insight` = `{slug, title, excerpt, category, body: string[], publishedAt, readingMinutes, author}`.
- `PriceObservation` has **no `amount`/`displayAmount`**; the fields are `reportedAmount`, `normalizedAmount`, `reportedUnitId`, `normalizedUnitId`. Denormalised display names are all optional → `?? null`.
- `DataSource` has **no `listGrades()`**.
- `formatMoney(amount, options)` takes an **options object**, not a currency string.
- `isSupabaseConfigured` is in `src/lib/supabase/config.ts`, **not** re-exported from `src/lib/trade/index.ts`.
- `PageHeader({title, description, actions, meta, className})` — **no `eyebrow`/`purpose`**. `SectionHeader({title, count, action, href, className})` — **no `id`/`note`**.
- `DataFreshnessIndicator`'s prop is **`observedAt`**, no `compact`.

---

## 4. Open items Phase 04 inherits

### 4.1 Must be resolved before publication

| Item | Severity | Owner |
|---|---|---|
| Publish observations, or record a `legacy_unverified` decision | **P1** | Authorization — §2.2 says stop and report. Phase 03 did not publish. |
| Add the composite indexes on `(commodity_id, collected_at DESC)` and `(market_id, collected_at DESC)` | P2 | Schema change — separate authorization. |
| The live `fixture-isolation` test failure from demo-admin mutation | P0 | Recorded, not fixed. The assertion is not relaxed. |

### 4.2 Known and accepted

- `market_zones` is empty → no regional aggregate, no map.
- 11 markets have 0 coordinates → no map.
- `expire_lapsed_offers()` and `generate_collection_tasks()` are never called.
- An anon-key read of `price_observations` returns 0 rows (RLS, not emptiness) —
  privileged probes are node + `pg` with `SUPABASE_DB_*`.
- `0030_trade_table_grants.sql` grants `all` to `anon, authenticated` on the
  offer and audit tables. Phase 03 reads no offer table.

---

## 5. Standing constraints Phase 04 must keep

1. **No fabricated data.** A figure is a measurement over rows that exist.
2. **Configured ≠ reporting.** Never summed, averaged, or presented as one figure.
3. **A commodity existing ≠ having a current price.**
4. **Never compare across price type, grade, unit, currency or market.**
5. **No fabricated movements.** `null` renders "no comparison", never `0%`.
6. **Never present indicative prices as verified, or offers as completed trades.**
7. **Freshness from the observation timestamp, never from page load.**
8. **No real-time labelling.**
9. **Empty sections hidden or explained, never filled.**
10. **WCAG 2.2 AA, tabular numerals, honest empty states, no inactive buttons.**
11. **Approval ≠ publication.**

---

## 6. Request

Phase 03 is complete. **It stops here and waits for explicit approval before
Phase 04 (Commodity Intelligence) begins.**

Approval is requested for:

1. The Phase 03 deliverables listed in §1.
2. The decision to keep the homepage shipping with six zero metrics rather than
   publishing rows to make it look populated.
3. The two authorization items in §4.1 — publication and the indexes — to be
   raised separately, as they are not Phase 03 scope.
