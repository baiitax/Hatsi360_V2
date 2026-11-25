# Offline capture and idempotent sync

## Price entries

The existing Field queue persists on-device without credentials. A daily report entry carries its session/item identifiers, configured commodity dimensions, original observation timestamp and stable idempotency key. The background queue retries sequentially when connectivity returns. A lost response is safe: `submit_daily_reporting_price` resolves the existing submission key before rejecting a completed session, and the existing observation submission RPC remains authoritative.

The UI calls a queued or failed price local-only until a positive server response. It does not display a local entry as submitted. A server submission becomes a real observation and then follows the existing review workflow.

## Availability outcomes

No-price outcomes are stored separately in session-scoped local storage while offline, with a pending-sync indicator. When online, the client retries the status action; the database treats the same status/note as an idempotent retry. These records do not contain an amount and never create an observation.

## Important operating guidance

- Preserve the exact timestamp selected at collection; do not replace it with sync time.
- Keep the stable key with the queued item; never generate a new key for a retry.
- If browser storage is unavailable/full, the field form must tell the agent to keep the page open and manually retry; local storage is not a durable server backup.
- Do not store auth tokens, cookies or secrets in either queue.
- A queue becoming empty means the server confirmed these requests, not that the prices are verified or published.
