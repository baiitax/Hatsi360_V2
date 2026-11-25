# Phase 03 — Stage 2: Homepage Implementation

**Phase:** 03 — Homepage & Global Market Intelligence
**Stage:** 2 of 3 (implementation)
**Status:** COMPLETE, pending explicit approval before Phase 04
**Date:** 2026-11-14

---

## 1. What was built

The homepage is now a working African agricultural market intelligence terminal.
Every figure on it is derived from a record, every comparison is bounded by the
comparability engine, and every empty section explains itself rather than being
filled.

### 1.1 The page, in the order Phase 03 asks for it

| § | Section | Source | Behaviour when the data is absent |
|---|---|---|---|
| 4 | Global search | `search.ts` → `/api/search` | "Enter at least 2 characters"; a no-match states that a commodity in the catalogue is not a commodity with a published price |
| 5 | Market overview | `overview.ts` | Six metrics, each with its definition and source; a metric the platform cannot answer is toned down and says why |
| 6 | Market watch | `watch.ts` + `movements.ts` | `no-market-data` empty state, which explains what publication means |
| 7/8 | Gainers & decliners | `movements.ts` | The movement service's own `emptyReason`, not a blank panel |
| 9 | Market comparison | `comparison.ts` | `no-comparison` empty state plus a note on why no regional aggregate is computed |
| 11 | Recent observations | `activity.ts` | `no-observations` empty state, capped at 8 |
| 10 | Coverage & freshness | `coverage.ts` + `overview.ts` | Configured and reporting markets shown as two separate numbers, never summed |

### 1.2 Files added

| File | Purpose |
|---|---|
| `src/lib/market/index.ts` | The service barrel. Documents, per module, what was added and what was reused. |
| `src/lib/market/overview.ts` | The six overview metrics, each with `detail`, `definition`, `source` and a populated `unavailableReason`. |
| `src/lib/market/watch.ts` | The latest qualifying observation per series, filterable and sortable. |
| `src/lib/market/movements.ts` | Daily and weekly movements, with eligibility and the zero-denominator case handled. |
| `src/lib/market/comparison.ts` | One commodity across markets. The benchmark is the median. |
| `src/lib/market/activity.ts` | The recent-observation feed, hard-capped at 50. |
| `src/lib/market/coverage.ts` | Configured and reporting markets, by state. |
| `src/lib/market/search.ts` | Commodity, market and state discovery, server-side. |
| `src/lib/market/freshness.ts` | **The single mapping** from the engine's 7-value `PriceState` onto the 5-value `FreshnessState`. |
| `src/app/api/search/route.ts` | The search endpoint. No corpus reaches the browser. |
| `src/components/market/GlobalSearch.tsx` | The search UI: a real combobox, debounced, with three distinct empty/loading/failed states. |

### 1.3 Files changed

| File | Change |
|---|---|
| `src/app/(site)/page.tsx` | Rewritten onto the new services. The old page computed `observedMarketCount` from the **markets table**, so it reported all 11 configured markets as reporting. It also passed `changePercent: null` for every watch row, so the movement column was a column of dashes. Both are fixed. |
| `src/components/market/MarketWatchTable.tsx` | Added the **Price type**, **Daily** and **Weekly** columns §6.1 requires. `showWeekly` suppresses the weekly column when the platform cannot compute one, so the column is absent rather than a column of unexplained dashes. |
| `src/components/market/MarketOverview.tsx` | `MarketOverviewCard` now accepts a `definition`, rendered behind a `<details>` disclosure. §5.2 requires every metric be defined, not implied. |
| `src/components/terminal/TerminalShell.tsx` | `SectionHeader` now wraps and shrinks. A section heading with a long action label overflowed a 360px phone by 16px. |
| `eslint.config.mjs` | The unused-vars rule is scoped to `**/*.ts`/`**/*.tsx`. Applied to every file, it made `eslint .` fail at configuration load the moment a plain `.mjs` file entered the tree. |

---

## 2. The three defects found and fixed during implementation

These were found by writing the code, not by a review afterwards. They are
recorded because each one was a way the page could have lied.

### 2.1 Reporting markets counted from a one-row sample

`overview.ts` derived the set of reporting markets from
`listObservations({ page: 1, pageSize: 1 })`. A distinct count over one row is
either 0 or 1, whatever the database holds. The headline metric of the phase —
the difference between configured and reporting markets — was therefore
structurally incapable of being right.

Fixed by reading the whole public view through `listObservationsForAnalysis`,
which is the accessor that returns the view without a limit. The distinct
markets and the distinct observed commodities are both counted from it.

### 2.2 Three divergent freshness computations

`watch.ts`, `comparison.ts` and `coverage.ts` each carried their own `classify()`
helper, with different thresholds. One called a six-hour-old observation
`today`; another called it `fresh`. The same observation would have been
described differently depending on which section of the homepage you were
reading.

Fixed by `freshness.ts`, which is the only place a `PriceState` becomes a
`FreshnessState`. All three services now call `freshnessOf()`. The invariant is
recorded as a test, and the rule for future work is: **never add a fourth age
computation — route through `assessFreshness()`**.

The test that caught it (`tests/market/movements.test.ts`) had itself
re-implemented the age arithmetic locally, so it passed while the services
disagreed. The test now exercises the real mapping.

### 2.3 `latest_verified` requires a verified status

Writing the freshness test against the real engine revealed an assumption worth
recording: `latest_verified` is not "old but within the horizon", it is "old but
**verified**". An unverified observation past the fresh window is `delayed`, not
`latest_verified`. `assessFreshness()` now accepts and forwards
`verificationStatus` so the engine can make that distinction, and `watch.ts`
passes it through from the observation.

---

## 3. Acceptance criteria — how each is met

| Criterion | How it is met | Where it is enforced |
|---|---|---|
| Metrics derived from actual records | Every metric is a count over a query result. Nothing is seeded, sampled or estimated. | `overview.ts` |
| Configured markets distinguished from active reporting markets | Two separate metrics, two separate numbers, never summed. The coverage panel states the difference in prose rather than as a third measured count. | `overview.ts`, `coverage.ts` |
| A commodity existing ≠ having a current price | "Commodities observed" is counted from the public view, not the catalogue. The overview card's definition says so explicitly. | `overview.ts` |
| Never compare across price type, grade, unit, currency or market | Comparability is `seriesKeyId` from `src/lib/trade/series.ts`, the single definition. The watch dedupes on a 7-field series key; movements match on the series. | `watch.ts`, `movements.ts` |
| No fabricated movements | A movement needs two comparable observations. `changePercent` is `null` when it cannot be calculated, which renders "no comparison" — never 0%. | `movements.ts` |
| Never present indicative prices as verified or offers as completed trades | `indicative` maps to `delayed`, never `fresh`. No offer table is read by any Phase 03 service. | `freshness.ts` |
| Freshness from the observation timestamp, not page load | `freshnessOf(collectedAt)`. The page states, in the coverage panel, that freshness is measured from the observation and never restated as real-time. | `freshness.ts` |
| No real-time labelling | The word does not appear on the page. `live_feed` maps to `fresh`, whose label is "Recently observed". | `freshness.ts` |
| Empty sections hidden or explained rather than filled | Every empty section renders a named `EmptyStateKind` or the service's own `emptyReason`. | `page.tsx` |

---

## 4. What Phase 03 does not claim

These are stated on the page or in the code comments, not just here.

1. **No published observation exists.** Every public surface reads
   `published_price_observations`, which holds 0 rows. The watch is empty, the
   movers are empty, the comparison is not attempted, and the feed is empty. Each
   says so and explains what publication means.
2. **No regional or national aggregate.** `market_zones` is empty and there is
   one market per state, so there is nothing to aggregate over. The comparison
   carries a `notComputed[]` array naming each figure it declined to compute.
3. **No volume, no trade flow, no bid/ask.** The schema does not hold them.
4. **No map.** 11 markets have 0 lat/lng and 0 zone.
5. **No national price.** The comparison benchmark is the median of the markets
   compared, labelled "Median of N compared markets".

---

## 5. Verification

| Gate | Result |
|---|---|
| `tsc --noEmit` | exit 0 |
| `eslint` on Phase 03 paths | 0 errors, 0 warnings |
| `next build` | exit 0, 47/47 pages |
| `vitest run` | 816 passed / 1 failed (pre-existing `fixture-isolation`) / 28 skipped |
| `npm run lint` | 12 errors, 39 warnings — **all 12 in pre-existing Phase 01 files**, 0 in Phase 03 |
| Responsive gate | **56/56** at 8 widths × 7 routes |
| Homepage HTTP | 200 |
| Console errors on homepage | none |

### 5.1 The figures the homepage reports, against the live database

| Metric | Page | Live database | Agrees |
|---|---|---|---|
| Tracked commodities | 21 | 22 commodities, 21 active | yes |
| Configured markets | 11 | 11 markets, all active | yes |
| Reporting markets | 0 | 0 rows in the public view | yes |
| Published observations | 0 | 0 rows in the public view | yes |
| Commodities with movement | 0 | no comparable pair exists | yes |
| Commodities observed | 0 | 0 rows in the public view | yes |

The page is correct precisely because it reports zeros where the database holds
zeros. A page showing non-zero figures here would be the defect.

### 5.2 The responsive defect found and fixed

`/insights` overflowed a 360px viewport by 16px: a `SectionHeader` action
labelled "How we separate observation from analysis" was 285px wide, and neither
the title nor the action was allowed to move to its own line. Fixed with
`flex-wrap` and `min-w-0` on both children. The action keeps its full label
rather than being truncated — a truncated action is worse than a stacked one.

---

## 6. What publication would change

The implementation is written against the real query path, so publishing rows
requires **no code change**. When observations are published:

- the watch fills from the same query, with the same series deduplication;
- movements appear wherever two comparable observations exist, and stay absent
  where they do not;
- the comparison appears once one commodity has a published price in two or more
  markets, and the benchmark is computed then, not now;
- the feed fills to its cap;
- the coverage panel's "No market is reporting" paragraph is replaced by the
  reporting list, because it is conditional on the data.

Nothing in the page hard-codes a zero, and nothing hard-codes a non-zero.
