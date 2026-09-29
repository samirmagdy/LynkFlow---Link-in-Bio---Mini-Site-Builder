---
id: publish-profile
method: POST
path: /api/v1/profiles/{profileId}/publish
status: implemented
auth: api-key
source: src/worker.ts
verified_by: src/qaApiSuite.ts
updated: 2026-09-28
---

# `POST /api/v1/profiles/{profileId}/publish`

## Summary

An authorized integration publishes a new immutable version and updates the public snapshot.

## Request

No body. Requires `publish:write`; the profile must be visible to the key.

## Response

Returns `200` with `{ "data": { "profileId": "...", "status": "published", "publishedVersion": 1, "publishedAt": "..." }, "requestId": "uuid" }`.

## Errors

| Status | When | Body | Client behaviour |
| --- | --- | --- | --- |
| 401/403 | Authentication or scope failure | Error envelope | Fix credentials or scope. |
| 404 | Profile is not visible | Error envelope | Stop retrying. |

## Evidence

```bash
curl -sS -w '\nHTTP %{http_code}\n' -X POST https://lynkflow.samirmagdy80.workers.dev/api/v1/profiles/example/publish
```

Observed without a key: `HTTP 401`.

## Frontend wiring

Only show published success after this response; use the returned version for subsequent reconciliation.
