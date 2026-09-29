---
id: recheck-domain
method: POST
path: /api/domains/recheck
status: implemented
auth: session
source: src/worker.ts
verified_by: src/qaApiSuite.ts
updated: 2026-09-28
---

# `POST /api/domains/recheck`

## Summary

An authenticated workspace re-runs DNS and SSL state checks for an owned profile domain.

## Request

Body: `{ "profileId": "...", "domain": "links.example.com" }`.

## Response

Returns `200` with the current domain config.

## Errors

| Status | When | Body | Client behaviour |
| --- | --- | --- | --- |
| 401/403 | Missing session or entitlement | Error envelope | Sign in or upgrade. |
| 404 | Profile is not owned | Error envelope | Refresh state. |

## Evidence

```bash
curl -sS -X POST https://lynkflow.samirmagdy80.workers.dev/api/domains/recheck -H 'content-type: application/json' -d '{}'
```

Observed: `HTTP 401` without a session.

## Frontend wiring

Disable the recheck button while the request is pending and retain failure detail from the server.
