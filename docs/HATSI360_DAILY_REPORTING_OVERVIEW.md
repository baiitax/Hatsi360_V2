# Hatsi360 daily market reporting — overview

## Purpose

This workflow adds persistent agent-to-market coverage and creates two operational expectations per configured business day: `opening` and `closing`. These describe when a field observation is expected, not what economic price type was quoted. `price_type` remains an independent property such as wholesale transaction or retail.

## Current repository implementation

- Additive migration draft: `supabase/migrations/0032_daily_market_reporting.sql`.
- Agent-home cards load generated sessions when `DAILY_MARKET_REPORTING_ENABLED=true`.
- Configured items appear inside the existing collection batch form. Price submissions call the established observation submission function through a narrow SQL wrapper; non-price outcomes are explicit statuses.
- Administration is at `/admin/daily-reporting` for `admin` and `super_admin` roles. It covers price definitions, assignment coverage, global and market-specific times, grace settings, closures, and completeness status.
- Public market detail pages show operational opening/closing labels only from the existing published-observation view, and only for verified, published observations.

## State distinctions

A phone-only queue entry is not a server submission. A server `submitted` observation is awaiting verification. `verified` does not mean `published`. The public site continues to use the publication-gated view. Non-price outcomes (`no_reliable_quote`, `unavailable`, `market_closed`) never create a price observation or a zero.

## Safety boundaries

Migration 0032 is local and unapplied. The feature flag must stay off until an explicitly authorized target has a matching schema and the migration is reviewed/applied there. No production migration or deployment was performed as part of this implementation. The repository's migration chain and the connected Supabase connector history were not shown to match.

## Validation state (2026-10-22)

- TypeScript `npm run typecheck`: passed at the last run before remaining documentation edits.
- `npm run verify:migrations`: applied the complete repository migration chain to throwaway PostgreSQL and passed seed checks, RLS tests, daily-report workflow tests, existing operations workflow tests, and cleanup checks.
- Full Vitest suite: 1,099 passed, 28 skipped, 8 failed across existing admin/auth/demo-fixture expectations; failures were not reporting-specific.
- ESLint: failed due to repository-wide existing issues, including React effect/ref purity rules and unrelated tests. Review the latest run before release.
- Production end-to-end/browser validation and a real authenticated Supabase run remain outstanding.
