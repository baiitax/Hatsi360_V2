# Hatsi360 Markets — UI Implementation Roadmap

**Planning only. No implementation is authorized by this document.** Estimates are engineering effort, not calendar commitments; they exclude content production, product decisions and backend work.

## Guiding sequence

1. Reproduce the current baseline with a real browser and capture evidence.
2. Approve the contrast/type/surface tokens before altering a color or component.
3. Fix accessibility and mobile obstructions in shared shells.
4. Redesign the public market-terminal landing and core price tasks.
5. Extend the approved patterns across remaining public/editorial routes.
6. Treat admin and field app as distinct operational products sharing an accessible system.
7. Run visual, responsive, accessibility and regression checks before release.

## Phased plan

| Phase | Scope and deliverables | Dependencies | Estimate | Priority | Acceptance criteria |
|---|---|---|---:|---|---|
| **0 — Forensic baseline** | Complete repository/route/component audit; run actual browser at 8 target viewports; record screenshots, overflow, focus, touch targets, contrast, form/table/chart behavior; capture performance baseline. This document set is the static audit; browser evidence remains open. | Chromium/browser environment; preview server; test credentials for role-gated routes. | 2–4 days | P0 prerequisite | All 86 page patterns classified; representative routes/screens for public, portal, admin, agent; 0 unexplained horizontal overflow; current focus and landmark behavior recorded; no invented visual claims. |
| **1 — Design foundation** | Approve tokens; contrast recalculation; type/number scales; spacing/radius/shadow; page family/surface rules; CSS/Tailwind mappings; component contracts and deprecation list. | Product/design sign-off on dual-surface strategy and market-movement semantics. | 3–5 days | P1 | Normal text ≥4.5:1, large ≥3:1; meaningful controls/focus ≥3:1; test both surfaces; tokens and docs stay synchronized. |
| **2 — Application shell** | Fix skip-link targets; focus-visible; mobile drawer focus lifecycle; bottom-nav safe area/content clearance; standardize page header/container APIs; document six-module nav and four/five-item bars; resolve orphan `SiteHeader` only after usage gate. | Phase 1 tokens and Phase 0 browser findings. | 4–6 days | P1 | Keyboard-only success in all shells; assistive technology recognizes dialog expanded state and return focus; fixed bars do not obscure last content at 320×568; 44px mobile targets where appropriate; role boundaries unchanged. |
| **3 — Core market dashboard** | Homepage first viewport: coverage/freshness, most useful confirmed metrics, latest comparable prices, movers/comparison; standardize empty/partial data state; retain data provenance. Keep `/dashboard` personal workspace distinct. | Phase 1 page-family contracts; evidence/data availability review; no hardcoded visual data. | 4–7 days | P1 | Dashboard uses real server data only; user can identify period, market, unit and freshness; empty/unavailable are distinct; mobile and desktop hierarchy passes usability review. |
| **4 — Data interfaces** | Price directory, market/commodity detail, compare, chart workspace, fundamentals, trade terminal; tables, filters, search, chart frame, mobile detail patterns. | Phase 3 data hierarchy; current API/data integrity unchanged. | 6–10 days | P1 | Units/grades/source/time visible; no misleading comparisons; sortable state accessible; every scroll table has discoverable overflow; chart data has text/table alternative; low-width screens readable. |
| **5 — Remaining pages** | Apply tokens to insights/reports/legal/support/pricing/API docs/solutions and all route families; consistent forms, breadcrumbs, empty/loading/error states. | Approved foundation and page matrix. | 5–8 days | P2 | All public pages use an explicit family; route/metadata/canonical links unaffected; no dead controls; all content and legal text preserved. |
| **6 — Admin and field surfaces** | Align color/type/focus/navigation/table/form primitives across staff and field apps without making the workflows identical; update glyph icons; verify offline/queued task feedback. | Shell accessibility baseline; role/session fixtures. | 5–8 days | P1 | All role guards remain; field collection can complete under weak/offline network; no status conveyed only by color; staff tables/queues usable on tablet and phone. |
| **7 — Responsive optimization** | Mobile/tablet-specific grids; table affordances; chart sizing; safe-area and short-height layouts; touch targets; zoom/reflow. | New design system and all major route work. | 3–6 days | P1 | Eight target viewports and breakpoint boundaries captured; no unintended document overflow; core workflows tested at 200% zoom; screenshot diff reviewed. |
| **8 — Quality assurance and release** | Visual regression, WCAG 2.2 AA audit, keyboard/screen-reader tests, functional/API/RLS regression, performance test, browser compatibility and final design-system drift scan. | Phases 1–7; test credentials/data fixtures. | 4–7 days | P0 release gate | No critical/serious accessibility defect; no route/API/database/auth behavior regression; builds and tests pass; approved screenshots; rollback plan. |

### Overall estimate

Roughly **36–61 engineering days** for a comprehensive redesign across 86 page patterns and four shells, including baseline verification and QA. The initial foundation/shell/dashboard tranche is approximately **13–22 days**. The range depends on how many routes truly share patterns after visual inspection; it is not a commitment to rewrite 86 pages independently.

## Risks and constraints

| Risk | Mitigation |
|---|---|
| Audit lacks fresh screenshots and actual viewport measurements | Acquire browser runtime; complete Phase 0 before approving visual behavior changes. |
| Brand documentation contrast figures differ from recomputation | Recalculate from authoritative token source and update docs/tests together in Phase 1. |
| Dense data tasks lose essential context on mobile | Keep units, location, period, source/freshness and status; transform layout rather than hide key information. |
| Redesign changes feature/auth behavior unintentionally | Keep page-server contracts and role/RLS logic unchanged; regression test route access. |
| Existing blank/empty states are replaced with fabricated visual examples | Never add hardcoded market data; use existing evidence fixtures only in isolated previews and label them. |
| Too many design systems consolidated in one pass | Establish page-family adapter; migrate in small route groups and compare screenshots. |
| 10 existing lint errors and 33 warnings | Record baseline; schedule dedicated fixes separately; do not mix unrelated behavior fixes with styling work. |

## Rollback strategy

- Token changes remain additive and page-family scoped at first; keep legacy values available behind explicit semantic aliases until the affected route family is verified.
- Shell changes land separately from content changes. Revert shell commit independently if focus, navigation or route behavior regresses.
- Visual changes must not alter Supabase queries, API route contracts, authorization checks, product rules or data values.
- Each page family has an approved before/after screenshot set; revert the family-specific class/component migration rather than broad project styling.
- Preserve existing component implementation until direct consumer search and regression tests support retirement.

## Definition of complete

The roadmap is complete only with all eight viewport evidence sets, all 86 route patterns classified and family-reviewed, the top accessibility findings resolved and tested, the core market tasks redesigned, role-protected portals regression-tested, and the seven audit deliverables updated to reflect actual shipped behavior. No deployment claim is made by this audit.
