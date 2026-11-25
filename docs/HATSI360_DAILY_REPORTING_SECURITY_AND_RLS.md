# Daily reporting — security and authorization

## Application boundary

The admin page and its server actions require `admin`/`super_admin`. Agent session opening and item outcomes re-check the active agent account and assignment on the server/database. The submission API requires an authenticated active agent/supervisor profile; it accepts only a session ID, configured item ID, positive amount, observed timestamp, note and stable idempotency key. Market, commodity, grade, unit, currency and price type are read from the database, not trusted from the client.

## Database boundary

New tables have RLS enabled. Agents can read their own sessions/items; staff can read operational records. Configuration writes are granted to authenticated roles but are constrained by staff-only RLS policies. Security-definer routines pin `search_path` to `public`, validate account/role/ownership and restrict session mutations. Existing `submit_observation` remains the observation submission authority.

## Public data

The public view is recreated with its existing `is_current`, `published_at IS NOT NULL`, and `verification_status IN ('verified','legacy_unverified')` conditions unchanged. The public reporting display further requires `verificationStatus === 'verified'` and `publishedAt` for session-labeled cards. Submitted, draft, rejected and unpublished prices are not rendered as opening/closing public values.

## Audit and retention

Reporting configuration and session/item changes append row snapshots to `audit_events`. Session and item deletes are rejected to retain reporting history. Existing observation verification, publication, revision and correction controls remain authoritative.

## Review items before production

- Confirm app production schema and Supabase migration ledger match this checkout before applying SQL.
- Review all grants/policies in the real project and test as agent, supervisor, verifier, analyst and administrator.
- Confirm audit actor claims are populated by the production Supabase JWT context.
- Confirm database backup, migration rollback/forward-fix and scheduler secrets are prepared.
