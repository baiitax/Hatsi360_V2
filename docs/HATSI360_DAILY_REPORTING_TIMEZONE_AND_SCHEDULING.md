# Timezone, windows and session generation

## Business date

Operational business dates and visible schedule times use `Africa/Lagos`. Stored session windows are `timestamptz` instants derived from a local business date plus the configured local time and timezone. The configured timezone is persisted on each generated session so later setting changes do not rewrite existing expectations.

## Windows

Global defaults are opening 07:00–11:00 and closing 15:00–19:00, Monday through Saturday. Administrators may configure global and market-specific windows. Market-specific rows take precedence. A valid window must start before it ends; overnight windows are not supported by the current schema. Active days use PostgreSQL weekday numbering (Sunday=0).

## Generation

`generate_daily_market_reporting_sessions(date)` creates sessions only for active assignments with active reporting coverage, active agent/market, an open market day, and no closure. It snapshots the configured items. Unique constraints make repeated calls safe. Existing sessions are not regenerated or rewritten after assignment/config changes.

## Overdue behavior

The hourly overdue routine marks still-open sessions overdue after `window_end_at + grace_minutes`. Staff can reopen eligible sessions through the controlled routine with a mandatory reason. A late/overdue session is not silently accepted by the agent path.

## Scheduler wiring

The job registry contains a daily generator and hourly overdue job. Both are feature-flagged and use the server-side admin client to invoke privileged routines. Before enabling, configure the authenticated scheduler to invoke the established jobs route with correct schedule instants and review the UTC-to-Lagos business-date conversion. Monitor `scheduled_job_runs` after first run.
