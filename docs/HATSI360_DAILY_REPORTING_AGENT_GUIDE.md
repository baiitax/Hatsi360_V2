# Field agent guide — opening and closing reports

## Finding today's work

The Field home page shows generated opening and closing sessions for assigned markets when the reporting feature is enabled. Select **Open report** during the configured window, or **Continue** for an already opened session. If a window is over, contact a supervisor; the workflow does not silently backdate or reopen it.

## Reporting one item

Each card names the configured commodity, grade (if any), unit, currency, and economic price type. Enter the value in that exact unit and record the actual observed time. Do not convert units unless the configuration explicitly uses that unit. The opening/closing label is separate from the economic price type.

Choose **Submit price for verification** only when a reliable price was observed. A submitted value is not verified or public yet. If no price can responsibly be reported, choose **No reliable quote**, **Unavailable**, or **Market closed**. These save an explanatory status, never a zero price.

## Weak/no connection

Price entries are placed in the device queue with a stable idempotency key and retain the selected observation time; the server confirms submission after sync. Availability outcomes may also wait on the device and are explicitly labeled unsynced until the server accepts them. Keep the device signed in and return to the report to confirm sync. A local queue item is not a server record.

## Status language

- **Saved on phone / queued:** local only, not submitted.
- **Submitted:** server accepted it for review.
- **Verified:** supervisor/reviewer approved it; it may still be unpublished.
- **Published:** authorized publication has made it public.

Agents cannot verify or publish. Use the established correction request path when a submitted value needs correction; do not overwrite a published observation.
