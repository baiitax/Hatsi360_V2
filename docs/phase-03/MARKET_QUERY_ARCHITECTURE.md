# Phase 03 — Market Query Architecture

**Phase:** 03 — Homepage & Global Market Intelligence
**Purpose:** How the homepage's queries are shaped, what they reuse, and why.

---

## 1. The shape

```
page.tsx  (Server Component)
   │
   ├── getMarketOverview()   ──┐
   ├── getMarketWatch()       │  Promise.all, one round of queries
   ├── getPriceMovements(d)   │
   ├── getPriceMovements(w)   │
   ├── getMarketCoverage()    │
   ├── getMarketActivity()   ──┘
   │
   └── loadComparison()  ── a second round-trip, because it needs a commodity
        │                    chosen from the watch's breadth
        └── getMarketComparison({ commodityId })
```

The page is a Server Component. It awaits its data and renders it. There is no
client-side data fetching on the homepage except the search, which is a query the
user initiates.

---

## 2. What was reused, and what was added

Phase 03 §16 asks for a set of logical service responsibilities and, in the same
breath: *"Do not create unnecessary service files if equivalent functionality
already exists."* It largely did exist.

### 2.1 Reused, not re-implemented

| Existing | Used for | Why re-implementing it would have been wrong |
|---|---|---|
| `src/lib/trade/series.ts` — `seriesKeyId` | The comparability rule | A second definition of "which prices may be compared" is two rules that will disagree. |
| `src/lib/trade/freshness.ts` — `classifyFreshness` | Age classification | The thresholds already exist and are already tested. |
| `src/lib/trade/queries.ts` — `getMarketMovements` | The overview's movement count | Already groups by `seriesKeyId` and takes the dominant series. |
| `src/lib/data/source.ts` — `listObservations` | Every read | It restricts to the public view by construction. |
| `src/lib/data/source.ts` — `listObservationsForAnalysis` | Counts over the whole view | It is the accessor with no LIMIT. |

### 2.2 Added

Seven modules under `src/lib/market/`, and the reason each one exists:

| Module | Why it is new |
|---|---|
| `overview.ts` | Nothing computed *defined* metrics — a label, a value and a definition are a presentation concern the trade layer does not have. |
| `watch.ts` | Nothing deduplicated to the **latest observation per series** for a public listing. |
| `movements.ts` | `getMarketMovements` is commodity-scoped and returns `MovementRow[]` keyed by commodity. Phase 03 needs series-scoped rows with both daily and weekly windows and an explicit eligibility reason. |
| `comparison.ts` | Nothing compared one commodity across markets, and nothing computed a median benchmark. |
| `activity.ts` | Nothing produced a bounded recent-observation feed with a `publishedAt` distinct from `collectedAt`. |
| `coverage.ts` | Nothing separated configured from reporting markets by state. |
| `search.ts` | Nothing grouped commodity/market/state discovery with a per-group limit. |
| `freshness.ts` | **Not a new computation.** The single mapping between two existing vocabularies. |

---

## 3. The read path

Every Phase 03 service reads through `DataSource`, which restricts to
`published_price_observations`. That view's WHERE clause, read exactly:

```sql
is_current
AND published_at IS NOT NULL
AND verification_status IN ('verified', 'legacy_unverified')
AND source_system <> 'test_fixture'
AND source_reference <> 'test_fixture'
```

### 3.1 Why the exclusions are not re-implemented

Phase 03 §6.3 lists four things to exclude: rejected, pending, unpublished and
test-fixture rows. **None of them is re-implemented in `src/lib/market/`.**

They are delegated to the view's WHERE clause. A filter written in application
code is a second policy that can be wrong — and a second policy that is wrong in
the *permissive* direction is a data-leak bug. `activity.ts` states this
explicitly: it reads only the public view, so §10.1's exclusions (agent PII,
internal notes, rejected rows) are enforced **by construction**, not by a filter
that could be wrong.

### 3.2 The consequence

A draft, a rejected row and an unpublished observation are unreachable from every
Phase 03 surface. Not filtered out — unreachable.

---

## 4. Query patterns and their cost

### 4.1 The counts

`getMarketOverview` needs the distinct markets and distinct commodities in the
public view. The first implementation derived them from
`listObservations({ page: 1, pageSize: 1 })`, which is a distinct count over one
row — structurally 0 or 1. Fixed by `listObservationsForAnalysis({})`, which
returns the view without a limit.

At 58 rows this is free. At 58,000 it is a full scan, which is why the index
recommendation in Stage 1 is recorded rather than applied.

### 4.2 The watch

`getMarketWatch` pulls up to `SCAN_LIMIT = 2000` published observations, then
dedupes to the latest per series in memory. Search, filter and sort are applied
in memory after the deduplication, because a sort by *movement* cannot be pushed
to the database — movement is derived.

### 4.3 The movements

`getPriceMovements` reads the view once per window and, for each series, walks
the observations in order to find:

- **daily** — the previous *consecutive* observation in the series
- **weekly** — the newest observation **≥7 days older** than the current one

Six days is not a week. An eight-day-old row is used. This is pinned by
`tests/market/movements.test.ts`.

### 4.4 The activity feed

Hard-capped at 50, and the caller cannot raise it. Phase 03 §11: *"Do not
continuously retrieve the entire historical observation table."* The homepage
asks for 8.

### 4.5 The search

Server-side, two-character minimum, six results per group. §13.3: no
full-corpus fetch to the browser.

---

## 5. The index gap

Recorded in Stage 1, **not applied** — applying it is a schema change and
therefore a separate authorization.

There is no composite index on `(commodity_id, collected_at DESC)` or
`(market_id, collected_at DESC)`. At 58 rows this is irrelevant. At 58,000 the
watch and the movement walk are sequential scans.

The recommendation, for whenever it is authorized:

```sql
CREATE INDEX CONCURRENTLY idx_price_observations_commodity_collected
  ON price_observations (commodity_id, collected_at DESC);
CREATE INDEX CONCURRENTLY idx_price_observations_market_collected
  ON price_observations (market_id, collected_at DESC);
```

---

## 6. What is not queried

| Not queried | Why |
|---|---|
| `price_observations` directly, from a public surface | It holds drafts, rejected rows and PII. The anon-key read returns 0 rows — RLS, not emptiness. Privileged access is node + `pg` with `SUPABASE_DB_*`, and that is for audits, not for pages. |
| The offer tables | An offer is not a trade. See `MARKET_DATA_METHODOLOGY.md` §8. |
| `observation_market_intelligence` | 0 rows; the Phase 02 `no-fundamentals` empty state already handles it. |
| `market_zones` | 0 rows; nothing to aggregate. |
| Coordinates | 0 of 11 markets have them; no map is drawn. |

---

## 7. Failure behaviour

Every service call on the homepage is wrapped in `.catch(() => null)`, and the
page renders a named empty state for each null. A service that throws produces an
honest empty section, not a 500 and not a fabricated figure.

The search is the exception: a failed search says
"The search could not be completed. Nothing is shown rather than something
wrong." It does not fall back to a cached or partial result, because a stale
result presented as a live one is the failure mode this phase exists to prevent.
