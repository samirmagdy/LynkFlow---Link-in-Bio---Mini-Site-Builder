---
id: update-profile
method: PATCH
path: /api/v1/profiles/{profileId}
status: implemented
auth: api-key
source: src/worker.ts
verified_by: src/qaApiSuite.ts
updated: 2026-09-28
---

# `PATCH /api/v1/profiles/{profileId}`

## Summary

An authorized integration merges validated profile data and receives the authoritative resource.

## Request

Body: `{ "data": { "displayName": "..." } }`. Requires `profiles:write`; body must be a JSON object.

## Response

Returns `200` with `{ "data": { ... }, "requestId": "uuid" }`.

## Errors

| Status | When | Body | Client behaviour |
| --- | --- | --- | --- |
| 400 | Invalid JSON | `{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }` | Correct the request. |
| 401/403 | Authentication or scope failure | Error envelope | Re-authenticate or request scope. |
| 404 | Profile is not visible | Error envelope | Stop retrying. |

## Evidence

```bash
curl -sS -w '\nHTTP %{http_code}\n' -X PATCH https://lynkflow.samirmagdy80.workers.dev/api/v1/profiles/example -H 'content-type: application/json' -d '{"data":{}}'
```

Observed without a key: `HTTP 401`.

## Frontend wiring

External integrations should serialize retries and refetch after a timeout; the server response is authoritative.
