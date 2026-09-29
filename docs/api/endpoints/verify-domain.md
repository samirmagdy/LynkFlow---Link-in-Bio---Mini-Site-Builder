---
id: verify-domain
method: POST
path: /api/domains/verify
status: implemented
auth: session
source: src/worker.ts
verified_by: src/qaApiSuite.ts
updated: 2026-09-28
---

# `POST /api/domains/verify`

## Summary

An authenticated paid workspace verifies DNS ownership and records explicit SSL provisioning state.

## Request

Body: `{ "profileId": "...", "domain": "links.example.com" }`.

## Response

Returns `200` for a verified DNS record; SSL may be `provisioning` until Cloudflare custom-hostname provisioning is configured.

## Errors

| Status | When | Body | Client behaviour |
| --- | --- | --- | --- |
| 401/403 | Missing session or entitlement | Error envelope | Sign in or upgrade. |
| 409 | Domain already owned | Error envelope | Choose another domain. |
| 422 | DNS mismatch | Error envelope plus config | Fix DNS and retry. |

## Evidence

```bash
curl -sS -X POST https://lynkflow.samirmagdy80.workers.dev/api/domains/verify -H 'content-type: application/json' -d '{}'
```

Observed: `HTTP 401` without a session.

## Frontend wiring

The domain screen displays DNS and SSL states separately and never marks a provisioning domain live.
