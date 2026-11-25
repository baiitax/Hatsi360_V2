# Daily reporting data model

## Tables

- `market_commodity_reporting_configs`: market-scoped commodity/grade/unit/currency/price-type definition and optional expected range.
- `market_assignment_reporting_coverage`: which configurations a persistent market assignment covers, with display order and active flag.
- `market_reporting_windows`: global or market-specific opening/closing time, timezone and active weekdays.
- `market_reporting_settings`: singleton timezone/grace configuration.
- `market_reporting_closures`: exceptional market/date closures.
- `daily_market_reporting_sessions`: assignment, agent, market, Lagos business date, session kind, window instants, lifecycle state and optional existing collection batch.
- `daily_market_reporting_items`: frozen expected item definition and price/non-price state for one generated session.

`price_observations` receives nullable `daily_reporting_session_id`, `reporting_business_date`, and `reporting_session_kind` columns. Historical rows remain null; migration 0032 does not infer historical opening/closing sessions.

## Invariants

- Session uniqueness: `(assignment_id, business_date, session_kind)`.
- Item uniqueness: `(session_id, reporting_config_id)`.
- One linked observation per reporting item; submission idempotency uses the existing `submission_key` path.
- A reporting session is distinct from `price_type`.
- Positive prices only. Availability outcomes have no observation ID and create no `price_observations` row.
- The public view retains its existing publication and verification filter and appends reporting metadata only for public records.

## Lifecycle

The scheduler snapshots currently active assignment coverage into opening and closing sessions. Opening the session creates/reuses a `collection_batches` row and sends the agent to the existing collection detail. Observation insert/link triggers update item and session states. Verification/publication remains owned by existing workflows.
