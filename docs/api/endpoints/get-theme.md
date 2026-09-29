---
id: get-theme
method: GET
path: /api/v1/profiles/{profileId}/themes
status: implemented
auth: api-key
source: src/worker.ts
verified_by: src/qaApiSuite.ts
updated: 2026-09-28
---

# `GET /api/v1/profiles/{profileId}/themes`

## Summary

An authorized integration reads the profile theme.

## Request

Requires `themes:read`.

## Response

Returns `200` with `{ "data": null-or-theme, "requestId": "uuid" }`.

## Errors

| Status | When | Body | Client behaviour |
| --- | --- | --- | --- |
| 401/403 | Authentication or scope failure | Error envelope | Fix credentials or scope. |
| 404 | Profile is not visible | Error envelope | Stop retrying. |

## Evidence

```bash
curl -sS -w '\nHTTP %{http_code}\n' https://lynkflow.samirmagdy80.workers.dev/api/v1/profiles/example/themes
```

Observed without a key: `HTTP 401`.

## Frontend wiring

Treat `data: null` as an explicit no-theme state.
