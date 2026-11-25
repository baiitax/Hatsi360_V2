# Phase 05 — Discovery and Analytics Readiness

**Phase:** 05 — Historical Market Analytics & Advanced Interactive Charting Engine
**Stage:** 1 of N (mandatory pre-implementation audit, §2)
**Date:** 2026-11-14
**Method:** privileged `pg` probe against the live database, plus inspection of the
existing charting implementation. Reproduce the database figures with
`node scripts/discovery-probe.mjs`.

> §23: *"Start with the existing data and implementation audit. Do not assume
> historical data is complete."* This document was produced before any
> implementation code was written. Every figure is measured.

---

## 1. Headline finding

**There is no history to analyse.**

Every one of the 16 commodities with observations has all of its observations on
**a single calendar day**. 29 commodity×market pairs, each holding exactly **2**
observations, each on **1** day.

This is not a query problem. It is what the data is.

| What Phase 05 asks for | What the data supports |
|---|---|
| Original observation series | 2 points, same day |
| Daily aggregation | 1 bucket |
| Weekly aggregation | 1 bucket |
| Monthly aggregation | 1 bucket |
| OHLC / candlestick | 1 candle per commodity×market |
| 7-period SMA | **impossible** — needs ≥7 observations |
| 14/30/50-period SMA | impossible |
| EMA, RSI, Bollinger Bands | impossible |
| Linear trend slope | undefined on 1 point |
| Period high / low / average | computable but over 2 same-day values |
| Market spread | computable — this is the one real analytical output |
| Indexed comparison | computable only against a 1-point baseline |

A "historical analytics environment" built on one day per commodity is a
decoration. The brief forbids exactly that: *"Do not build a decorative chart
dashboard."*

---

## 2. Second finding: Phase 04 was never implemented

Phase 05's brief depends on Phase 04 in three places:

- §2 requires auditing *"Phase 04 commodity intelligence."*
- §15 requires integrating the analytics engine with **Phase 04 commodity
  profiles** and an **"Explore Historical Analytics"** action on every profile.
- §22's acceptance test requires the user to *"Return to the maize commodity
  profile"* and *"Open the methodology for the selected chart."*

**`src/lib/commodity/` does not exist.** Phase 04 stopped after its discovery
document. I completed that discovery and requested approval on five points; the
Phase 05 brief arrived instead, so no approval decision is on record and no
Phase 04 code was written.

The commodity profile route `/commodities/[slug]` does exist — it is the Phase 02
build, 439 lines, rendering an identity header, movement between comparable
observations, comparable series, reporting markets and "also known as". That is
the integration point available today. It is **not** the Phase 04 profile the
brief describes, and it does not carry the eleven-section intelligence structure
§15 assumes.

This is recorded as a dependency gap, not hidden. Phase 05 can integrate with the
Phase 02 profile; it cannot integrate with a Phase 04 profile that does not
exist.

---

## 3. Third finding: no published observation exists

Restated because it gates everything: **all 58 rows in `price_observations` carry
`source_system = 'test_fixture'`, and none has a non-null `published_at`.** The
public view `published_price_observations` returns **0 rows**.

Every public Phase 05 surface must read that view. So even the market spread —
the one computable analytical output — has no data to compute from.

---

## 4. Existing implementation audit

### 4.1 Charting

| Fact | Value |
|---|---|
| Library | **recharts 3.10.1** — already a dependency, already in use |
| Components | `src/components/charts/ChartFrame.tsx`, `PeriodRangeChart.tsx` |
| `/charts` route | exists, 416 lines, Phase 02 build |
| Chart types in use | line + area; `PeriodRangeChart`'s caption states *"This is dispersion, not a trading range"* |
| Scatter, candlestick, range, comparison | **not implemented** |
| Export | **not implemented anywhere** — no CSV, PNG or SVG export exists in the codebase |

**Conclusion: recharts is suitable and is reused.** §6 says *"Reuse the current
library if it is suitable. Avoid adding unnecessary charting dependencies."* No
new charting dependency is required. Export is net-new work.

### 4.2 Analytics services that already exist

| Service | Location | What it does | Phase 05 relevance |
|---|---|---|---|
| `seriesKeyId` | `src/lib/trade/series.ts` | comparability — the single definition | reuse, never re-declare |
| `buildCandles` | `src/lib/trade/candles.ts` | OHLC + daily/weekly/monthly/quarterly bucketing, gap detection, degenerate-candle flagging | **the aggregation engine already exists** |
| `validateSeries` | `src/lib/trade/candles.ts` | refuses incomparable series before aggregating | reuse |
| `partition` | `src/lib/trade/queries.ts` | groups observations by series key | reuse |
| `getCommoditySeries` | `src/lib/trade/queries.ts` | narrows to the dominant comparable series, then builds candles | the §5 aggregation entry point |
| `getCommoditySeriesOptions` | `src/lib/trade/queries.ts` | the filter options for the chart | reuse |
| `getCommodityOpportunities` | `src/lib/trade/queries.ts` | spread and best prices | §9 spread |
| `getMarketMovements` | `src/lib/trade/queries.ts` | movement rows grouped by series | §11 movement |
| `classifyFreshness` | `src/lib/trade/freshness.ts` | age classification | reuse |
| `assessFreshness` / `freshnessOf` | `src/lib/market/freshness.ts` | the Phase 03 mapping | **never add a fourth age computation** |

**`buildCandles` is the most important finding in this section.** The OHLC
aggregation Phase 05 §8 specifies in detail — open = earliest, high = highest,
low = lowest, close = latest, with a stable tie-break so the close is not
whichever row the database returned first — **is already implemented and
already handles the tie-break case**. It also flags degenerate candles and
detects gaps.

What it does **not** do, and Phase 05 must add:

- a `scatter` / original-observation view (it only produces candles)
- SMA, EMA, RSI, Bollinger Bands
- indexed commodity comparison
- CSV/PNG/SVG export
- per-chart methodology metadata

### 4.3 Timezone handling

`buildCandles` buckets by UTC date. There is **no market-local timezone policy**
anywhere in the codebase, and `markets` has no timezone column. §7 requires *"an
explicit timezone policy"* for daily aggregation.

The honest position: the platform stores UTC and buckets in UTC. Nigeria is
UTC+1 with no DST, so a UTC day boundary and a Lagos day boundary differ by one
hour. Observations are timestamped 19:24–23:19 UTC, which is 20:24–00:19 Lagos —
so **a UTC day and a Lagos day do not contain the same observations** for
late-evening collections. This must be documented as a known limitation and the
policy stated explicitly, not left implicit.

### 4.4 Timestamp ties

58 observations share only **12 distinct timestamps**. Within a single day, up to
5 observations share an identical `collected_at`.

For OHLC this matters: *"Open = earliest eligible observed price. Close = latest
eligible observed price."* When timestamps tie, "earliest" and "latest" are not
defined by time. `buildCandles` resolves this with a deterministic tie-break on
`id` — which is stable and reproducible but **arbitrary**. This must be stated in
the methodology, because a candlestick whose open and close depend on an id
comparison is not a sequence a market established.

---

## 5. Historical data readiness assessment

§2 requires this table be filled from database evidence. It is. Only the 29
commodity×market pairs that hold any observation are listed; the remaining 6
markets hold none.

| Commodity | Market | Obs | Published | Earliest | Latest | Days | Price types | Grades | Units | Currencies | Missing periods | OHLC eligibility | Indicator eligibility |
|---|---|--:|--:|---|---|---:|--:|--:|---|---|---|---|---|
| Brown Beans (Oloyin) | Mile 12 | 2 | **0** | 2026-10-28 | 2026-10-28 | 1 | 2 | 1 | bag | NGN | all but 1 | **Ineligible** | **Ineligible** |
| Groundnut | Funtua | 2 | **0** | 2026-10-28 | 2026-10-28 | 1 | 1 | 1 | bag | NGN | all but 1 | **Ineligible** | **Ineligible** |
| Groundnut | Sokoto Central | 2 | **0** | 2026-10-28 | 2026-10-28 | 1 | 2 | 1 | bag | NGN | all but 1 | **Ineligible** | **Ineligible** |
| Gum Arabic GR-I | Sokoto Central | 2 | **0** | 2026-10-28 | 2026-10-28 | 1 | 2 | 1 | **kg** | NGN | all but 1 | **Ineligible** | **Ineligible** |
| Imported Rice | Mile 12 | 2 | **0** | 2026-11-10 | 2026-11-10 | 1 | 2 | 1 | bag | NGN | all but 1 | **Ineligible** | **Ineligible** |
| Imported Rice | Zaki Biam | 2 | **0** | 2026-11-10 | 2026-11-10 | 1 | 2 | 1 | bag | NGN | all but 1 | **Ineligible** | **Ineligible** |
| Local Rice | Mile 12 | 2 | **0** | 2026-11-10 | 2026-11-10 | 1 | 2 | 1 | bag | NGN | all but 1 | **Ineligible** | **Ineligible** |
| Local Rice | Zaki Biam | 2 | **0** | 2026-11-10 | 2026-11-10 | 1 | 2 | 1 | bag | NGN | all but 1 | **Ineligible** | **Ineligible** |
| Maize (White) | Dawanau | 2 | **0** | 2026-11-10 | 2026-11-10 | 1 | 2 | 1 | bag | NGN | all but 1 | **Ineligible** | **Ineligible** |
| Maize (White) | Funtua | 2 | **0** | 2026-11-10 | 2026-11-10 | 1 | 1 | 1 | bag | NGN | all but 1 | **Ineligible** | **Ineligible** |
| Maize (White) | Sokoto Central | 2 | **0** | 2026-11-10 | 2026-11-10 | 1 | 2 | 1 | bag | NGN | all but 1 | **Ineligible** | **Ineligible** |
| Maize (Yellow) | Dawanau | 2 | **0** | 2026-11-10 | 2026-11-10 | 1 | 2 | 1 | bag | NGN | all but 1 | **Ineligible** | **Ineligible** |
| Maize (Yellow) | Funtua | 2 | **0** | 2026-11-10 | 2026-11-10 | 1 | 2 | 1 | bag | NGN | all but 1 | **Ineligible** | **Ineligible** |
| Maize (Yellow) | Sokoto Central | 2 | **0** | 2026-11-10 | 2026-11-10 | 1 | 1 | 1 | bag | NGN | all but 1 | **Ineligible** | **Ineligible** |
| Millet | Dawanau | 2 | **0** | 2026-11-10 | 2026-11-10 | 1 | 2 | 1 | bag | NGN | all but 1 | **Ineligible** | **Ineligible** |
| Millet | Funtua | 2 | **0** | 2026-11-10 | 2026-11-10 | 1 | 2 | 1 | bag | NGN | all but 1 | **Ineligible** | **Ineligible** |
| Millet | Sokoto Central | 2 | **0** | 2026-11-10 | 2026-11-10 | 1 | 2 | 1 | bag | NGN | all but 1 | **Ineligible** | **Ineligible** |
| Paddy Rice | Mile 12 | 2 | **0** | 2026-11-10 | 2026-11-10 | 1 | 1 | 1 | bag | NGN | all but 1 | **Ineligible** | **Ineligible** |
| Paddy Rice | Zaki Biam | 2 | **0** | 2026-11-10 | 2026-11-10 | 1 | 2 | 1 | bag | NGN | all but 1 | **Ineligible** | **Ineligible** |
| Sesame Seed | Sokoto Central | 2 | **0** | 2026-10-28 | 2026-10-28 | 1 | 2 | 1 | bag | NGN | all but 1 | **Ineligible** | **Ineligible** |
| Sorghum (Red) | Dawanau | 2 | **0** | 2026-10-28 | 2026-10-28 | 1 | 2 | 1 | bag | NGN | all but 1 | **Ineligible** | **Ineligible** |
| Sorghum (Red) | Funtua | 2 | **0** | 2026-10-28 | 2026-10-28 | 1 | 2 | 1 | bag | NGN | all but 1 | **Ineligible** | **Ineligible** |
| Sorghum (White) | Dawanau | 2 | **0** | 2026-10-28 | 2026-10-28 | 1 | 2 | 1 | bag | NGN | all but 1 | **Ineligible** | **Ineligible** |
| Sorghum (White) | Funtua | 2 | **0** | 2026-10-28 | 2026-10-28 | 1 | 2 | 1 | bag | NGN | all but 1 | **Ineligible** | **Ineligible** |
| Soya Beans | Mile 12 | 2 | **0** | 2026-10-28 | 2026-10-28 | 1 | 2 | 1 | bag | NGN | all but 1 | **Ineligible** | **Ineligible** |
| Soya Beans | Zaki Biam | 2 | **0** | 2026-10-28 | 2026-10-28 | 1 | 2 | 1 | bag | NGN | all but 1 | **Ineligible** | **Ineligible** |
| Sweet Potato | Zaki Biam | 2 | **0** | 2026-10-28 | 2026-10-28 | 1 | 2 | 1 | bag | NGN | all but 1 | **Ineligible** | **Ineligible** |
| Wheat | Dawanau | 2 | **0** | 2026-10-28 | 2026-10-28 | 1 | 2 | 1 | bag | NGN | all but 1 | **Ineligible** | **Ineligible** |
| White Beans | Mile 12 | 2 | **0** | 2026-10-28 | 2026-10-28 | 1 | 2 | 1 | bag | NGN | all but 1 | **Ineligible** | **Ineligible** |

### 5.1 Reading the table

- **`Published` is 0 for every row.** This alone blocks every public chart.
- **`Days` is 1 for every row.** Even with publication, no commodity has a second
  day, so no interval — original, daily, weekly or monthly — produces more than
  one bucket.
- **OHLC is Ineligible for every row**, on two independent grounds: §8's condition
  11 (*"whether the bucket methodology is meaningful for the collection
  frequency"*) fails because one bucket is not a series, and the open/close
  ordering within the bucket rests on an `id` tie-break (§4.4), not on a sequence
  the market established.
- **Indicator eligibility is Ineligible for every row.** A 7-period SMA needs 7
  observations in a series; the maximum is 2, on one day.
- **Data quality is otherwise clean**: 0 duplicate series+timestamp groups, 0
  non-positive prices, 0 null amounts, `minute` precision on all 58 rows, 1
  currency, 1 grade per commodity. There is no quality defect to fix — there is
  simply no volume of data.
- **Gum Arabic GR-I is the only pair in `kg`**; the other 28 are in `bag`. So a
  cross-market comparison of Gum Arabic against anything else is unit-incompatible,
  and with `commodity_unit_conversions` empty there is no approved factor.

### 5.2 The one analytical output the schema supports

**Market spread** (§9): *"Highest comparable observed price − Lowest comparable
observed price."* Maize (White) has observations in three markets, so a spread is
computable in principle. It is a gross observed price difference, not profit, and
it requires publication before it can be shown.

**Indexed comparison** (§10) is computable in principle but degenerate: with one
observation per series, the base value and the current value are the same
observation, so every index is 100. Showing a flat 100 line as "indexed
performance" would be misleading rather than informative.

---

## 6. Identified blockers

| # | Blocker | Severity | Blocks | Resolvable by code? |
|---|---|---|---|---|
| P5-1 | 0 published observations; all 58 rows are `test_fixture` | **P1** | every public chart, comparison, indicator and export | **No** — authorization |
| P5-2 | 1 observation day per commodity | **P1** | all intervals, OHLC, all indicators, trend | **No** — data collection |
| P5-3 | Phase 04 never implemented | **P1** | §15 profile integration, §22 acceptance test | Partly — can integrate with the Phase 02 profile, but not the Phase 04 one |
| P5-4 | 12 distinct timestamps for 58 observations; ties within a day | P2 | §8 open/close ordering | Documented limitation; `buildCandles` already tie-breaks deterministically |
| P5-5 | No timezone policy; `markets` has no timezone column | P2 | §7 daily aggregation boundary | Documented limitation; UTC bucketing stated explicitly |
| P5-6 | No export capability exists | P2 | §13 | **Yes** — net-new build, and testable without data |
| P5-7 | `commodity_unit_conversions` empty | P2 | §9 unit normalization | **No** — and refusing conversion is the compliant behaviour |
| P5-8 | Gum Arabic GR-I in `kg`, all others in `bag` | P3 | cross-market unit comparability | **No** |

---

## 7. Recommended architecture

Build the analytical engine as **pure, tested functions** plus a thin service
layer, extending what exists rather than replacing it.

```
src/lib/analytics/
  series.ts      original-observation series + gap detection
  aggregate.ts   daily / weekly / monthly buckets   (wraps buildCandles)
  ohlc.ts        OHLC eligibility evaluation        (new; buildCandles builds)
  movement.ts    absolute & percentage change       (extends src/lib/market/movements.ts)
  indicators.ts  SMA, EMA, RSI, Bollinger           (pure functions)
  index.ts       indexed commodity comparison
  spread.ts      market spread                      (wraps getCommodityOpportunities)
  export.ts      CSV + metadata serialisation
  metadata.ts    per-chart methodology record
```

Rules carried forward and still in force:

- Comparability is `seriesKeyId`. Never re-declared.
- Freshness is `assessFreshness` / `freshnessOf`. Never a fourth computation.
- Public reads go through the public view, never `price_observations` directly.
- A figure that cannot be computed returns `null` plus a reason. Never `0`, never
  `Infinity`, never a placeholder.
- Derived analytics are labelled derived, distinct from source observations.
- No traded volume, ever — not from observation counts, agent counts, visit
  counts or record counts (§8, §18).

### 7.1 What is buildable and testable now

The pure functions in §7 can be implemented and **fully unit-tested against known
fixtures**, with no database data at all. That is the same approach Phase 03 took
for movements: 29 tests pinning the formula, the comparability refusals and the
zero-denominator case, all against fixtures. When publication happens, the
workspace needs no code change.

### 7.2 What can only ever render a limitation state

Until P5-1 and P5-2 are resolved by data, the workspace can show:

- the control panel, fully functional, with real commodity/market/grade/price-type
  options from the catalogue
- a named empty state for the chart, stating which of P5-1 / P5-2 applies
- the methodology panel, fully populated — this is real content, not a placeholder
- the OHLC option **disabled with the reason**, per §22's explicit requirement:
  *"If the user requests a candlestick view for an ineligible dataset, the system
  must explain why it is unavailable and provide the appropriate line or
  observation-range alternative."*

---

## 8. Decision requested

Phase 05's audit is complete. **I have not started implementation**, because the
audit surfaces a fork that is not mine to decide.

**Option A — build the engine and the limitation states.** Implement §7's pure
functions with full test coverage, build the `/charts` control panel against the
real catalogue, render honest limitation states for every chart type, and write
the methodology documents. The workspace is real and correct; every chart is an
empty state until data exists. This is the Phase 03 pattern and needs no new
authorization.

**Option B — resolve Phase 04 first.** Phase 05 §15 and §22 depend on Phase 04.
Implementing Phase 04's commodity intelligence before Phase 05 would give the
analytics workspace a proper integration target. Phase 04 has its own blockers
(its discovery document lists ten), all data-side.

**Option C — raise the data blockers first.** P5-1 (publication) and P5-2 (one
day per commodity) gate everything. Without them, Phase 05 delivers a
methodology and an engine, and no visible analytics.

My recommendation is **A, then B, then C** — or A and C in parallel, since A's
pure functions are exactly what makes publication-later need no code change, and
C is an authorization decision that does not block writing code.

What I will not do is build a chart workspace that draws lines, candles or
indicators over one day of test-fixture data, because that is the decorative
dashboard the brief prohibits in its opening paragraph.

**Approval is requested on which option to take, and on whether Phase 04's five
approval requests from its discovery document are granted, deferred or declined.**
