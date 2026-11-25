# Phase 04 — Discovery and Data Readiness

**Phase:** 04 — Commodity Intelligence, Profiles & Market Research Engine
**Stage:** 1 of N (mandatory pre-implementation discovery, §2)
**Date:** 2026-11-14
**Method:** privileged `pg` probe against the live database. Reproduce with
`node scripts/discovery-probe.mjs`.

> **This document was produced before any implementation code was written**, per
> §21: *"Do not begin with visual design before understanding the database."*
> Every figure below is a measured result. Nothing is assumed.

---

## 1. Headline finding

**The platform holds no publicly displayable price observation.**

All 58 rows in `price_observations` carry `source_system = 'test_fixture'`, and
none has a non-null `published_at`. The public view
`published_price_observations` therefore returns **0 rows** — it is excluded on
three independent conditions simultaneously:

```sql
WHERE o.is_current
  AND o.published_at IS NOT NULL
  AND o.verification_status IN ('verified','legacy_unverified')
  AND COALESCE(o.source_system,'agent_app') <> 'test_fixture'
  AND COALESCE(o.source_reference,'') <> 'test_fixture'
```

This is not a Phase 04 defect and it is not a query bug. It is the Phase 01
P0 finding (PDI-2 / R-08) surfacing in a new place, and it is the same condition
Phase 03 already reported and built around.

**Consequence for Phase 04:** every price surface in §5–§10 must be built
against the real query path and must render an honest empty state. Nothing may be
populated from the fixture data, because §17.15 requires that *"user-specific
demo data never contaminates public commodity analytics."* The view already
enforces this; re-implementing the filter in application code would create a
second policy that could be wrong in the permissive direction.

---

## 2. Database entities

### 2.1 Inventory

**64 tables. 29 hold rows. 35 are empty.**

Tables that matter to Phase 04, with row counts:

| Table | Rows | Phase 04 relevance |
|---|---:|---|
| `commodities` | 22 | §5–§13 the subject of the phase |
| `commodity_categories` | 14 | directory filtering |
| `commodity_grades` | 58 | §6 grade intelligence — **defined, barely used** |
| `commodity_synonyms` | 42 | §3 alias search |
| `price_observations` | 58 | §4–§5 — **all test fixtures, none published** |
| `markets` | 11 | §4, §8 regional |
| `states` | 11 | §8 regional |
| `measurement_units` | 8 | §4 unit integrity |
| `price_source_registry` | 3 | §17 provenance |
| `seller_offers` | 15 | §10 trade — 3 publicly visible |
| `buyer_offers` | 15 | §10 trade — 3 publicly visible |
| `saved_commodities` | 6 | watchlist, not Phase 04 |

### 2.2 Empty tables that Phase 04 needs

These are the structural blockers. They are empty, not inaccessible.

| Table | Rows | Brief section blocked |
|---|---:|---|
| `commodity_specifications` | **0** | §6 quality attributes (moisture, foreign matter, oil content…) |
| `commodity_seasonality` | **0** | §8 seasonal intelligence |
| `commodity_fundamentals` | **0** | §9 supply and demand |
| `commodity_varieties` | **0** | variety dimension |
| `commodity_unit_conversions` | **0** | §4 approved unit conversion |
| `market_zones` | **0** | §8 regional aggregates |
| `market_commodity_scope` | 0 | per-market commodity coverage |
| `market_collection_schedules` | 0 | collection cadence |
| `observation_market_intelligence` | 0 | Phase 02 fundamentals |
| `articles`, `article_categories` | 0 | §11 research (see §2.4) |
| `market_reports` | 0 | §11 research |

`commodity_unit_conversions` deserves emphasis. The domain type documents it as
*"Commodity-specific bag/package weight rule (a bag of maize is not a bag of
cocoa)"*. With 0 rows there is **no approved conversion methodology**, so §4's
"never silently convert units or currencies without an approved conversion
methodology" is satisfied by absence: conversion is impossible, therefore it
cannot happen silently.

---

## 3. Commodity records

| Fact | Value |
|---|---|
| Commodity records | 22 |
| Active | 21 |
| Inactive | 1 — `paddy-rice-duplicate-record` (a data-quality defect to report, not to silently hide) |
| With a description | 19 of 22 |
| With `default_grade_id` set | **0 of 22** |
| With `default_variety_id` set | **0 of 22** |
| `freshness_window_hours` | 72 for all 22 — uniform, so freshness does not differentiate commodities |
| Synonyms | 42, across 15 commodities |

`commodities` has **no `image_url` column**. Imagery must resolve through
`src/lib/images/registry.ts`, which matches on the commodity's canonical slug.
That registry holds 52 catalogue assets, all served, 0 SHA duplicates (Phase 01,
images CLOSED).

### 3.1 The brief's ten priority commodities, resolved

The brief names ten candidates. Two do not exist as named:

| Brief | Resolves to | Exists |
|---|---|---|
| Maize | Maize (White), Maize (Yellow) | yes — 2 records |
| Sorghum | Sorghum (White), Sorghum (Red) | yes — 2 records |
| Millet | Millet | yes |
| Rice | Paddy Rice, Imported Rice, Local Rice | yes — 3 records + 1 inactive duplicate |
| Sesame | Sesame Seed | yes |
| Groundnut | Groundnut | yes |
| Soybean | **Soya Beans** | yes — under a different name |
| Gum Arabic | Gum Arabic GR-I, GR-II, GR-III | yes — 3 records |
| **Hibiscus** | — | **NOT FOUND** |
| Ginger | Dried Ginger | yes |

So 9 of 10 resolve, covering 15 commodity records. Hibiscus is genuinely absent
from the catalogue and must not be created for the sake of the list — §21 forbids
duplicate commodity records, and inventing one would be fabrication.

---

## 4. Observations, markets, grades, units, price types

### 4.1 Observations

| Fact | Value |
|---|---|
| Total rows | 58 |
| `is_current` | 58 of 58 |
| `published_at IS NOT NULL` | **0** |
| `source_system` | `test_fixture` for **all 58** |
| `normalized_amount IS NOT NULL` | **0** — every row uses `reported_amount` |
| `variety_id IS NOT NULL` | **0** |
| `grade_id IS NOT NULL` | 58 of 58 |
| Distinct collection dates | **2** — 2026-10-28 and 2026-11-10 |
| Currencies | 1 — NGN for all 58 |

**Two distinct dates is the decisive constraint on §5.** A price history needs a
sequence; two points are not a series. Every range control in §5 (7/30/90/180/365
days, all history) would draw the same two points. The brief's own rule applies:
*"Only offer useful date ranges supported by the database."* The honest answer is
that no range is supported.

### 4.2 Markets

| Fact | Value |
|---|---|
| Markets | 11, all active |
| With ≥1 observation | **5** — Funtua, Mile 12, Dawanau, Sokoto Central, Zaki Biam |
| With 0 observations | 6 — Gusau, Anchau, Maiduguri, Gujungu, Wunti, Lafia |
| One market per state | yes — 11 markets, 11 states |
| `market_zones` | 0 rows |

The one-market-per-state shape is why §8's regional aggregates are not computable
and why §13's "Region" column must be sourced from `states`, not from a zone.

### 4.3 Grades

| Fact | Value |
|---|---|
| Grades defined | 58, across 22 commodities (2–4 each) |
| Grades with a description | all — `commodity_grades.description` is populated |
| **Distinct grades actually used in observations** | **1 per commodity** |

Every commodity with observations uses exactly one grade: Grade 1 for most,
`Acacia senegal (Hashab)` for Gum Arabic GR-I, `Export grade` for Sesame,
`Food grade` for Soya Beans, `Ungraded` for Sweet Potato, `Milling grade` for
Wheat.

**Consequence for §6:** grade *comparison* is impossible — there is only one
grade with data per commodity, and comparing one grade against itself is not a
comparison. Grade *display* is fully supported: names and descriptions exist.

### 4.4 Units

| Unit | Observations |
|---|---:|
| `bag` (commodity-specific weight) | 56 |
| `kg` | 2 |
| g, piece, unspecified, crate, t, litre | 0 |

`bag` is explicitly *"commodity-specific weight"* — a bag of maize is not a bag
of rice, and with `commodity_unit_conversions` empty there is no factor to relate
them. Two observations in `kg` exist and are not comparable with the 56 in `bag`
either, because there is no bag→kg factor recorded.

### 4.5 Price types

Five distinct values, all present in the catalogue and all explainable:

| Price type | Observations |
|---|---:|
| `retail` | 15 |
| `wholesale_asking` | 12 |
| `indicative` | 11 |
| `farmgate` | 10 |
| `wholesale_transaction` | 10 |

§7 is therefore well-specified by the data: five types, each with a distinct
meaning, and the distinction between `wholesale_asking` (an asking price, not a
trade) and `wholesale_transaction` (a completed trade) is exactly the distinction
the brief demands be visible.

### 4.6 Provenance

`price_source_registry` holds 3 sources. `legacy_import` is
`eligible_for_publication = false` — *"Carries no unit, price type, grade or
verification trail, so it is retained for provenance but is not eligible for
public price intelligence."* Any Phase 04 query must exclude it. No
`legacy_import` rows exist today, so this is a forward guard, not an active
filter.

---

## 5. Trade offers

| Fact | Value |
|---|---|
| `seller_offers` | 15 — 3 verified with consent, 2 verified without consent, rest draft/submitted/rejected/withdrawn |
| `buyer_offers` | 15 — 3 verified with consent, 1 verified without consent, rest draft/submitted/rejected/withdrawn |
| **Publicly visible** | **3 seller, 3 buyer** — `status='verified' AND disclosure_consent AND (valid_until IS NULL OR valid_until > now())` |

The three publicly visible seller offers:

| Commodity | Market | Amount | Type | Unit | Valid until |
|---|---|---:|---|---|---|
| Imported Rice | Funtua Grains Market | 62,000 | wholesale_asking | bag | 2026-12-07 |
| Sorghum (White) | Dawanau International Grains Market | 27,100 | wholesale_asking | bag | 2026-12-07 |
| Wheat | Sokoto Central Market | 54,900 | wholesale_asking | bag | 2026-12-01 |

All three are `wholesale_asking` — **asking prices, not completed trades**. §10
requires this be stated explicitly and requires that no guaranteed profit be
computed from them.

---

## 6. Existing code: what Phase 04 can reuse

### 6.1 Routes

| Route | File | Phase 04 relevance |
|---|---|---|
| `/commodities` | `src/app/(site)/commodities/page.tsx` (306 lines) | §3 directory — needs search, filters, sorting |
| `/commodities/[slug]` | `src/app/(site)/commodities/[slug]/page.tsx` (439 lines) | §13 profile — needs §4–§11 sections |
| `/markets`, `/markets/[slug]` | exists | §8 regional cross-links |
| `/trade/*` | 6 routes | §10 trade intelligence cross-links |
| `/insights` | exists | §11 research cross-links |
| `/admin/commodities` | exists | §16 admin integration |

The existing profile page already renders: an identity header, movement between
comparable observations, comparable series, reporting markets, and "also known
as". It is a sound shell to extend, not to replace — §21 says do not rewrite the
platform.

### 6.2 Reusable services

| Service | Location | Reuse for |
|---|---|---|
| `seriesKeyId` | `src/lib/trade/series.ts` | comparability — the single definition |
| `classifyFreshness` | `src/lib/trade/freshness.ts` | age classification |
| `assessFreshness` / `freshnessOf` | `src/lib/market/freshness.ts` | the Phase 03 mapping — **never add a fourth** |
| `getMarketMovements` | `src/lib/trade/queries.ts` | §13B movement |
| `getCommoditySeries` | `src/lib/trade/queries.ts` | §5 history (candle-based, so see §7) |
| `getCommoditySeriesOptions` | `src/lib/trade/queries.ts` | §5 filter options |
| `getCommodityOpportunities` | `src/lib/trade/queries.ts` | §10 spread |
| `getCommodityFreshness` | `src/lib/trade/queries.ts` | freshness |
| `getMarketWatch`, `getPriceMovements`, `getMarketComparison`, `getMarketCoverage`, `searchMarket` | `src/lib/market/*` | Phase 03 services, directly reusable |
| `resolveImage` | `src/lib/images/registry.ts` | §13A imagery, by slug |
| `DataSource.listObservations` / `listObservationsForAnalysis` | `src/lib/data/source.ts` | every read; restricted to the public view |

### 6.3 Gaps in the data layer

| Missing | Impact |
|---|---|
| No `listGrades()` on `DataSource` | §6 needs a grade accessor. Grades are currently queried ad-hoc inside admin/operations code. |
| No `listSynonyms()` on `DataSource` | synonyms are loaded into `Commodity.synonyms` by `listCommodities()`, so this is already solved — no new accessor needed. |
| No public trade-offer service | §10 needs one, restricted to the public-read predicate. |
| No `CommoditySpecification` / `CommoditySeasonal` service | tables are empty; a service returning `[]` with an explicit reason is the correct shape. |

---

## 7. Identified blockers

| # | Blocker | Severity | Blocks | Can Phase 04 resolve it? |
|---|---|---|---|---|
| B-1 | 0 published observations; all 58 rows are `test_fixture` | **P1** | §4, §5, §6 comparison, §7, §8, §9, §10 spreads | **No.** Publishing is an authorization act (§2.2). Phase 04 builds the real path and reports. |
| B-2 | 2 distinct observation dates | **P1** | §5 every history range | **No.** A range control over two points is decoration. Offer only what the data supports. |
| B-3 | `commodity_specifications` = 0 | P2 | §6 quality attributes | **No.** Requires data entry, not code. Grade *names and descriptions* are available and will be shown. |
| B-4 | `commodity_seasonality` = 0 | P2 | §8 seasonal | **No.** |
| B-5 | `commodity_fundamentals` = 0 | P2 | §9 supply/demand | **No.** |
| B-6 | `market_zones` = 0, one market per state | P2 | §8 regional aggregates | **No.** Region is sourced from `states`. No aggregate is computed. |
| B-7 | `commodity_unit_conversions` = 0 | P2 | §4 unit conversion | **No.** Conversion is refused, which is the compliant behaviour. |
| B-8 | 1 grade used per commodity | P2 | §6 grade comparison | **No.** Grade display works; comparison is refused with a stated reason. |
| B-9 | Hibiscus absent from the catalogue | P3 | §12 priority list | **No.** Not created. 9 of 10 priorities resolve. |
| B-10 | `paddy-rice-duplicate-record` inactive duplicate | P3 | directory cleanliness | Report it. Do not delete — §21 forbids destructive changes. |

None of these is resolvable by code. **Every one is a data-availability fact, and
the correct Phase 04 response to each is an honest empty state plus a stated
reason**, exactly as §21 directs: *"implement the supported functionality and
clearly report the limitation."*

---

## 8. Security restrictions (measured)

RLS policies confirmed present on the Phase 04 tables:

| Table | Public read |
|---|---|
| `commodities`, `commodity_categories`, `commodity_grades`, `commodity_synonyms` | `anon, authenticated` |
| `buyer_offers` | `anon, authenticated` via `buyer_offers_public_read` |
| `commodity_fundamentals`, `commodity_seasonality`, `commodity_specifications` | `public` |
| `price_observations` | not publicly readable — the anon key returns 0 rows |

Constraints Phase 04 must preserve:

1. Public surfaces read the public view, never `price_observations` directly.
2. Offer visibility is `status='verified' AND disclosure_consent AND (valid_until IS NULL OR valid_until > now())` — enforced in the query, not the UI.
3. `legacy_import` sources are never eligible for public price intelligence.
4. Agent PII, internal notes and rejected rows are unreachable by construction.
5. No service-role credential reaches a public surface.
6. `0030_trade_table_grants.sql` grants `all` to `anon, authenticated` on the
   offer and audit tables — a Phase 01 finding, recorded, not reopened.

---

## 9. Recommended implementation architecture

Build the ten services §15 names as modules under `src/lib/commodity/`, following
the Phase 03 pattern: each reads through the existing `DataSource` or the public
view, none re-implements a policy, and each returns a typed result carrying an
explicit `unavailableReason`.

```
src/lib/commodity/
  directory.ts     CommodityDirectoryService   — §3
  profile.ts       CommodityProfileService     — §13 shell
  prices.ts        CommodityPriceService       — §4, §8
  history.ts       CommodityHistoryService     — §5
  grades.ts        CommodityGradeService       — §6
  priceTypes.ts    (folded into prices.ts)     — §7
  regional.ts      CommodityRegionalService    — §8
  seasonal.ts      CommoditySeasonalService    — §8
  fundamentals.ts  CommodityFundamentalsService— §9
  trade.ts         CommodityTradeService       — §10
  research.ts      CommodityResearchService    — §11
  index.ts         barrel
```

Rules carried over from Phase 03 and still in force:

- Comparability is `seriesKeyId`. Never re-declared.
- Freshness is `assessFreshness` / `freshnessOf`. Never a fourth computation.
- Public reads go through the public view. Never `price_observations` directly.
- A figure that cannot be computed returns `null` plus a reason. Never `0`, never
  `Infinity`, never a placeholder.
- Derived analytics are labelled as derived, distinct from source observations.

### 9.1 The one design decision this discovery forces

§5 asks for six date ranges. The data supports **none of them**, because two
dates are not a series. The brief also says *"Only offer useful date ranges
supported by the database."*

So the history section will offer ranges **only where the commodity has enough
distinct observation dates to make the range meaningful**, and will otherwise
render a single explanatory state naming the reason. This is a data-driven
decision, not a design preference, and it is the same rule Phase 03 applied to
the weekly-movement column: absent rather than a column of unexplained dashes.

---

## 10. Readiness assessment — every commodity

§2 requires this table be filled from real results. It is.

Legend: **A**vailable / **M**issing. `obs` = rows in `price_observations`
(privileged count). `pub` = rows that would be publicly visible — **0 for every
commodity**, because all rows are test fixtures.

| Commodity | Slug | Active | Master | obs | pub | Markets | Hist. range | Grades defined | Grades used | Units | Price types | Regional | Seasonal | Supply/demand | Trade | Research |
|---|---|:-:|:-:|--:|--:|--:|---|---:|--:|--:|---|---|---|:-:|:-:|:-:|
| Maize (White) | maize-white | A | A | 6 | 0 | 3 | 2 dates | 3 | 1 | bag | 4 | M | M | M | A | A |
| Maize (Yellow) | maize-yellow | A | A | 6 | 0 | 3 | 2 dates | 3 | 1 | bag | 4 | M | M | M | A | A |
| Millet | millet | A | A | 6 | 0 | 3 | 2 dates | 3 | 1 | bag | 4 | M | M | M | A | A |
| Groundnut | groundnut | A | A | 4 | 0 | 2 | 1 date | 3 | 1 | bag | 3 | M | M | M | A | A |
| Imported Rice | imported-rice | A | A | 4 | 0 | 2 | 2 dates | 3 | 1 | bag | 3 | M | M | M | **A** | A |
| Local Rice | local-rice | A | A | 4 | 0 | 2 | 2 dates | 4 | 1 | bag | 3 | M | M | M | A | A |
| Paddy Rice | paddy-rice | A | A | 4 | 0 | 2 | 2 dates | 4 | 1 | bag | 2 | M | M | M | A | A |
| Sorghum (Red) | sorghum-red | A | A | 4 | 0 | 2 | 1 date | 3 | 1 | bag | 2 | M | M | M | A | A |
| Sorghum (White) | sorghum-white | A | A | 4 | 0 | 2 | 1 date | 3 | 1 | bag | 3 | M | M | M | **A** | A |
| Soya Beans | soya-beans | A | A | 4 | 0 | 2 | 1 date | 3 | 1 | bag | 3 | M | M | M | A | A |
| Brown Beans (Oloyin) | brown-beans-oloyin | A | A | 2 | 0 | 1 | 2 dates | 2 | 1 | bag | 2 | M | M | M | A | A |
| Gum Arabic GR-I | gum-arabic-gr-i | A | A | 2 | 0 | 1 | 2 dates | 2 | 1 | bag | 2 | M | M | M | A | A |
| Sesame Seed | sesame-seed | A | A | 2 | 0 | 1 | 2 dates | 3 | 1 | bag | 2 | M | M | M | A | A |
| Sweet Potato | sweet-potato | A | A | 2 | 0 | 1 | 2 dates | 1 | 1 | bag | 2 | M | M | M | A | A |
| Wheat | wheat | A | A | 2 | 0 | 1 | 2 dates | 3 | 1 | bag | 2 | M | M | M | **A** | A |
| White Beans | white-beans | A | A | 2 | 0 | 1 | 2 dates | 2 | 1 | bag | 2 | M | M | M | A | A |
| Bambara Nuts | bambara-nuts | A | A | 0 | 0 | 0 | none | 2 | 0 | — | 0 | M | M | M | A | A |
| Dried Chilli Pepper | dried-chilli-pepper | A | A | 0 | 0 | 0 | none | 3 | 0 | — | 0 | M | M | M | A | A |
| Dried Ginger | dried-ginger | A | A | 0 | 0 | 0 | none | 3 | 0 | — | 0 | M | M | M | A | A |
| Gum Arabic GR-II | gum-arabic-gr-ii | A | A | 0 | 0 | 0 | none | 2 | 0 | — | 0 | M | M | M | A | A |
| Gum Arabic GR-III | gum-arabic-gr-iii | A | A | 0 | 0 | 0 | none | 2 | 0 | — | 0 | M | M | M | A | A |
| Paddy Rice (duplicate) | paddy-rice-duplicate-record | **M** | A | 0 | 0 | 0 | none | 1 | 0 | — | 0 | M | M | M | A | A |

Notes on the table:

- **`pub` is 0 for every row.** This is the phase's gating fact.
- **Historical range is 2 dates or 1 date, never a series.** No commodity
  supports a trend line.
- **Grades used is 1 or 0.** No commodity supports a grade comparison.
- **Trade is A for 3 commodities only** (Imported Rice, Sorghum White, Wheat) —
  the three publicly visible seller offers.
- **Research is A for all** — the insights corpus in `src/lib/content/insights.ts`
  is static published content, not database-backed, and is reachable from every
  profile. `articles` is empty, so nothing is read from it.
- Regional is M for all — `market_zones` is empty. `states` is available, so a
  per-state listing is possible; an aggregate is not.

---

## 11. What Phase 04 will therefore build

Supported by data, so built:

1. **§3 directory** — search by name and synonym, filter by category, filter by
   market-data availability, sort alphabetically and by latest observation.
   Server-side with pagination.
2. **§13 profile shell** — one reusable template driven by records, with the
   eleven-section navigation.
3. **§13A identity header** — name, category, description, image via the
   registry, grade count, markets with observations, latest observation date,
   freshness.
4. **§4 latest prices by market** — a real table with real filters and sorting,
   reading the public view.
5. **§6 grade display** — names and descriptions from `commodity_grades`, with
   the comparison explicitly refused and the reason stated.
6. **§7 price type comparison** — five types, each explained, with the
   asking-vs-transaction distinction made visible.
7. **§8 regional coverage** — markets and states from real records, with the
   "no observations" phrasing §8 prescribes.
8. **§10 trade intelligence** — the three publicly visible seller offers and
   three buyer offers, each with its status, and no profit calculation.
9. **§11 research** — the published insights corpus, connected by commodity.
10. **§13K sources and methodology** — on every profile.

Blocked, so rendered as an honest empty state with a stated reason:

- §5 price history — no series exists
- §6 grade comparison — one grade per commodity
- §8 regional aggregates — no zones
- §9 seasonal and supply/demand — tables empty
- §4 unit and currency conversion — no approved methodology

---

## 12. Approval requested

Phase 04 discovery is complete. The architecture in §9 is proposed, not started.

**Approval is requested before implementation begins**, specifically on:

1. Building all price surfaces against the real query path so that publication
   later requires no code change — the same decision Phase 03 took.
2. Refusing §5's date ranges rather than drawing a two-point line, on the
   grounds that the brief itself says to offer only supported ranges.
3. Not creating a Hibiscus commodity record to complete the §12 priority list.
4. Reporting the `paddy-rice-duplicate-record` duplicate rather than deleting it.
5. Raising B-1 (publication) and B-3/B-4/B-5 (empty intelligence tables) as
   separate authorization items, since none is resolvable by code.
