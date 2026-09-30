---
id: remove-domain
method: POST
path: /api/domains/remove
status: implemented
auth: session
source: src/worker.ts
verified_by: src/qaApiSuite.ts
updated: 2026-09-28
---

# `POST /api/domains/remove`

## Summary

An authenticated workspace disconnects an owned profile domain and removes its active routing record.

## Request

Body: `{ "profileId": "..." }`.

## Response

Returns `200` with `{ "success": true }`.

## Errors

| Status | When | Body | Client behaviour |
| --- | --- | --- | --- |
| 401/403 | Missing session or entitlement | Error envelope | Sign in or upgrade. |
| 404 | Profile is not owned | Error envelope | Refresh state. |

## Evidence

```bash
curl -sS -X POST https://lynkflow.samirmagdy80.workers.dev/api/domains/remove -H 'content-type: application/json' -d '{}'
```

Observed response: HTTP 401 without a session.

## Frontend wiring

Require confirmation, then clear the local profile domain only after the server confirms removal.
