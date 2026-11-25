# Phase 03 — Market Data Methodology

**Phase:** 03 — Homepage & Global Market Intelligence
**Purpose:** The rules the homepage follows when it turns records into figures.
**Audience:** Anyone who has to defend a number on the page.

---

## 1. The one rule everything else follows from

**A figure on this platform is a measurement, not a description.** Every number
is a count, a sum, a difference or a statistic over rows that exist. When the
rows do not exist, the figure does not exist, and the platform says so.

This is why the homepage currently reports six zeros. It is not unfinished. It is
the honest version of a platform whose public view holds no rows.

---

## 2. What may be compared

Two prices may be compared only when they share a **series key**. The series key
is defined in exactly one place — `src/lib/trade/series.ts` — and it is:

```
commodity · market · price type · grade · reported unit · currency · variety
```

Seven fields. All seven must match. A `null` grade is its own value, distinct
from any grade, so a commodity with no recorded grade is not comparable with the
same commodity at a recorded grade.

### 2.1 What this rules out

| Tempting comparison | Why it is refused |
|---|---|
| Two grades of one commodity | Different series. Grade 1 and Grade 2 are different products. |
| Two units of one commodity | A 100kg bag and a tonne are not the same quantity. |
| Two currencies | Without a rate and a rate date, the difference is arithmetic, not economics. |
| Two markets | A price in Kano and a price in Lagos are different markets. Phase 03 §9 compares them **side by side**, which is legitimate, and does not net them into one figure. |
| Two price types | An indicative price and a wholesale price are different claims about the world. |
| Two varieties | As with grade. |

### 2.2 The consequence for movements

A movement needs **two observations in the same series**. The platform does not
estimate one, extrapolate one, or carry a price forward to manufacture one. When
the pair does not exist, `changePercent` is `null`, and the UI renders "no
comparison" — not `0%`, which would read as "the price did not move", and not
`Infinity`, which is not a number a person can use.

---

## 3. Freshness

Freshness is a property of **an observation**, measured from its collection
timestamp. It is never a property of the page, and it is never restated as
"real-time". A price collected this morning is this morning's price, whatever
time it is now.

### 3.1 The mapping, in one place

The engine's `PriceState` has eight values; the UI's `FreshnessState` has six,
including an explicit timestamp-review state. The mapping lives in
`src/lib/market/freshness.ts`:

| Engine `PriceState` | UI `FreshnessState` | Meaning |
|---|---|---|
| `no_data` | `unavailable` | No observation exists. |
| `stale` | `stale` | Older than the verification horizon. |
| `indicative` | `delayed` | Non-binding, **regardless of age**. |
| `latest_verified` | `today` | Past the fresh window but verified. |
| `delayed` | `delayed` | Past the fresh window, not verified. |
| `recently_updated` | `fresh` | Inside the fresh window. |
| `live_feed` | `fresh` | A realtime source, inside the window. |
| `future_timestamp` | `timestamp_review` | The observation time is invalid or later than the platform clock; do not call it current. |

When an observation has no declared collection cadence, callers must not silently assume daily collection. `classifyFreshness()` applies the documented no-cadence thresholds (30-day fresh window; 730-day verified horizon). Public price rows currently do not carry schedule cadence, so public freshness displays use that explicit fallback until a schedule is available.

Two entries in that table are load-bearing:

- **`indicative` → `delayed`, never `fresh`.** An indicative price is not a fresh
  one, however recent it is. This is the one direction the coarse mapping must
  not lose information.
- **`latest_verified` requires verification.** It is not "old but within the
  horizon"; it is "old but *checked*". An unverified observation past the fresh
  window is `delayed`.

### 3.2 The rule for future work

**Never add a fourth age computation.** Any new age threshold goes through
`assessFreshness()` / `freshnessOf()`. Three services previously each carried
their own `classify()` with different thresholds, and the same observation was
described as `today` by one and `fresh` by another. That was a real defect,
caught by a test that had itself re-implemented the arithmetic. The test now
exercises the real mapping.

---

## 4. The overview metrics

Six metrics. Each carries a `definition` — what it counts, in a sentence —
because §5.2 requires it be defined rather than implied.

| Metric | Definition | Source |
|---|---|---|
| Tracked commodities | Active commodity records available for monitoring. **A commodity being tracked does not mean it has a current market price.** | `commodities where is_active` |
| Configured markets | Active market records in the configured coverage. **A configured market is not necessarily a reporting market.** | `markets` |
| Reporting markets | Distinct markets appearing in the public view. This is the figure that describes actual coverage. | `published_price_observations` |
| Published observations | Rows in the public view: current, published, verified or legacy-unverified, not a test fixture. **Not the number of observations collected.** | `published_price_observations` |
| Commodities with movement | Commodities with ≥1 valid comparable change between two published observations in the same series. | derived |
| Commodities observed | Commodities with ≥1 published observation. Counted in *tracked* but not here if unpublished. | `published_price_observations` |

### 4.1 Configured ≠ reporting

This distinction is the point of the phase. The two are **never summed,
averaged, or presented as one figure**.

`coverage.ts` reports `configured` and `reporting` as two counts, and describes
"configured but not reporting" in prose rather than as a third measured count.
That is deliberate: the data layer has no accessor for *collected but
unpublished*, and adding one to a public surface would be a security change, not
a feature. The honest form is the prose sentence.

---

## 5. The comparison benchmark

Phase 03 §9 compares one commodity across markets. The benchmark is the
**median** of the markets compared, labelled "Median of N compared markets".

Why the median and not the mean: at n=11 a single extreme market drags a mean
away from the centre, and the median is not moved by it.

Why not a "national price": **there is no national price series.** Constructing
one from eleven markets would be a fabrication with a plausible name. The
benchmark is labelled as what it is — a statistic over the markets actually
compared.

### 5.1 What the comparison declines to compute

`comparison.ts` returns a `notComputed[]` array naming each figure it did not
calculate and why:

- **Regional aggregates** — `market_zones` holds 0 rows, so there is nothing to
  aggregate over.
- **Weighted averages** — there is no volume data to weight by.
- **Currency conversion** — there is no rate and no rate date.

These are stated on the page, not buried in a comment. A comparison that
silently omitted its regional aggregate would be implying it had computed one.

---

## 6. The watch table

One row per **series**, not per observation. Where a commodity has two grades
with published prices, the watch shows two rows. This is why the deduplication
key is the full seven-field series key rather than the commodity.

The columns §6.1 names:

| Column | Source |
|---|---|
| Commodity (+ grade) | The observation's denormalised name |
| Market | The observation's market |
| Price (+ unit) | `normalizedAmount ?? reportedAmount`, with its unit |
| Price type | From `PRICE_TYPE_META`, so the label is the platform's own vocabulary |
| Daily movement | `movements.ts`, `window: 'daily'` — the previous consecutive observation **in the same series** |
| Weekly movement | `movements.ts`, `window: 'weekly'` — the newest observation ≥7 days older |
| Last observed | The collection timestamp, rendered as a figure |
| Status | `VerificationBadge`, which never labels a row verified unless it is |

`showWeekly` is passed as `false` when the platform cannot compute any weekly
movement, so the column is **absent** rather than a column of unexplained
dashes.

---

## 7. Search

`MIN_QUERY_LENGTH = 2`. Below that a search is not run, because one character
matches everything and a result list that matches everything is noise.

`PER_GROUP_LIMIT = 6` across commodities, markets and states.

The query runs **server-side** (`/api/search` → `searchMarket()`). §13.3 is
explicit: no full-corpus fetch to the browser, no client-side filtering of a
fully loaded dataset. The browser receives only the grouped results it renders.

The UI distinguishes three states that a blank panel would conflate:

- **loading** — "Searching…"
- **empty** — the service's `emptyReason`, which states that a commodity in the
  catalogue is not the same as a commodity with a published price
- **failed** — "The search could not be completed. Nothing is shown rather than
  something wrong."

---

## 8. Offers and trades

Phase 03 reads **no offer table**. `/trade` does not query the offer tables
either. An offer is an expression of intent by a named party; a completed trade
is a different fact entirely, and the platform does not hold trade records.

`0030_trade_table_grants.sql` grants `all` to `anon, authenticated` on the offer
and audit tables. That is a separate finding, recorded in Phase 01 and not
reopened here. The relevant point for Phase 03 is that **no Phase 03 service
touches them**, so nothing on the homepage can present an offer as a trade.

---

## 9. What is deliberately absent

| Absent | Why |
|---|---|
| Real-time labelling | No source is a live feed. `live_feed` would map to `fresh`, whose label is "Recently observed". |
| Intraday candlesticks | Observations are daily. A candlestick from a daily close is a fabrication of volatility. |
| A map | 11 markets, 0 coordinates, 0 zones. |
| Regional aggregates | 0 market-zone rows. |
| Volume, trade flow, bid/ask | Not in the schema. |
| National price | Not a series that exists. |
| A third coverage count | No accessor for collected-but-unpublished, and adding one to a public surface is a security change. |
