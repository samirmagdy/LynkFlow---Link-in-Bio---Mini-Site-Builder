---
id: list-blocks
method: GET
path: /api/v1/profiles/{profileId}/blocks
status: implemented
auth: api-key
source: src/worker.ts
verified_by: src/qaApiSuite.ts
updated: 2026-09-28
---

# `GET /api/v1/profiles/{profileId}/blocks`

## Summary

An authorized integration lists blocks for a visible profile.

## Request

Requires `blocks:read`.

## Response

Returns `200` with `{ "data": [...], "requestId": "uuid" }`.

## Errors

| Status | When | Body | Client behaviour |
| --- | --- | --- | --- |
| 401/403 | Authentication or scope failure | Error envelope | Fix credentials or scope. |
| 404 | Profile is not visible | Error envelope | Stop retrying. |

## Evidence

```bash
curl -sS -w '\nHTTP %{http_code}\n' https://lynkflow.samirmagdy80.workers.dev/api/v1/profiles/example/blocks
```

Observed without a key: `HTTP 401`.

## Frontend wiring

Use a loading state and treat an empty `data` array as a valid empty state.
