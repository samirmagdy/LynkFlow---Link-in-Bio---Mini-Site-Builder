---
id: list-profiles
method: GET
path: /api/v1/profiles
status: implemented
auth: api-key
source: src/worker.ts
verified_by: src/qaApiSuite.ts
updated: 2026-09-28
---

# `GET /api/v1/profiles`

## Summary

An authorized integration lists normalized profiles in its workspace.

## Request

No body. Requires `Authorization: Bearer lf_live_...` with `profiles:read`.

## Response

Returns `200` with `{ "data": [...], "requestId": "uuid" }`; profile visibility is limited by the key's allowed profile IDs.

## Errors

| Status | When | Body | Client behaviour |
| --- | --- | --- | --- |
| 401 | Missing, revoked, expired, or invalid key | `{ "error": { "code": "UNAUTHORIZED", "message": "..." } }` | Fix credentials. |
| 403 | Missing scope | `{ "error": { "code": "FORBIDDEN", "message": "..." } }` | Request a key with the scope. |
| 429 | Sliding-window limit exceeded | `{ "error": { "code": "RATE_LIMITED", "message": "..." } }` | Wait for `Retry-After`. |

## Evidence

```bash
curl -sS -w '\nHTTP %{http_code}\n' https://lynkflow.samirmagdy80.workers.dev/api/v1/profiles
```

Observed response: HTTP 401 and an UNAUTHORIZED error envelope.

## Frontend wiring

External integrations call this endpoint directly. The developer console exposes key scopes; clients should retry only after the `Retry-After` window.
