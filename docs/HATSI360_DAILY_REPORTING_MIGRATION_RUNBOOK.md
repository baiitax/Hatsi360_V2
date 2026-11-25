# Migration 0032 — local review and controlled rollout runbook

## Current state

`supabase/migrations/0032_daily_market_reporting.sql` is an additive draft. It has been validated against the repository's complete migration chain on throwaway PostgreSQL by `npm run verify:migrations`, including RLS, daily-reporting workflow, existing operations workflow and cleanup tests. It has **not** been applied to the connected Supabase project or production. Connected project history previously observed did not match the repository migration history; do not apply to a guessed project.

## Before an approved apply

1. Confirm exact repository/commit and target Supabase project identity with the service owner.
2. Confirm target migration history equals the repository chain; resolve drift with an approved forward-only plan.
3. Take/verify a restorable backup and record schema inventory, RLS policies, grants and relevant observation counts.
4. Review migration diff and test against a production-like clone with historical data, multiple active agents per market, assignment changes, corrections and publication records.
5. Plan rollback. This additive schema is not a promise that destructive reverse SQL is safe; prefer a controlled forward fix unless restore is approved.
6. Apply only in the explicitly authorized environment and record migration version, operator, time and verification output.
7. Keep `DAILY_MARKET_REPORTING_ENABLED=false` until migration and scheduler are confirmed. Enable in a staged environment, seed explicit configurations, then validate with a test agent account.

## Post-apply verification

- Confirm all tables, indexes, RLS policies, grants, functions, triggers and public view columns.
- Confirm historical observations remain unlinked/null and counts do not change.
- Confirm one active covered assignment generates unique opening/closing sessions in Africa/Lagos; repeated generation makes no duplicates.
- Test agent ownership, positive-price validation, idempotent retry after completion, no-price statuses, verification, publication, correction and public visibility.
- Verify scheduler runs, overdue grace and closure behavior; inspect audit events.

No credentials belong in this runbook or source control.
