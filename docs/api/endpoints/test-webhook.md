---
id: test-webhook
method: POST
path: /api/webhooks/{hookId}/test
status: implemented
auth: session
source: src/worker.ts
verified_by: src/qaApiSuite.ts
updated: 2026-09-28
---

# `POST /api/webhooks/{hookId}/test`

## Summary

An authenticated workspace sends a signed test event with bounded retries to an owned endpoint.

## Request

No body. `hookId` is required and must be active.

## Response

Returns `200` with a delivery ID and `delivered` boolean.

## Errors

| Status | When | Body | Client behaviour |
| --- | --- | --- | --- |
| 401 | Missing session | Error envelope | Sign in. |
| 404 | Missing or paused subscription | Error envelope | Refresh subscriptions. |

## Evidence

```bash
curl -sS -X POST https://lynkflow.samirmagdy80.workers.dev/api/webhooks/wh_test/test
```

Observed: `HTTP 401` without a session.

## Frontend wiring

Show delivery result and preserve the server delivery ID in the audit view.
