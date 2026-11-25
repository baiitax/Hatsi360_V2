# Daily reporting — deployment checklist (not a deployment authorization)

This checklist does not authorize deployment or remote migration. Current implementation is local-only and the feature flag must remain disabled until the target and schema are explicitly approved.

## Schema and app
- [ ] Confirm the production repository/branch is `baiitax/Hatsi360_V2` and matches this workspace.
- [ ] Confirm the Supabase project backing the application; do not assume the connected project is production.
- [ ] Review migration 0032, RLS/grants, audit triggers, session delete retention and public view changes.
- [ ] Run `npm run verify:migrations`, `npm run typecheck`, `npm test`, `npm run lint`, `npm run build` and browser E2E on the release commit.
- [ ] Confirm all ten daily-reporting docs and existing documentation are accurate.

## Controlled activation
- [ ] Obtain written approval for the exact database and migration window.
- [ ] Verify backup/restore and forward-fix plan.
- [ ] Apply migration through the approved mechanism; verify ledger and schema.
- [ ] Verify scheduler credentials and daily/hourly job schedule.
- [ ] Configure price definitions and coverage with authorized administrators.
- [ ] Run one assigned staging agent through opening/closing, offline retries, availability, verification and publication.
- [ ] Check audit events and public-market output; ensure pending prices are hidden.
- [ ] Set `DAILY_MARKET_REPORTING_ENABLED=true` only after all checks pass and monitor first runs.

## Current non-ready conditions

No deployment was performed. Migration 0032 remains unapplied remotely. Vercel access was denied in earlier work; Supabase project identity/migration drift remains unresolved. Browser automation is unavailable in this workspace because Chromium is missing. Full tests and lint have existing failures, and production-like end-to-end validation remains outstanding.
