---
id: update-theme
method: PATCH
path: /api/v1/profiles/{profileId}/themes
status: implemented
auth: api-key
source: src/worker.ts
verified_by: src/qaApiSuite.ts
updated: 2026-09-28
---

# `PATCH /api/v1/profiles/{profileId}/themes`

## Summary

An authorized integration merges theme data into a visible profile.

## Request

Body: `{ "data": { ... } }`; requires `themes:write`.

## Response

Returns `200` with `{ "data": { ... }, "requestId": "uuid" }`.

## Errors

| Status | When | Body | Client behaviour |
| --- | --- | --- | --- |
| 401/403 | Authentication or scope failure | Error envelope | Fix credentials or scope. |
| 404 | Profile is not visible | Error envelope | Stop retrying. |

## Evidence

```bash
curl -sS -w '\nHTTP %{http_code}\n' -X PATCH https://lynkflow.samirmagdy80.workers.dev/api/v1/profiles/example/themes -H 'content-type: application/json' -d '{"data":{}}'
```

Observed without a key: `HTTP 401`.

## Frontend wiring

Use the returned theme and keep the editor's saving indicator until the response arrives.
