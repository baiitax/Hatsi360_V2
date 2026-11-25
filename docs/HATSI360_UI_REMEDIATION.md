# Hatsi360 — UI remediation, November 2026

This is the engineering record of the review-and-fix pass on the public site. It is the
counterpart of the review report delivered to the owner (`hatsi360-ui-review.html`): that
document says what was wrong and shows the evidence, this one says what changed and how it was
verified.

Scope: the public terminal (`(site)` route group), the two operator applications' navigation,
the shared design tokens, and the repository's own test suite. Not in scope: the database schema,
the collection rota, billing, and anything behind the signed-in payment gate.

---

## 0. The state it started from

The repository would not build. 91 files carried unresolved merge-conflict markers, a marketing
component tree (`src/components/homepage/`) duplicated the terminal one, two route groups resolved
to the same path, and several modules had been merged by taking one side of the conflict, which is
wrong for declaration-only modules. The deployed site showed a 3146 px document at a 1440 px
viewport, a navigation bar starting at x=2443, `/commodities/*` returning 500 (React error #441),
ticker links pointing at `/commodities/brown-` and `/commodities/sorghu`, and 99 of 141 audited
elements failing colour contrast.

## 1. Unblocking the build

| Change | Why |
| --- | --- |
| `scripts/resolve_conflicts.py --write` | Resolved 89 of the 91 conflicted files by keeping the side that wins; the audit log is in `review/dropped/`. |
| `scripts/union_merge.py` on `ui/icons.tsx` | A declaration-only module: both sides added exports, so neither side alone is correct. 25 icons recovered. |
| Deleted `src/components/homepage/` | A retired marketing tree that nothing imported, and that pulled a second design language into the bundle. |
| Deleted `src/app/(site)/commodities/[slug]/` and `src/app/(market-detail)/` | Two route groups resolving to the same URL, which is what broke the Turbopack build and, in production, the commodity page. |
| Repaired `AgentShell.tsx` | An unbalanced brand block from the merge. |
| `.env.local` (gitignored) | Exposes the publishable Supabase key so the site can be run against the real project. The service-role key is deliberately absent. |

## 2. Structure and navigation

- The desktop navigation no longer overflows: the six modules come from `MARKET_NAV` and the full
  site index lives in the footer.
- The ticker's commodity links are built from slugs, not from `name.toUpperCase().slice(0, 6)`.
  The 3146 px document was that expression plus a navigation that could not wrap.
- The mobile bottom bar is **portalled to `document.body`** (`MobileNavigation.tsx`). It lived
  inside the sticky header, and the header sets `backdrop-filter`; that makes the header the
  containing block for `position: fixed` descendants, so a `bottom-0` bar was pinned to the top of
  the *header* and covered the logo, the search field and the sign-in control on every phone.
  This was invisible in a desktop audit and obvious in the first mobile screenshot.
- `PageHero` now defaults to the terminal environment (`tone="terminal"`), and `Breadcrumbs` takes
  the same tone. Before this, the directory pages opened as a full-bleed white sheet inside the
  dark terminal and then turned dark again below the fold — two environments meeting at an
  arbitrary line. A page that is deliberately a light document passes `tone="editorial"`.
- The dead `/client/api` navigation item is gone from `ClientSidebar`. That page has never
  existed; API key issuance (`KNOWN_LIMITATIONS` §8) still has no screen.

## 3. Trust: the numbers, the units and the movement

The product's promise is that every figure is traceable. Several places broke that promise.

- **`splitUnitName()`** (`src/lib/money.ts`) splits `bag (commodity-specific weight)` into a
  display unit and a qualifier. The qualifier becomes a `title` and a `*`, and the table carries a
  footnote that a bag of sesame and a bag of maize do not weigh the same. Applied in
  `MarketWatchTable`, `PriceTable` and the homepage movers list, which previously printed the
  parenthetical in three different ways.
- **The movement columns were a data-join bug, not an absence of data.** `movementFor()` compared
  the raw `row.priceType` (`wholesale_transaction`) with the display label
  `watchRow.priceTypeLabel` (`wholesale transaction`), so the join never matched and every daily
  and weekly cell rendered "—". `MarketWatchRow` now carries the raw `priceType` and the join uses
  it. The columns still legitimately read "—" for every row today, because no comparable pair
  falls inside the 24-hour or 7-day window — so the table now *says* that, instead of leaving the
  reader to guess.
- **The gainers/decliners panels contradicted themselves.** The decliners list was "has a number,
  sorted ascending", so in a session where every comparable series rose, the "Price decliners"
  panel listed risers — a down arrow beside a plus sign. Each panel now shows only movements in
  its own direction, the arrow follows the sign it sits next to, and an empty panel says which
  silence it is (nothing to compare / nothing moved / nothing moved this way).
- **Counts are labelled.** `SectionHeader` takes a `countLabel`, so "12" reads
  "12 shown, most recent first" rather than being a bare numeral beside a heading.
- **Freshness is derived, not asserted.** `formatAge()` renders "last observation 14 Nov, 09:00 ·
  11 days ago" in the header; the "LIVE" badge that sat over eleven-day-old data is gone.

## 4. Accessibility

Machine-verified, not asserted: axe-core reports **zero violations** on `/`, `/markets`, `/prices`,
`/commodities/groundnut`, `/trade` and `/login` at 1440×900, with no console errors, and there is
no horizontal overflow at 360, 390 or 414 px.

What the first run found and what fixed it:

| Finding | Fix |
| --- | --- |
| `/prices` 21 nodes, `/markets` 14 — light cards inheriting the terminal's `#f3f6f2` foreground | `.card`, `.editorial .card`, `.terminal .card` declare their own foreground |
| `/trade` paywall at **1.01:1** | Rebuilt on the terminal palette |
| Status badges at 2.34–2.6:1 on dark | `-500/40` border, `-500/15` fill, `-300` text |
| Footer at 2.86:1 | `/50` → `/75` |
| Two headings at 1.01:1 and 3.07:1 on `/markets` | Re-tokenised to `text-terminal-text` / `-muted` |
| Nested `<main>` | Paywall `<main>` → `<div>` |
| `<dl>` with `<p>` children | `<dd>` spans; the commodity card grid is a `div` |
| Progress bar overflowing its track | `.hatsi-progress { overflow: hidden }` |
| Grid blowout at 360 px | `min-w-0` on the tracks, not `overflow-x` |
| Breadcrumb at 1.72:1 on the new dark hero | `Breadcrumbs` is tone-aware |

Undefined Tailwind utilities were also silently doing nothing: `text-terminal-muted` (52 uses),
`bg-success-50`, `text-error-600`, `text-success-600`, `text-warning-600`, `text-info-400`,
`border-warning-100`, `bg-warning-400`, `from-error-400`, `border-terminal-accent`. The theme now
defines all of them — before, those elements inherited whatever colour their parent had, which is
how a "muted" label ended up darker than the label beside it.

`public/brand/` now contains only the artwork the owner supplied: a 2.5 MB unused hero photograph,
an unused full lockup and a 1.08 MB duplicate social card were removed, and the six pages that
referenced the duplicate now point at the registered card. The design-system suite is green
(22/22) for the first time.

## 5. Authorisation

Eleven pages under `/admin/intelligence/**` returned for any staff role: they called
`requireStaff` while the repository's rule (`tests/auth/admin-route-guards.test.ts`) is that every
console module checks its **own path** against `ROLE_PATHS`. `/admin/intelligence` was not in the
role map at all, so the per-path check could not have been written. The paths are now declared for
`market_supervisor` and `analyst` (administrators reach them through `/admin`), and every page in
the module calls `requirePathAccess('<its own path>')`.

## 6. Test suite

`46 failed | 1276 passed | 80 skipped` at the start of this pass, across 9 files.
`22 failed | 1300 passed | 80 skipped` at the end, across 4 files — and all 22 remaining failures
are the same missing credential:

```
Error: Supabase admin access is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
```

They are `tests/entitlements/watchlists.test.ts` (20) and three suites in `tests/phase-08a/`
(21 cases, 2 collection errors). They are not fixed here because writing a service-role key into
the workspace is not a fix; they need one run in CI or on a developer machine with the key
present.

Fixed on the way:

- `tests/ux/experience.test.tsx` (7 → 0). The suite looked for `pluck-live.*` storage keys and
  `CollectionFlow` wrote `hatsi360.*`. The component now *reads* the legacy keys, migrates them,
  and clears them, so a field agent mid-draft when the rename shipped does not lose work.
- `tests/routing/internal-links.test.ts` (1 → 0). Dead `/client/api` link.
- `tests/design-system/design-system.test.ts` (4 → 0). The unit assertion now checks the
  compaction that ships; the palette and utility failures were real drift and are fixed in
  `globals.css`, not in the test.
- `tests/auth/admin-route-guards.test.ts` (11 → 0). See §5.
- `tests/brand/brand.test.ts` (1 → 0). Unregistered assets removed from `public/brand`.

## 7. How to re-verify

```bash
npm ci --legacy-peer-deps
printf 'NEXT_PUBLIC_SUPABASE_URL=...\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...\n' > .env.local
npx tsc --noEmit                 # 0 errors
NODE_OPTIONS=--max-old-space-size=1536 npx next build
NODE_OPTIONS=--max-old-space-size=1024 npx next start -p 3100 -H 0.0.0.0
npx vitest run                   # 1300 passed, 22 credential-gated
```

The browser harness used for the audit is not part of this repository: it is a Playwright +
axe-core script that visits the six routes at 1440×900, records status, title, H1, document
height, `scrollWidth` against `innerWidth`, the axe violations with their nodes, and any console
error, and takes a mobile pass at 390 px. The same run produces the screenshots in the delivered
review.

## 8. What is still open

Recorded in `docs/KNOWN_LIMITATIONS.md` §16, with the numbers attached: the light panels on the
directory routes, the ~950 KB of script they ship, the 17-record verification backlog that
operators cannot see, and the one credential-gated test run.
