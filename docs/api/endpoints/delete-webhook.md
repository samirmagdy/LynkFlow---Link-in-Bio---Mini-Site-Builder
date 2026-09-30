---
id: delete-webhook
method: DELETE
path: /api/webhooks/{hookId}
status: implemented
auth: session
source: src/worker.ts
verified_by: src/qaApiSuite.ts
updated: 2026-09-28
---

# `DELETE /api/webhooks/{hookId}`

## Summary

An authenticated workspace permanently removes an owned subscription.

## Request

`hookId` is required.

## Response

Returns `200` with `{ "success": true }`.

## Errors

| Status | When | Body | Client behaviour |
| --- | --- | --- | --- |
| 401 | Missing session | Error envelope | Sign in. |

## Evidence

```bash
curl -sS -X DELETE https://lynkflow.samirmagdy80.workers.dev/api/webhooks/wh_test
```

Observed response: HTTP 401 without a session.

## Frontend wiring

Require a confirmation before calling this destructive operation.
