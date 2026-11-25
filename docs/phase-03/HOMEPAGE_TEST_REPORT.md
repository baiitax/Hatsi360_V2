# Phase 03 — Homepage Test Report

**Phase:** 03 — Homepage & Global Market Intelligence
**Purpose:** What was verified, how, and what the results were.

---

## 1. Summary

| Gate | Result |
|---|---|
| `tsc --noEmit` | **exit 0** |
| `eslint` on Phase 03 paths | **0 errors, 0 warnings** |
| `next build` | **exit 0**, 47/47 pages generated |
| `vitest run` (full suite) | **816 passed** / 1 failed (pre-existing) / 28 skipped |
| `tests/market` | **29 passed** / 0 failed |
| `npm run lint` (full tree) | 12 errors, 39 warnings — **all 12 in pre-existing Phase 01 files, 0 in Phase 03** |
| Responsive gate | **56 / 56** at 8 widths × 7 routes |
| Homepage HTTP | **200** |
| Console errors on the homepage | **none** |

The single failing test is `tests/data-integrity/fixture-isolation.test.ts >
attributes every verification to the demo verifier`, which fails because the live
demo admin mutated the fixture. It is a P0 recorded in Phase 01, it predates this
phase, and the assertion is **not** relaxed.

---

## 2. `tests/market/movements.test.ts` — 29 tests

The behavioural core of the phase. These pin the rules that, if broken, would let
the homepage lie.

### 2.1 Comparability is refused, not approximated

| Test | What it pins |
|---|---|
| different commodity | Refused |
| different market | Refused |
| different grade | Refused |
| different unit | Refused |
| different price type | Refused |
| different currency | Refused |
| different variety | Refused |
| `null` grade vs any grade | Refused — a null grade is its own value |

A test that re-implemented the series key would pass even if the engine were
wrong, so the test imports `seriesKeyId` from `src/lib/trade/series.ts`.

### 2.2 The movement formula

Including the **zero-denominator case**: when the previous price is 0, the
absolute change is shown and an explicit reason is given. `0%` and `Infinity` are
never rendered.

### 2.3 The weekly window

Six days is not a week. The eight-day-old row **is** used.

### 2.4 Latest-per-series selection

Two grades of one commodity stay two rows.

### 2.5 Freshness

Tested against the **real** mapping in `src/lib/market/freshness.ts`, not a local
copy. This matters: the first draft of this test re-declared the age arithmetic,
and it passed while `watch.ts`, `comparison.ts` and `coverage.ts` each disagreed
with it. The duplication was the bug.

| Test | What it pins |
|---|---|
| inside the daily fresh window → `fresh` | A single missed day does not make yesterday's price stale |
| past the window, verified → `latest_verified` → `today` | The engine distinguishes verified-but-old from unverified |
| past the window, unverified → `delayed` | **Not** `latest_verified` |
| past the verification horizon → `stale` | 45 days is stale at a 30-day horizon |
| no observation → `unavailable` | Never anything else |
| a future observation → `fresh` | Never stale |
| `indicative` → `delayed`, **never** `fresh` | The one direction the coarse mapping must not lose |
| `live_feed` → `fresh` | |
| `no_data` → `unavailable` | |

The test uses a pinned clock (`now = 2026-11-14T12:00:00Z`), so a freshness test
is a test of the rule and not of the time it ran.

---

## 3. The responsive gate

`scripts/check-responsive.mjs` — 8 widths × 7 routes = **56 checks**.

| Width | Routes |
|---|---|
| 1440 / 1366 / 1280 | desktop-wide, desktop, desktop-small |
| 1024 / 768 | tablet-landscape, tablet |
| 430 / 390 / 360 | phone-large, phone, phone-small |

Routes: `/`, `/commodities`, `/commodities/paddy-rice`, `/trade`,
`/trade/fundamentals`, `/insights`, `/charts`.

Each check asserts three things: nothing overflows the viewport horizontally, the
desktop navigation is present at desktop widths and absent at phone widths (and
the reverse for the bottom bar), and the main landmark holds real content.

### 3.1 The defect found and fixed

`/insights` at 360px overflowed by **16px**. A `SectionHeader` action labelled
"How we separate observation from analysis" was 285px wide, and neither the title
nor the action was permitted to move to its own line — the row was
`flex items-center justify-between` with no `min-w-0` and no wrap.

Fixed with `flex-wrap` and `min-w-0` on both children. The action keeps its full
label rather than being truncated: a truncated action is worse than a stacked one.

The Phase 02 fix for this same page had been applied to `PageHeader` but not to
`SectionHeader`, which is why the regression was invisible until the widths were
re-run.

### 3.2 The homepage at every width

`main` content height at each width, all with `overflow=0`:

| Width | `/` main height |
|---|---|
| 1440 → 360 | 4271 at every width |

---

## 4. The rendered page, verified in a browser

A `curl` text dump of a Next 16 page is **not** the rendered page — content lands
in `<div hidden id="S:n">` and the flight payload. The homepage was therefore
verified with Playwright against `next start`.

### 4.1 The figures the page reports

| Card | Rendered | Live database | Agrees |
|---|---|---|---|
| Tracked commodities | 21 | 22 commodities, 21 active | yes |
| Configured markets | 11 | 11 markets, all active | yes |
| Reporting markets | 0 | 0 rows in the public view | yes |
| Published observations | 0 | 0 rows in the public view | yes |
| Commodities with movement | 0 | no comparable pair exists | yes |
| Commodities observed | 0 | 0 rows in the public view | yes |

All six cards render a "What this counts" disclosure, so the definition is
available without leaving the page.

### 4.2 The search, exercised in the browser

- Query `maize` → `COMMODITIES: Maize (White) · Grains & Cereals; Maize (Yellow) · Grains & Cereals`
- Query `zzzqqq` → "Nothing in the market catalogue matches "zzzqqq". Try a
  commodity name, a market, or a state."
- Query of one character → not run; the reason is stated
- `aria-expanded` toggles correctly; the listbox is a real `role="listbox"`
- Console errors: none

### 4.3 The empty states

Every empty section renders a named `EmptyStateKind` or the service's own
`emptyReason`:

| Section | State |
|---|---|
| Watch | `no-market-data` — explains what publication means |
| Movers | The movement service's `emptyReason` |
| Comparison | `no-comparison` + a note on why no regional aggregate is computed |
| Recent observations | `no-observations` |
| Coverage | "No market is reporting. The 11 configured markets exist; their prices have not completed publication" |

---

## 5. What was not verified

Recorded so it is not mistaken for verified.

| Not verified | Why |
|---|---|
| Lighthouse / Web Vitals | Not run this phase. |
| WCAG 2.2 AA conformance by audit | The design system was built to it and the automated gates pass, but no formal audit was performed. |
| Keyboard-only traversal of the search | The ARIA is correct by construction (`role="combobox"`, `aria-expanded`, `aria-controls`, Escape-to-close), but it was not manually traversed. |
| Screen-reader announcement of the live region | Present and correctly wired; not tested with a real screen reader. |
| The movement columns with real data | There is no published observation, so the daily and weekly columns render their empty state. The columns were verified to be *absent* when `showWeekly` is false, which is the only behaviour currently reachable. |
| `/api/search` under load | Debounced at 200ms with abort-on-supersede; not load-tested. |
| The comparison panel with ≥2 markets | Unreachable until publication. The `notComputed` rendering was verified structurally. |

---

## 6. The defect this phase's testing exists to prevent

Three services each computed an age from a timestamp with their own thresholds.
The same observation was `today` in one section of the homepage and `fresh` in
another. The test that should have caught it had re-implemented the arithmetic
itself, so it agreed with whichever service it was nearest to.

The fix was structural: one mapping (`freshness.ts`), and a test that exercises
the real one. The rule recorded for future work is **never add a fourth age
computation — route through `assessFreshness()`**.

The same shape of bug appeared twice more in the same phase:

- `observedMarketCount` computed from the **markets table** rather than the
  public view, so all 11 configured markets were reported as reporting.
- `reportingMarkets` counted from a **one-row page**, so it was structurally 0
  or 1.

Both were in the headline metric of the phase. Neither would have been visible
on a page with data in it. Both are fixed, and both are the reason the figures in
§4.1 are checked against the database rather than against the code.
