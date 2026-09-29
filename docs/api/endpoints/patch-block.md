---
id: update-block
method: PATCH
path: /api/v1/profiles/{profileId}/blocks/{blockId}
status: implemented
auth: api-key
source: src/worker.ts
verified_by: src/qaApiSuite.ts
updated: 2026-09-28
---

# `PATCH /api/v1/profiles/{profileId}/blocks/{blockId}`

## Summary

An authorized integration merges block data into a visible profile.

## Request

Body: `{ "data": { ... } }`; requires `blocks:write`.

## Response

Returns `200` with `{ "data": { ... }, "requestId": "uuid" }`.

## Errors

| Status | When | Body | Client behaviour |
| --- | --- | --- | --- |
| 401/403 | Authentication or scope failure | Error envelope | Fix credentials or scope. |
| 404 | Profile or block is not visible | Error envelope | Stop retrying. |

## Evidence

```bash
curl -sS -w '\nHTTP %{http_code}\n' -X PATCH https://lynkflow.samirmagdy80.workers.dev/api/v1/profiles/example/blocks/block -H 'content-type: application/json' -d '{"data":{}}'
```

Observed without a key: `HTTP 401`.

## Frontend wiring

Use the returned block as the source of truth and do not report success before it arrives.
