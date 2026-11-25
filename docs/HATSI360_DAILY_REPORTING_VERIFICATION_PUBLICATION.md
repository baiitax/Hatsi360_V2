# Verification, publication and corrections

A reporting submission is an observation submitted through the existing database workflow, not a separate public price system. The configured reporting layer supplies the market/commodity/grade/unit/currency/price type and associates the observation with an opening/closing session. It does not replace established observation validation, quality rules, reviewer authorization, verification events, publication controls, provenance, or correction history.

## State semantics

- `expected`: no price or no-price status has been recorded.
- `submitted`: server accepted the price for review.
- `verified`: a reviewer approved the observation; publication is separate.
- `published`: the existing authorized publication path made it public.
- `rejected`: review requires correction.
- `no_reliable_quote`, `unavailable`, `market_closed`: explicit no-price outcomes; not observations.

The existing published view remains the public gate. New session metadata is appended to that view, not exposed from raw observation tables. Public cards require both a verified observation and non-null publication time and retain the economic price type alongside the operational session label.

Corrections remain append-only through existing correction mechanisms. Do not edit or erase a published price to make a new report fit. Use a reasoned reopen for session lifecycle exceptions and preserve audit records.
