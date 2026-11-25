# Hatsi360 — Agricultural Market Intelligence Platform

**Hatsi360** is a comprehensive agricultural commodity price transparency and market intelligence platform for **Pluck Agro**. It serves as the successor to the legacy PHP site, rebuilt from the ground up with modern web technologies.

Built on **Next.js 16** (App Router) + **TypeScript** + **Supabase**, Hatsi360 is designed around three core principles:

- 🎯 **Honest Data** — Every published price is a real observation with traceable provenance
- 🔒 **Real Permissions** — Role-based access control enforced at the database layer
- ✅ **Verified Workflow** — Structured collection → verification → publication pipeline

> **The platform never invents a price.** Every published figure comes from an observation with a real collection time, market, unit, currency, price type and source. Where data is missing, the interface clearly indicates it.

---

## 📊 Platform Status

| Component | Details |
| --- | --- |
| **Database** | PostgreSQL 18.4 with 51 tables, all with Row Level Security, 97 fine-grained policies, 2 views |
| **Migrations** | 15 migration files, apply cleanly and include comprehensive seed data |
| **Testing** | 296 Vitest tests + 169 RLS policy tests + 221 workflow integration tests (all against real database) |
| **Build** | Next.js 16.4.2 — 99 route entries: 51 pages, 11 API routes, 19 agent routes, 30 admin routes, 4 auth routes, 2 intelligence routes |
| **Interfaces** | Unified SSO login + Super Admin Control Centre (16 modules) + Phone-first Market Agent App (7 workflows) |
| **Data Pipeline** | Real-time field collection with verification trails + historical archive with 50k+ observations |
| **Operations** | 5 scheduled jobs, 12 audit-ready CSV reports, real-time notifications, quality rule engine, immutable audit trail |
| **Roadmap** | Evidence upload, SMS/email notification delivery, usage-based billing, demand forecasting, geographic heatmaps |

**See [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md) for the full roadmap.**

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+ or 22 LTS
- **PostgreSQL** 18.4+ (via Supabase or local)
- **npm** or similar package manager

### Installation & Setup

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/baiitax/Hatsi360_V2.git
   cd hatsi360
   npm ci --legacy-peer-deps
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase project credentials
   ```

3. **Apply database migrations:**
   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push                # Applies migrations 0001–0015
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open **http://localhost:3000** in your browser.

### Available Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Run production build |
| `npm run typecheck` | TypeScript type checking (`tsc --noEmit`) |
| `npm test` | Run all 296 Vitest tests |
| `npm run test:watch` | Vitest in watch mode for development |
| `npm run lint` | ESLint validation |
| `npm run verify:migrations` | Validate migrations on a real PostgreSQL instance |
| `npm run seed` | Seed reference data (run after migrations) |

---

## 📁 Project Structure

```
hatsi360/
├── 📋 docs/
│   ├── AUDIT_REPORT.md                 # Findings from legacy site & rebuild verification
│   ├── MIGRATION_PLAN.md               # Legacy→new URL mapping & go-live sequence
│   ├── RLS_AUTHORIZATION.md            # Complete permission model & policy map
│   ├── DEPLOYMENT.md                   # Deploy, backup, restore & rollback guides
│   ├── KNOWN_LIMITATIONS.md            # Features in development
│   └── BUILD_REPORT.md                 # Phase-by-phase implementation report
├── 📦 public/
│   ├── brand/                          # Logos, favicons, social cards
│   └── img/                            # Representative market imagery
├── 🔧 scripts/
│   ├── build_legacy_dataset.py         # Reconstruct historical dataset deterministically
│   ├── gen_seed_migration.py           # Generate seed data from commodity catalogue
│   ├── validate_migrations.sh          # Comprehensive migration validation suite
│   └── validate-migrations.mjs         # Node runner for validation
├── 💾 src/
│   ├── app/                            # Next.js App Router — route files
│   │   ├── api/v1/                     # Versioned read-only JSON API
│   │   ├── auth/                       # Supabase auth callbacks
│   │   ├── (site)/                     # Public pages: /, /prices, /markets, /commodities, etc.
│   │   ├── intelligence/               # Commodity intelligence (FAOSTAT, USDA data)
│   │   ├── agent/                      # Field collection console (19 routes)
│   │   ├── admin/                      # Verification & operations console (30 routes)
│   │   ├── (portal)/                   # Authentication: login, register, password reset
│   │   ├── globals.css                 # Tailwind v4 design system with @theme tokens
│   │   ├── layout.tsx                  # Main shell: topbar, header, footer, skip links
│   │   ├── not-found.tsx               # Custom 404 page
│   │   ├── robots.ts & sitemap.ts      # Machine-readable files
│   │   └── manifest.ts                 # PWA manifest
│   ├── 🎨 components/
│   │   ├── ui/                         # Design system: SectionHeading, EmptyState, PriceFigure
│   │   ├── site/                       # SiteHeader, SiteFooter, navigation
│   │   ├── data/                       # PriceTable, PriceChart, DataCoverageNotice
│   │   ├── intelligence/               # CommodityIntelligence, ProductionChart
│   │   ├── forms/                      # CentralSignInForm, ContactForm, auth forms
│   │   ├── ops/                        # Admin UI: DataTable, KpiCard, Charts
│   │   ├── agent/                      # AgentShell, CollectionFlow, TaskControls
│   │   ├── admin/                      # AdminShell, VerificationActions
│   │   ├── market/                     # MarketOverview, MarketWatchTable
│   │   ├── terminal/                   # Trading terminal components
│   │   ├── loading/                    # Preloaders & skeleton screens
│   │   └── brand/                      # Logo & branding components
│   ├── 📚 lib/
│   │   ├── api/                        # Request envelope, auth, rate limiting
│   │   ├── analytics/                  # Metric registry, computation, comparison
│   │   ├── auth/                       # Session helpers, server actions, route guards
│   │   ├── content/                    # Editorial content management
│   │   ├── intelligence/               # External data queries (FAOSTAT, USDA)
│   │   ├── data/                       # DataSource interface (supabase | fixture)
│   │   ├── forms/                      # Server actions for contact/submission forms
│   │   ├── jobs/                       # Scheduled job runner & definitions
│   │   ├── notifications/              # Notification service & channel adapters
│   │   ├── operations/                 # Agent & admin read models, server actions
│   │   ├── quality/                    # Versioned quality rule engine
│   │   ├── reports/                    # Report registry, role scoping, CSV export
│   │   ├── supabase/                   # Browser, server & admin clients
│   │   ├── trade/                      # Candle engine, freshness, movements
│   │   ├── money.ts                    # NGN currency formatting
│   │   ├── pricing.ts                  # Price aggregation & comparability logic
│   │   ├── brand.ts                    # Brand constants & navigation config
│   │   └── metadata.ts                 # SEO & page metadata builders
│   ├── 📊 data/
│   │   ├── legacy/                     # Historical observations archive (50k+ records)
│   │   └── seed/                       # Reference data catalogue
│   └── 🏷️ types/domain.ts              # Complete domain type definitions
├── 🗄️ supabase/
│   ├── migrations/                     # 0001–0015: sequential schema + seed data
│   └── seed/                           # Reference data for seeding
├── ✅ tests/
│   ├── pricing.test.ts                 # Aggregation & comparability rules
│   ├── observations-validation.test.ts # Data validation logic
│   ├── data-integrity.test.ts          # Archive verification
│   ├── api-*.test.ts                   # API endpoint validation
│   ├── analytics/                      # Metric computation & day boundaries
│   ├── quality/rules.test.ts           # Quality rule engine & severity levels
│   ├── auth/routing.test.ts            # Role-based routing & redirects
│   ├── operations/navigation.test.ts   # Console navigation logic
│   ├── reports/reports.test.ts         # Report builders & CSV generation
│   ├── security/client-bundle.test.ts  # Bundle analysis & secrets detection
│   ├── ux/experience.test.tsx          # Field app offline behavior & a11y
│   ├── rls/permission-tests.sql        # 169 RLS policy validations
│   └── operations/workflow-tests.sql   # 221 workflow integration tests
├── 🛠️ Configuration files
│   ├── .env.example                    # Environment variables template
│   ├── eslint.config.mjs               # ESLint configuration
│   ├── vitest.config.ts                # Vitest configuration
│   ├── tsconfig.json                   # TypeScript configuration
│   ├── next.config.ts                  # Next.js config (security headers, redirects)
│   ├── postcss.config.mjs              # PostCSS with Tailwind
│   └── package.json                    # Dependencies & scripts
└── 📄 README.md (this file)
```

**Key directories explained:**
- **`src/app/`** — Every file/folder is a route via Next.js App Router
- **`src/lib/data/`** — The DataSource abstraction makes code DB-agnostic
- **`supabase/migrations/`** — Schema versioning + reproducible deployments
- **`tests/`** — Tests are co-located with their corresponding features

---

## 🏗️ Architecture & Design

### The Data Layer

Every page, API route and server action talks to a `DataSource` interface ([`src/lib/data/source.ts`](src/lib/data/source.ts)) with two implementations:

- **`supabase`** — Production backend: PostgreSQL with Row Level Security (RLS)
- **`fixture`** — Historical dataset: read from `src/data/legacy/production-observations.json` for offline testing

Both implementations return identical shapes, so the application code cannot tell them apart. This abstraction enables:
- Testing against real data without connecting to Supabase
- Offline-first development
- Database-agnostic business logic

### Money & Units

Hatsi360 treats monetary and measurement data with precision:

- **All monetary columns** use PostgreSQL `numeric(18,4)` — no floating-point rounding errors
- **Dual storage**: `reported_amount`/`reported_unit_id` preserve exactly what agents enter; `normalized_amount`/`normalized_unit_id` store canonical values in base units
- **No silent conversions**: Incompatible units remain `NULL` — missing conversion data is never papered over
- **Bag units**: Bags are never auto-converted to kilograms (bag weights vary by commodity)
- **Comparisons**: Bucketed by `(commodity, grade, price_type, unit)` — incompatible buckets are warned about, never merged

### Publication Workflow

```
collection ──► draft ──► pending_verification ──► verified ──► published
                                  │                                    │
                                  └──► rejected        correction_requested
```

**Key invariants:**
- Agents may only submit `draft` or `pending_verification` for their assigned markets
- **Published observation fields are immutable** — even administrators cannot edit them
- **Corrections** append new rows with history via `public.append_correction()`:
  - Original row marked `is_current = false`
  - Revision snapshot recorded
  - Verification event logged
- **Public reads** return: `is_current AND published_at IS NOT NULL AND verification_status IN ('verified', 'legacy_unverified')`

### Permission Model

Three-layered authorization, with the database as the authority:

1. **Server Layer** — `src/lib/auth/guards.ts` (`requireUser`, `requireStaff`, `requireAdmin`)
2. **API Layer** — Bearer/X-API-Key auth, scope checks, per-app rate limits
3. **Database Layer** — 97 RLS policies across 51 tables + triggers for:
   - Immutability enforcement (published prices cannot be edited)
   - Role escalation prevention
   - Last-admin protection

📖 **Full policy map**: [`docs/RLS_AUTHORIZATION.md`](docs/RLS_AUTHORIZATION.md)

---

## 🗺️ Routes & Interfaces

### Public Website

Fully SEO-optimized, with real sitemaps and robots.txt.

| Route | Purpose |
| --- | --- |
| `/` | Homepage: hero, price ticker, trends, market watch, analytics, insights, features, CTA |
| `/prices` · `/prices/[commodity]` | Interactive commodity price directory with search, filters, heatmap, intelligence panels |
| `/commodities` · `/commodities/[slug]` | Commodity profiles with production data, grades, conversion factors |
| `/markets` · `/markets/[slug]` | Market directory with coverage, collection frequency, last update |
| `/compare` | Cross-market price comparison (bar charts + sortable tables) |
| `/intelligence` · `/intelligence/[slug]` | Commodity intel: FAOSTAT production, USDA trends, global market drivers |
| `/charts` | Candlestick chart workspace with customizable indicators |
| `/trade` · `/trade/terminal` · `//trade/watchlist` · `/trade/alerts` | Trading workspace with real-time data, alerts, fundamentals |
| `/insights` · `/insights/[slug]` | Market analysis articles with data embeddings |
| `/dashboard` | Authenticated user workspace: saved items, alert subscriptions, API keys |
| `/pricing` · `/contact` · `/about` · `/faq` | Commercial pages + contact form |
| `/api-docs` | Interactive API reference with live response examples |
| `/sitemap.xml` · `/robots.txt` | Machine-readable metadata |

### Super Admin Control Centre

Unified role-based console. Only implemented modules appear; only allowed roles can access them.

| Module | Route | Purpose |
| --- | --- | --- |
| **Overview** | `/admin/overview` | 12 KPIs, ops feed, collection trends, coverage map, action queue |
| **Verification** | `/admin/verification` | Four audited acts: approve, request correction, reject, publish |
| **Observations** | `/admin/observations` | Full directory with server-side filtering, sorting, pagination |
| **Quality** | `/admin/quality` | Flagged observations with triggering rule and version |
| **Tasks** | `/admin/tasks` | Collection tasks by status, overdue alerts |
| **Agents** | `/admin/agents` | Provision, enable/disable, assign markets to field agents |
| **Markets** | `/admin/markets` | Market master data, coverage stats, collection frequency |
| **Schedule** | `/admin/schedule` | Collection plan builder, task generation |
| **Analytics** | `/admin/analytics` | Productivity, coverage, commodity quality metrics |
| **Reports** | `/admin/reports` | 12 audit-ready CSV exports with expiration tracking |
| **Notifications** | `/admin/notifications` | Admin's notification inbox |
| **Audit Trail** | `/admin/audit` | Immutable log of all system changes |
| **Settings** | `/admin/settings` | Business rules, collection params, security, integrations |
| **System** | `/admin/system` | Job definitions, run history, manual job triggers |
| **Search** | `/admin/search` | Global search: agents, markets, commodities, observations |

### Market Agent App

Phone-first, low-bandwidth, offline-capable interface for field teams.

| Screen | Route | Purpose |
| --- | --- | --- |
| **Home** | `/agent/home` | Day's tasks, assigned markets, corrections waiting |
| **Collect** | `/agent/collect` | Six-step guided flow: market → commodity → price type → amount → time/notes → review |
| **Tasks** | `/agent/tasks` | Start, complete, or cancel tasks with reason |
| **Submissions** | `/agent/submissions` | Historical submissions with review status and feedback |
| **Notifications** | `/agent/notifications` | Agent's notification inbox |
| **Profile** | `/agent/profile` | Account settings, assigned markets, sign out |

**Features:**
- ✅ Offline queue with auto-retry (idempotent via `request_id`)
- ✅ Batch data entry for repeat collections
- ✅ Draft auto-save
- ✅ Works on 2G networks

### JSON API

Versioned, paginated, rate-limited API for external consumers.

```bash
# Latest prices for a commodity
curl 'https://<host>/api/v1/prices/latest?commodity=paddy-rice' \
  -H 'Authorization: Bearer <api-key>'

# Historical prices with date range
curl 'https://<host>/api/v1/prices/history?commodity=maize&start=2024-01-01&end=2024-12-31' \
  -H 'Authorization: Bearer <api-key>'

# Cross-market comparison
curl 'https://<host>/api/v1/prices/compare?commodity=sorghum&markets=mushin,balogun' \
  -H 'Authorization: Bearer <api-key>'

# Commodity and market directories
curl 'https://<host>/api/v1/commodities' -H 'Authorization: Bearer <api-key>'
curl 'https://<host>/api/v1/markets' -H 'Authorization: Bearer <api-key>'
```

**All endpoints return:**
- Uniform envelope with metadata
- Zod-validated parameters
- `X-RateLimit-*` headers
- SHA-256 hashed API keys (never stored in plain text)

---

## 📌 Core Principles

Hatsi360 is built around six unwavering principles:

1. **🎯 Never Fabricate**
   - No invented prices, no forecasts, no fallback values
   - Missing data is rendered as an honest empty state
   - The interface always says "we don't have this data"

2. **📰 Published Means Published**
   - A price without timestamp, market, unit, price type, and source is **not published**
   - The database is the source of truth for publication state
   - Errors in unpublished data are hidden from public APIs

3. **🔍 Hide Nothing by Omission**
   - Errors are logged with full context, never stripped
   - Secrets and credentials are never committed or logged
   - Every decision point is auditable

4. **🗄️ The Database Decides**
   - Hiding a button in the UI is not authorization
   - Row-level security policies enforce every permission
   - Database-level constraints prevent data corruption

5. **📝 Append, Never Overwrite**
   - Corrections create new rows with history
   - Original records are marked `is_current = false`
   - Full revision trail is maintained
   - No data is silently lost

6. **📊 Every Figure Has Provenance**
   - Commodity, market, unit, price type, collection time, and verification status travel with every number
   - Agents collect with full attribution
   - Verifiers leave audit trails
   - Reports export with complete context

---

## 🧪 Testing

Hatsi360 has **comprehensive test coverage** with real database validation:

### Unit & Integration Tests
- **296 Vitest tests** covering:
  - Pricing logic and aggregation rules
  - Observation validation
  - Data integrity checks
  - API endpoint behavior
  - Analytics computation
  - Quality rule evaluation
  - Auth routing
  - Report generation
  - Navigation logic

### Database Permission Tests
- **169 RLS policy validations** — all policies tested against PostgreSQL
- **221 workflow integration tests** — end-to-end scenarios
- **Smoke test on schema** — validates migrations apply cleanly

### Running Tests

```bash
# Run all tests once
npm test

# Watch mode for development
npm run test:watch

# Type checking
npm run typecheck

# Full validation suite (includes database tests)
npm run verify:migrations
```

---

## 🔐 Security

Security is embedded throughout the platform:

- **No secrets in code** — All credentials loaded from `.env.local`
- **Database-level enforcement** — RLS policies block unauthorized access before it reaches the app
- **API key hashing** — Keys are SHA-256 hashed before storage
- **Rate limiting** — Per-API-key rate limits in X-RateLimit headers
- **CORS & CSP** — Strict content security policy and origin validation
- **Idempotent submissions** — `request_id` prevents duplicate processing
- **Audit trail** — Every change is logged with actor, timestamp, and reason
- **Last-admin protection** — System prevents accidental lockout

**See [`docs/RLS_AUTHORIZATION.md`](docs/RLS_AUTHORIZATION.md) for complete security model.**

---

## 📖 Documentation

| Document | Contains |
| --- | --- |
| **[`docs/AUDIT_REPORT.md`](docs/AUDIT_REPORT.md)** | Findings from legacy site analysis + rebuild verification |
| **[`docs/MIGRATION_PLAN.md`](docs/MIGRATION_PLAN.md)** | Legacy→new URL mapping, page-by-page conversion, go-live sequence |
| **[`docs/RLS_AUTHORIZATION.md`](docs/RLS_AUTHORIZATION.md)** | Complete permission model, 97 policies, reasoning for each |
| **[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)** | Deploy, backup, restore, rollback procedures + monitoring setup |
| **[`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md)** | Planned features and why they're not in v1.0 |
| **[`docs/BUILD_REPORT.md`](docs/BUILD_REPORT.md)** | Phase-by-phase implementation details with evidence |

---

## 🚢 Deployment

### Environment Setup

```bash
# Production deployment
cp .env.example .env.production
# Fill in production Supabase credentials, secrets, etc.

# Apply migrations to production database
npx supabase db push --linked
```

### Production Build & Run

```bash
npm run build
npm start
```

**See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for:**
- Deployment to Vercel, AWS, or self-hosted
- Database backup and restoration
- Rollback procedures
- Monitoring and alerting setup

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork & clone:**
   ```bash
   git clone https://github.com/baiitax/Hatsi360_V2.git
   cd hatsi360
   ```

2. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature
   ```

3. **Make changes and test:**
   ```bash
   npm run dev            # Test locally
   npm test               # Run tests
   npm run typecheck      # Type check
   npm run lint           # Lint code
   ```

4. **Commit with descriptive messages:**
   ```bash
   git commit -m "feat: add new feature with tests"
   ```

5. **Push and open a PR:**
   ```bash
   git push origin feature/your-feature
   ```

### Code Quality Standards

- **TypeScript** — Strict mode enabled, no `any` without justification
- **Tests** — New features include corresponding tests
- **Linting** — ESLint must pass (`npm run lint`)
- **Types** — `npm run typecheck` must pass
- **Documentation** — Public APIs and complex logic are documented

---

## 📞 Support & Contact

- **Issues & Bug Reports** — [GitHub Issues](https://github.com/baiitax/Hatsi360_V2/issues)
- **Discussions** — [GitHub Discussions](https://github.com/baiitax/Hatsi360_V2/discussions)
- **Email** — See the main repository for contact info

---

## 📄 License

This project is part of the Hatsi360 platform. See LICENSE file for details.

---

## 🙏 Acknowledgments

Built with:
- **Next.js 16** — Modern React framework
- **TypeScript** — Type-safe development
- **Supabase** — PostgreSQL + authentication
- **Tailwind CSS** — Utility-first styling
- **Recharts** — Data visualization
- **Vitest** — Fast unit testing
- **Zod** — Runtime schema validation

**Inspired by principles of:**
- Data integrity and honesty
- Security-first architecture
- Auditability and transparency
- Real-world agricultural needs

---

**Last updated:** November 2026 | Built with ❤️ for African Agriculture
