# Hatsi360 Markets — transformation backlog (W0)

Priorities: **P0** release/data integrity, **P1** core public product quality, **P2** supporting/strategic. Status applies to evidence collected in W0, not the aggregate state of all prior local changes. Worktree is highly modified and current deployment source is unverified.

## Gates before W1

| ID | Priority | Work | Evidence/acceptance | Status |
|---|---|---|---|---|
| W0-01 | P0 | Confirm the exact Vercel production project and current deployed Git SHA. | Owner identifies target; successful read-only deployment/project record; compare SHA with approved repository commit. | Blocked: Vercel project listing denied by connector scope. |
| W0-02 | P0 | Confirm the intended production Supabase project. | Owner confirms ref; match deployed environment and repo; record date, role and source. | Blocked: workspace `.env.local` ref is a candidate only. |
| W0-03 | P0 | Reconcile DB migration history. | Approved mapping between production ledger/schema and checked-out SQL migration chain; no unapproved DDL/DML. | Blocked: candidate migration list differs from repo. |
| W0-04 | P0 | Reproduce public counts on confirmed release/source. | Homepage, prices, markets, coverage and API public totals all use one named definition and reconcile. | Open: live 259 vs price directory 100; candidate public view 259. |
| W0-05 | P0 | Investigate future timestamps/test data and environment clocks. | Collection timestamps, DB/server clocks, API `generatedAt`, and test-fixture boundaries pass a reviewed timeline check. | Open: public and candidate data extends into Nov 2026 while audit date is Oct 22, 2026. |
| W0-06 | P0 | Fix deployed-route reliability only after target approved. | All public routes return intended content/error states on exact deployed SHA; no unexplained generic error. | Open: `/commodities/groundnut` returned generic error. |
| W0-07 | P0 | Owner/product approves W0 report, baseline and scope. | Written confirmation; no implementation phase proceeds based on disputed target assumptions. | Pending. |

## W1 — data integrity and statistical foundation (not started in this turn)

| ID | Priority | Work | Acceptance evidence | Status |
|---|---|---|---|---|
| W1-01 | P0 | Write metric specification for total/published/pending/rejected/superseded/current/stale observations and configured/reporting markets/commodities. | One source, eligibility predicates, date basis, query, and tests per metric. | Backlog. |
| W1-02 | P0 | Reconcile summary counts across homepage, prices, markets, coverage, API and sitemap. | Exact match to approved query at one `as-of` time; filters/pagination do not alter the displayed total incorrectly. | Backlog. |
| W1-03 | P0 | Define and test price comparability. | Same commodity, grade/specification, unit/conversion, currency, price type and period; explicit exclusions. | Some source-level logic exists; behavior and candidate production data not certified. |
| W1-04 | P0 | Check public movement calculations and labels. | Each value names commodity/market/price type/unit/window/sample; no stale/insufficient sample presented as current movement. | Backlog. |
| W1-05 | P0 | Approve freshness thresholds and age computation. | Thresholds tied to collection schedule; timezone/current-date tests; future timestamps rejected or flagged. | Source threshold helpers exist; public status/clock conflict needs investigation. |
| W1-06 | P0 | Verify provenance/publication and fixture isolation. | Public routes expose only published eligible rows; fixture source clearly identified; correction/supersession preserved. | Source-level intent exists; production RLS/API/browser checks outstanding. |
| W1-07 | P1 | Measure query count and explain plans for overview/movement/directory. | Bounded paginated/aggregate paths, known index usage, no unbounded N+1 at target scale. | Backlog. |
| W1-08 | P1 | Produce `PUBLIC_DATA_VALIDATION_REPORT.md`. | Row-level/privacy-safe summary, reproducible queries, source/ref and observation timestamp. | Backlog. |

## W2–W7 (deferred)

- W2 design system: do not start until W0 approved; reuse existing tokens/components and address accessibility with browser evidence.
- W3 homepage/navigation: likely consolidate many overlapping live sections; ensure copy and counts trace to W1 services.
- W4 discovery: verify price filters/URL persistence, market/commodity profile coverage and empty/error states.
- W5 intelligence: dedicated trends route is absent; source has `/charts` and comparison/trade services. Decide route strategy with owner.
- W6 business/trust: current `/solutions` is analogous to target `/business`; API is `/api-docs`, not `/api`. Verify operational claims and business contacts.
- W7 SEO/accessibility/performance/release: production deployment browser test, responsive dimensions, WCAG 2.2 AA, security and Core Web Vitals.

## Out of scope by explicit product brief

No full agent daily reporting/assignment/verification workflow work, admin control-centre redesign, billing/payment implementation, API key-management implementation, buyer/seller execution, escrow, logistics, export fulfilment, or trading execution as part of public website transformation. Existing internal app changes are outside this backlog unless a separate phase is approved.

## Risk and dependency notes

- A local-only source improvement cannot repair a different deployed SHA.
- A repo migration cannot safely be applied while the target/ledger identity is unclear.
- A design change cannot correct wrong timestamps or unsupported prices.
- Existing transformations are staged/uncommitted across hundreds of files; define a clean baseline before reviewing or committing.
