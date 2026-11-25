# Daily reporting — administrator guide

## Access

Open `/admin/daily-reporting` as an `admin` or `super_admin`. The route is intentionally not exposed to agents or reviewers. Its data queries remain gated while the database/feature flag is inactive.

## Setup sequence

1. Confirm the target database, migration ledger, backups, and restore procedure. Do not infer that the connected Supabase project is production.
2. Apply the reviewed additive migration only in an explicitly approved environment. Do not enable the feature flag first.
3. Create each market price definition with the exact commodity, optional grade, unit, currency and economic price type. Set expected ranges only when meaningful.
4. Attach definitions to existing persistent agent-market assignments using **Assign configured coverage**. The database validates that definition and assignment share a market.
5. Set global opening/closing times in Africa/Lagos. Add a market-specific override only where required. Choose active days carefully; Sunday is day `0`, Monday `1`, through Saturday `6`.
6. Set the grace period and record exceptional closures. A closure suppresses generation for the selected market/date; it does not rewrite observations.
7. Confirm scheduler configuration invokes `generate_daily_market_reporting_sessions` daily and `mark_overdue_daily_market_reporting_sessions` hourly.
8. Enable `DAILY_MARKET_REPORTING_ENABLED=true` only after schema and scheduled-job checks pass.

## Completeness and review

The dashboard distinguishes accounted items from verified and published items. Availability outcomes count as an accounted response but are not price data. Submitted observations remain in the existing supervisor verification flow. Publish only through the established authorized publication workflow.

## Corrections and changes

Do not delete reporting sessions or items to resolve a discrepancy. Reopen with a reason where supported, and use the existing append-only correction process for observation corrections. Changes to configuration, coverage, windows, closures and session/item state are written to `audit_events` by database triggers.

## Limits

This administration UI configures reporting coverage for existing assignments; it does not create agent accounts or replace the established assignment lifecycle. Changing a price definition does not mutate already-generated session snapshots.
