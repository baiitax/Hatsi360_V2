# Review and test — 25 November 2026

**Commit reviewed:** `36e5ac5` on `baiitax/Hatsi360_V2` (`main`).
**Method:** a fresh clone of the repository, `npm ci --legacy-peer-deps`,
`next build`, the full vitest suite, then a crawl of every public route at 1440
and 390 with axe-core, console-error capture and an overflow check.

---

## 1. What the crawl covered

The earlier audit scope was six routes. This one is the whole site:

```
/                       /markets         /prices            /commodities
/commodities/groundnut  /compare         /charts            /reports
/insights               /methodology     /coverage-report   /solutions
/pricing                /about           /faq               /contact
/login                  /trade           /trade/terminal    /api-docs
/api-policy             /terms           /privacy          /cookies
/disclaimer             /dashboard       /sitemap.xml       /robots.txt
/this-page-does-not-exist (404)
```

Seven of them are also crawled at 390 px. Two modes matter and they disagree:
the fixture dataset (no Supabase credentials) renders different markup from the
configured dataset. `/commodities` is clean in fixture mode and carried 32
contrast failures in configured mode, because the freshness chips only render
when there is data. **An audit without credentials is not an audit of the site
users see.**

## 2. Defects found and fixed in `36e5ac5`

### Contrast — one mistake, ten routes

| Route | Violations before | after |
| --- | --- | --- |
| `/compare` | 116 | 0 |
| `/terms` | 37 | 0 |
| `/privacy` | 35 | 0 |
| `/commodities` | 32 | 0 |
| `/api-policy` | 31 | 0 |
| `/cookies` | 28 | 0 |
| `/disclaimer` | 24 | 0 |
| `/api-docs` | 14 | 0 |
| `/pricing` | 12 | 0 |
| `/prices` | 9 | 0 |

Three causes:

1. **Paper ink on the terminal canvas.** `#465149` reads at 8.6:1 on white and
   2.19:1 on `#101713`. Eight dark-canvas pages now carry `.on-terminal`, the
   opt-in region that maps the ink scale onto the terminal text scale. A paper
   surface inside that region — `.card`, `.editorial`, `.on-paper`, or any
   element painting a light background utility — takes the paper values back.
2. **Paper brand green.** `#174d35` on the same canvas is 1.5:1. Text utilities
   are re-pointed to the light rungs; `bg-brand-700` still paints the brand
   green, so filled buttons keep their white labels. These rules are unlayered
   on purpose: Tailwind's utilities live in `@layer utilities`, and a rule
   inside `@layer components` can never outrank them however specific it is.
3. **A translucent light panel.** The coverage notice was `bg-amber-50/70` over
   near-black — 70% of a light colour over a dark one is what the browser
   measured as `#b7b7aa`, leaving amber text at 4.47:1, just under the floor. It
   is opaque now and marked as paper.

The freshness chips had a separate fault: they printed the `-700` rungs of the
success and warning ramps on a panel they read at 2.9:1 against. They use the
light rungs.

### Semantics

* `/api-docs` scrolled sideways to 1809 px — the `1fr` grid column was missing
  `min-w-0`. Fixed.
* The same page's five `<pre>` blocks were scrollable but unreachable by
  keyboard. They take focus now.
* `/coverage-report` put a `<p>` inside a `<dl>` group; the note moved into the
  `<dd>`.
* `/commodities` skipped h1 → h3 in its empty state. `EmptyStatePanel` takes a
  `level`, defaulting to 3.
* The 404 page's branding bar sat outside every landmark. It is a `<header>`.

### A runtime error, not a style one

`/charts` passed `onSelect={() => undefined}` from a server component to a
client control, so the server logged *"Event handlers cannot be passed to Client
Component props"* (digest `3084642557`) and React re-rendered the whole chart
workspace on the client. The segmented control was also dead: it looked
interactive and did nothing.

Period options now carry a real URL (`ChartOption.href`), which fixes both — the
control works with JavaScript off and a period can be bookmarked or shared.

## 3. Verification of `36e5ac5`

| Check | Result |
| --- | --- |
| `npm ci --legacy-peer-deps` on a clean clone | 525 packages in 12 s |
| `next build` | ✓ compiled, 60 routes |
| `tsc --noEmit` | 0 errors |
| `vitest run` | **1300 passed**, 22 failed, 80 skipped |
| axe-core, 28 routes @ 1440 | **0 violations** |
| axe-core, 7 routes @ 390 | **0 violations** |
| Horizontal overflow, desktop and mobile | none |
| `/sitemap.xml`, `/robots.txt` | served |
| Unknown URL | 404 with a styled page, one landmark, a way home |
| Console errors | 1 outstanding (below) |

## 4. Still open

### 4.1 A hydration mismatch on `/coverage-report`
`React error #418` on the client, in configured mode only. It reproduces with
the fix in this review stashed, so it predates the change; it does not occur in
fixture mode, which is why earlier audits never saw it. Text content differs
between the server render and the client render — the usual cause is a relative
timestamp or an ordering that depends on the moment of render. Worth a look
before launch, because React throws away the server HTML for that subtree.

### 4.2 `npm run lint` fails: 40 errors, 183 warnings
None of them are in the files this review touched, and Next 16 no longer runs
lint during `next build`, so a deploy will not fail on them — but CI would.

| Rule | Count | Files |
| --- | --- | --- |
| `react/no-unescaped-entities` | 15 | OnboardingWizard, MarketExplorer, subscription, CommodityExplorer, rfqs, ResearchSection |
| `react-hooks/purity` | 7 | MarketExplorer, analytics, client/page, MarketSnapshot, CommodityPriceView, CoverageDashboard, PriceExplorerChart |
| `react-hooks/static-components` | 7 | MarketComparisonTable (5), PremiumSidebar (2) |
| `react-hooks/set-state-in-effect` | 5 | PremiumSidebar (2), AgentShell, CollectionFlow, HatsiBootRecovery |
| `react-hooks/immutability` | 2 | OnboardingWizard, admin explorer |
| `react-hooks/rules-of-hooks` | 2 | CandlestickChart (156, 181) |
| `@next/next/no-assign-module-variable` | 2 | `tests/brand/brand.test.ts` |

The unescaped-entity and module-variable groups are mechanical. The hooks rules
are React 19 diagnostics and each needs a real change — `rules-of-hooks` inside
`CandlestickChart` is the one to look at first, because a hook behind a
condition is a live bug rather than a style preference.

### 4.3 The 22 failing tests
All are gated on `SUPABASE_SERVICE_ROLE_KEY`, which this environment does not
have: `watchlists`, `exports-entitlement`, `alerts-entitlement`,
`bulk-entitlement`. They need one run in an environment with the key. Nothing in
the code is wrong that these tests can see.

### 4.4 Deploy
The Vercel token supplied is scoped to team `baiita-x-degen-s-projects` and can
read `pluck-agro` only. The live site `hatsi360.vercel.app` belongs to project
`hatsi360` under team `baiitax`: `GET /v9/projects/hatsi360` returns *Project not
found*, and creating a project or a deployment returns *403*. The code is on
`main` and ready; the deploy needs either a token with rights on that team, or
the project's Git connection pointed at `baiitax/Hatsi360_V2`, branch `main`.
See `docs/DEPLOYMENT.md`, "Status, 25 November 2026".

`vercel.json` pins `npm ci --legacy-peer-deps` and `engines` pins Node 22 — both
were verified here, and both would otherwise be the two most likely reasons a
first build on Vercel fails.

## 5. Reproducing this review

```bash
git clone https://github.com/baiitax/Hatsi360_V2.git && cd Hatsi360_V2
npm ci --legacy-peer-deps
cp .env.example .env.local        # without it you are auditing fixture markup only
NODE_OPTIONS=--max-old-space-size=1400 npx next build
NODE_OPTIONS=--max-old-space-size=1024 npx next start -p 3100
npx vitest run
node /home/user/.tools/crawl.mjs  # 28 routes, axe + console + overflow
```
