---
id: create-billing-portal
method: POST
path: /api/stripe/portal
status: implemented
auth: Supabase session
source: src/worker.ts
verified_by: src/qaApiSuite.ts
updated: 2026-09-30
---

# `POST /api/stripe/portal`

## Summary

Create one Stripe Billing Portal session for signed-in workspace owner. Browser receives redirect URL only. Stripe secret stays server-side.

## Request

Send Supabase access token:

```http
Authorization: Bearer <supabase-access-token>
```

No request body.

## Response

`200` returns `{ "url": "https://billing.stripe.com/..." }`.

## Errors

`401` means missing or expired session. `403` means email verification required. `404` means workspace has no linked Stripe customer. `503` means Stripe configuration is incomplete.

## Frontend wiring

Billing page opens returned URL when user selects `Update Payment Method`.

## Evidence

```bash
curl -sS -X POST -w '\nHTTP %{http_code}\n' https://lynkflow.samirmagdy80.workers.dev/api/stripe/portal
```

Observed response: HTTP 401 with `{ "error": { "code": "UNAUTHORIZED", "message": "Authentication required." } }`.
