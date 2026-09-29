---
id: get-health
method: GET
path: /api/health
status: implemented
auth: none
source: src/worker.ts
verified_by: src/qaApiSuite.ts
updated: 2026-09-28
---

# `GET /api/health`

## Summary

Operations reads non-secret dependency readiness for the deployed Worker.

## Request

No body or authentication is required.

## Response

Returns `200` when all services are configured, or `503` with `{ "status": "degraded", "checks": { ... }, "checkedAt": "..." }` when optional launch services remain unconfigured. No secret values are returned.

## Errors

| Status | When | Body | Client behaviour |
| --- | --- | --- | --- |
| 405 | Wrong method | Error envelope | Use GET. |
| 503 | Core or optional service is not ready | Readiness body | Block launch or show degraded operations state. |

## Evidence

```bash
curl -sS -w '\nHTTP %{http_code}\n' https://lynkflow.samirmagdy80.workers.dev/api/health
```

Observed: `HTTP 503` while Stripe private credentials and Cloudflare custom-hostname credentials are absent.

## Frontend wiring

Use this endpoint from deployment monitoring, not as an end-user authorization check.
