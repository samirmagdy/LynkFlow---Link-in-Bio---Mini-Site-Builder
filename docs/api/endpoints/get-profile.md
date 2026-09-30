---
id: get-profile
method: GET
path: /api/v1/profiles/{profileId}
status: implemented
auth: api-key
source: src/worker.ts
verified_by: src/qaApiSuite.ts
updated: 2026-09-28
---

# `GET /api/v1/profiles/{profileId}`

## Summary

An authorized integration reads one normalized profile.

## Request

`profileId` is required. Requires `profiles:read`.

## Response

Returns `200` with `{ "data": { ... }, "requestId": "uuid" }`.

## Errors

| Status | When | Body | Client behaviour |
| --- | --- | --- | --- |
| 401 | Invalid key | `{ "error": { "code": "UNAUTHORIZED", "message": "..." } }` | Re-authenticate. |
| 404 | Profile is not visible to this key | `{ "error": { "code": "NOT_FOUND", "message": "Profile not found." } }` | Stop retrying. |

## Evidence

```bash
curl -sS -w '\nHTTP %{http_code}\n' https://lynkflow.samirmagdy80.workers.dev/api/v1/profiles/example
```

Observed response: HTTP 401 without a key.

## Frontend wiring

Use the external API client and map `404` to a removed or unauthorized profile.
