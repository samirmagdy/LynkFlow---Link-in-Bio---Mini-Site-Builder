---
id: update-webhook
method: PATCH
path: /api/webhooks/{hookId}
status: implemented
auth: session
source: src/worker.ts
verified_by: src/qaApiSuite.ts
updated: 2026-09-28
---

# `PATCH /api/webhooks/{hookId}`

## Summary

An authenticated workspace pauses or resumes an owned subscription.

## Request

Body is `{ "status": "active" | "paused" }`.

## Response

Returns `200` with `{ "success": true }`.

## Errors

| Status | When | Body | Client behaviour |
| --- | --- | --- | --- |
| 401 | Missing session | Error envelope | Sign in. |
| 422 | Invalid status | Error envelope | Correct the request. |

## Evidence

```bash
curl -sS -X PATCH https://lynkflow.samirmagdy80.workers.dev/api/webhooks/wh_test -H 'content-type: application/json' -d '{"status":"paused"}'
```

Observed response: HTTP 401 without a session.

## Frontend wiring

The screen keeps the previous state if the server rejects the change.
