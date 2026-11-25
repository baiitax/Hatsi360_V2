# Hatsi360 Markets — Page-by-Page Redesign Matrix

**Route inventory source:** `.next/server/app-paths-manifest.json` from the existing production build plus `src/app/` route files and `src/lib/route-map.ts`.  
**Coverage:** 86 page patterns: 34 public/site (one public `/coverage` alias is implemented internally by `/coverage-report`), 4 access-portal, 29 admin, 19 agent. API handlers are listed separately.  
**Responsive status:** `NV` means no fresh viewport/browser verification in this audit (Chromium absent); every page has a source-derived layout review, not a screenshot verdict.

## Shared layout codes

| Code | Existing layout | User / access | Family-level redesign direction |
|---|---|---|---|
| **T** | `TerminalShell` (`(site)/layout.tsx`) | Public; signed-in profile is optional except protected actions | Dark market terminal; standardize data-first page header, filter bar and panel/table spacing. |
| **E** | T plus light editorial body/`PageHero`/`.editorial` where used | Public reader | Light editorial measure and content hierarchy within the site environment; define clear transition from terminal. |
| **P** | Standalone `(portal)/layout.tsx` + `PortalFrame`/auth form | Visitor signing in/registering/recovering credentials | Focused, low-distraction access surface; mobile form and error states. |
| **A** | `AdminShell` + staff guard and role-filtered nav | Authorized staff, role-specific | Operations workspace; improve density/accessibility and consistent tables/forms; no redesign should weaken role boundaries. |
| **F** | `AgentShell` + agent/supervisor guard | Field agent or permitted supervisor | Mobile-first collection workspace; preserve thumb-first workflow, offline/loading/status visibility. |
| **R** | Redirect/entry page in a protected family | Depends on role | Verify redirect target and session return behavior; no sustained page design expected. |

## Public/site routes — 34 patterns

| Route | Audience | Purpose | Existing page/layout components | Redesign focus / priority | Complexity | Viewport |
|---|---|---|---|---|---:|---|
| `/` | Public | Market intelligence landing / public market dashboard | T; `PageHeader`, overview metrics, market watch table/cards, movers, comparisons, activity | First-screen hierarchy; freshness + comparable price context; P1 | L | NV |
| `/about` | Public | Product/company explanation | T/E; `PageHero`, image registry, editorial sections | Align hero typography and terminal-to-editorial transition; P2 | M | NV |
| `/api-docs` | Public developer | API use and examples | T; `PageHero`, code blocks, tables | Code wrapping, copy affordance, mobile examples; P2 | M | NV |
| `/api-policy` | Public developer | API access policy | T/E; policy text and structured sections | Long-form readability and navigation; P2 | S | NV |
| `/charts` | Public/analyst | Historical chart workspace | T; `PageHeader`, filters, chart frame, series controls | Small axis labels, chart controls/empty state; P1 | M | NV |
| `/commodities` | Public | Commodity catalogue and readiness | T; `PageHeader`, category nav, completeness stats, cards | Preserve evidence-first data; ensure cards and filter controls at 320; P1 | M | NV |
| `/commodities/[slug]` | Public | Commodity profile, grades, units and observations | T; readiness/profile/table components | Unit/grade hierarchy and horizontal tables; P1 | M | NV |
| `/compare` | Public | Compare a commodity across markets | T with light comparison sub-surfaces; form, summary, comparison table/chart | Make unit/grade comparability salient; mobile table treatment; P1 | M | NV |
| `/contact` | Public | Contact/business enquiry | T/E; `ContactForm`, `PageHero` | Form labels, validation, error/success; P2 | S | NV |
| `/cookies` | Public | Cookie information | T/E; `PageHero`, text/table | Legal table scrolling/readability; P3 | XS | NV |
| `/coverage` *(alias)* | Public | Collection coverage reporting | T; internal implementation `/coverage-report`, map/coverage data and table | Make coverage denominator and freshness clear; P1 | M | NV |
| `/dashboard` | Customer (signed-in data; sign-in prompt when anonymous) | Personal watchlist, alerts, API applications and plan | T; `PageHero`, workspace sections/cards | Separate from public market dashboard; order personal tasks, empty states, plan; P1 | M | NV |
| `/disclaimer` | Public | Legal/data limitations | T/E; long-form content | Reading measure and disclosure hierarchy; P3 | XS | NV |
| `/faq` | Public | Help/FAQ | T/E; question/answer sections | Scannability, anchor navigation, mobile; P2 | S | NV |
| `/insights` | Public | Research/market insight archive | T/E; `PageHeader`, editorial cards and report list | Published-state distinction, filter hierarchy, article readability; P1 | M | NV |
| `/insights/[slug]` | Public | Single insight | T/E; article and citations/provenance | Citation/source scanability and long-read measure; P1 | M | NV |
| `/markets` | Public | Market directory/search | T; `PageHero`, GET search/filter form, market cards | Search hierarchy and location/freshness context; P1 | M | NV |
| `/markets/[slug]` | Public | Individual market and prices | T; market overview, coverage, `PriceTable` | Provenance/price table on small screens; P1 | M | NV |
| `/methodology` | Public | Data methods and caveats | T/E; prose and sections | Long-form heading/anchor hierarchy; P2 | S | NV |
| `/prices` | Public | Filtered price directory | T; `PageHero`, multi-field GET filters, price table/cards | Filter layout, currency/unit/date scan, table mobile; P1 | L | NV |
| `/prices/[commodity]` | Public | Commodity price history | T; price view, chart and observations | History limitations, data freshness and chart/table parity; P1 | M | NV |
| `/pricing` | Public | Product plans/pricing | T/E; plan cards/CTAs | Clear product comparison and accessible tables; P2 | M | NV |
| `/privacy` | Public | Privacy policy | T/E; legal prose | Long-read structure and link contrast; P3 | XS | NV |
| `/reports` | Public | Published research catalogue | T/E; `PageHero`, report cards | Separate published vs unavailable; aligned report card density; P1 | M | NV |
| `/reports/[slug]` | Public | Individual report | T/E; report sections, data tables, evidence | Citation and evidence hierarchy; tables at mobile widths; P1 | L | NV |
| `/solutions` | Public | Customer/enterprise solution overview | T/E; `PageHero`, solution cards | Distinguish supported capabilities from planned claims; P2 | M | NV |
| `/terms` | Public | Terms of service | T/E; legal prose | Readability, anchor/heading navigation; P3 | XS | NV |
| `/trade` | Public | Trade intelligence overview | T; `PageHeader`, summary panels and table | Separate observed price facts from analytic interpretation; P1 | M | NV |
| `/trade/alerts` | Signed-in user; anonymous request redirects to login | Price alerts | T; alert/personalization components | Alert state and action clarity; test no-access vs empty vs loading; P1 | M | NV |
| `/trade/best-buy` | Public/market user | Sourcing intelligence | T; range/price tables and filters | Avoid recommendation implication; explain ranking period/source; P1 | M | NV |
| `/trade/best-sell` | Public/market user | Procurement intelligence | T; range/price tables and filters | Avoid recommendation implication; preserve unit/grade; P1 | M | NV |
| `/trade/fundamentals` | Public/analyst | Commodity fundamentals | T; fundamentals/evidence components | Source/confidence/time period hierarchy; P1 | M | NV |
| `/trade/terminal` | Public/market user | Dense trade terminal view | T; terminal panels/tables | Density preset and responsive field prioritization; P1 | L | NV |
| `/trade/watchlist` | Signed-in personalization | Personal watchlist | T; watchlist/alert states | Clear empty/saved/loading states; avoid placeholder activity; P1 | M | NV |

## Access portal — 4 patterns

| Route | Audience | Purpose | Existing page/layout components | Redesign focus / priority | Complexity | Viewport |
|---|---|---|---|---|---:|---|
| `/login` | Anonymous/authenticated visitor | Sign-in | P; `CentralSignInForm`/auth components | Mobile keyboard, errors, focus, return destination; P1 | M | NV |
| `/register` | New invitee/user | Registration | P; `PortalFrame`, auth form | Invitation-only business rules stay intact; form/error states; P1 | M | NV |
| `/forgot-password` | Visitor | Request recovery link | P; `PortalFrame`, recovery form | Confidence/copy and status feedback; P1 | S | NV |
| `/reset-password` | Visitor with recovery token | Set new password | P; reset form | Validation and expiry/error states; P1 | S | NV |

## Admin Control Centre — 29 patterns

All routes use **A** (staff-only shell, role-filtered navigation, server-side guards); `NV` for every page. Per-role access remains a security contract, not a design simplification.

| Route | Primary purpose | Page-specific redesign focus | Priority / complexity |
|---|---|---|---|
| `/admin` | Admin landing/redirect | Redirect and default workspace clarity | P2 / XS |
| `/admin/agents` | Agent management | Search, status, actions and roster density | P1 / M |
| `/admin/agents/[id]` | Agent detail | Profile, performance, assignment history | P1 / M |
| `/admin/analytics` | Operational analytics | Chart labels, filters, data context and empty state | P1 / M |
| `/admin/api-management` | API client management | Key/status/quota hierarchy and destructive action confirmation | P1 / M |
| `/admin/assignments` | Agent assignment management | Map/list hierarchy, filters and bulk actions | P1 / M |
| `/admin/audit` | Audit history | Dense table search, time/actor/target hierarchy | P1 / M |
| `/admin/categories` | Commodity categories | Catalogue form/table consistency | P2 / S |
| `/admin/commodities` | Commodity management | Search, grade/default/category status | P1 / M |
| `/admin/customers` | Customer management | Customer/subscription status and support actions | P1 / M |
| `/admin/exports` | Export tools | Filter, usage, progress/error/success state | P1 / M |
| `/admin/grades` | Commodity grade management | Grade relations and form density | P2 / S |
| `/admin/markets` | Market management | Location and operational status | P1 / M |
| `/admin/notifications` | Operator notifications | Unread/status navigation and read action | P2 / S |
| `/admin/observations` | Observation directory | Multi-column provenance and moderation status | P1 / L |
| `/admin/operations` | Live operations queue | Work priority, queue status, quick review | P1 / L |
| `/admin/overview` | Control Centre summary | KPI/queue hierarchy; avoid dashboard card sprawl | P1 / M |
| `/admin/profile` | Staff account profile | Account details and role context | P2 / S |
| `/admin/quality` | Quality flags | Severity/reason/remediation, table at mobile width | P1 / M |
| `/admin/reports` | Reports and exports | Separate report status from export action | P1 / M |
| `/admin/schedule` | Collection planning | Calendar/list and time-zone legibility | P1 / L |
| `/admin/search` | Global operator search | Result grouping and keyboard navigation | P1 / M |
| `/admin/settings` | System/admin settings | Form groups, save state and confirmation | P1 / M |
| `/admin/subscriptions` | Subscription operations | Read-only vs mutable/payment-confirmed state clarity | P1 / M |
| `/admin/system` | Jobs and health | Operational severity and freshness hierarchy | P1 / M |
| `/admin/tasks` | Collection tasks | Status, due date, market and agent scan order | P1 / M |
| `/admin/units` | Unit catalogue | Conversion metadata and missing-data signaling | P2 / S |
| `/admin/verification` | Verification queue | Review actions, evidence and status distinction | P1 / L |
| `/admin/zones` | Market zones | Geography hierarchy and relationship management | P2 / S |

## Field app — 19 patterns

All routes use **F** (agent/market-supervisor server guard, mobile-first shell); `NV` for every page. Preserve offline, queued and idempotent submission feedback.

| Route | Primary purpose | Page-specific redesign focus | Priority / complexity |
|---|---|---|---|
| `/agent` | Field app landing/redirect | Route to home with session preserved | P2 / XS |
| `/agent/assignments` | Assigned collection work | Due/assigned status, touch selection | P1 / M |
| `/agent/assignments/[id]` | Assignment detail | Market/commodity scope and progress | P1 / M |
| `/agent/collect` | Collection flow entry/legacy surface | Clear handoff into current workflow | P1 / S |
| `/agent/collection/[id]` | Saved collection session | Draft status, recovery and sync state | P1 / M |
| `/agent/collection/new` | New observation workflow | Six-step form, validation, numeric keypad and offline queue | P0 if data entry blocked; otherwise P1 / L |
| `/agent/corrections` | Correction requests | Evidence, reason and review state | P1 / M |
| `/agent/help` | Field help | Short, task-oriented guidance for low-connectivity use | P2 / S |
| `/agent/history` | Agent collection history | Time, status and retry action | P1 / M |
| `/agent/home` | Field dashboard | Due tasks, connectivity and next action | P1 / M |
| `/agent/markets` | Assigned market directory | Assigned-only selection and locality | P1 / M |
| `/agent/markets/[id]` | Assigned market detail | Collection task and observation entry | P1 / M |
| `/agent/notifications` | Field notifications | Delivery/read state and links | P2 / S |
| `/agent/observations` | Agent's submitted prices | Verification/published status and corrections | P1 / M |
| `/agent/observations/[id]` | Observation detail | Provenance and correction path | P1 / M |
| `/agent/performance` | Agent performance | Metrics period/method and comparison fairness | P2 / M |
| `/agent/profile` | Agent profile | Account/contact/settings | P2 / S |
| `/agent/submissions` | Submission queue | Local pending vs server accepted status | P1 / M |
| `/agent/tasks` | Task list | Due state and assignment context | P1 / M |

> No P0 finding is confirmed by this static audit. The conditional P0 wording for `/agent/collection/new` is a release acceptance rule: if a real user cannot complete or recover a collection, that is task-blocking.

## Route handlers and non-page routes

`route.ts` UI is not applicable, but contracts should have coherent API error/feedback in consuming screens. Existing handlers found: `/api/agent/submit`, `/api/auth/signout`, `/api/jobs/run`, `/api/notifications/read`, `/api/search`, `/api/v1/[...path]`, `/api/v1/commodities`, `/api/v1/insights`, `/api/v1/markets`, `/api/v1/prices/compare`, `/api/v1/prices/history`, `/api/v1/prices/latest`, `/api/v1/reports`, `/auth/callback`. The build manifest also contains `/apple-icon.png`, `/manifest.webmanifest`, `/robots.txt`, `/sitemap.xml` (non-page resources).

## Route absence / redirect notes

- No `/research` or `/ai-analyst` page pattern was found in the current build manifest or `src/app/`; the closest implemented public destinations are `/insights` and `/reports`. They are intentionally **not added** to the matrix as routes.
- `/coverage` is a public rewrite to `/coverage-report`; avoid exposing the internal implementation name in canonical links.
- Unauthenticated smoke checks returned 307 for `/admin` and `/agent`, as expected from protected shells. This is not a visual inspection or a full role-based route test.
