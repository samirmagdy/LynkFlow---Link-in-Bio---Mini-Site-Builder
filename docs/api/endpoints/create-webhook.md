---
id: create-webhook
method: POST
path: /api/webhooks
status: implemented
auth: session
source: src/worker.ts
verified_by: src/qaApiSuite.ts
updated: 2026-09-28
---

# `POST /api/webhooks`

## Summary

An authenticated paid workspace creates a subscription and receives its signing secret once.

## Request

Body contains an HTTPS `url`, one or more supported `topics`, and an optional description.

## Response

Returns `200` with `data` subscription metadata and `secret`; the secret is never returned again.

## Errors

| Status | When | Body | Client behaviour |
| --- | --- | --- | --- |
| 401 | Missing session | Error envelope | Sign in. |
| 403 | Free plan or subscription limit | Error envelope | Upgrade or remove a subscription. |
| 422 | Invalid URL/topics | Error envelope | Correct the form. |

## Evidence

```bash
curl -sS -X POST https://lynkflow.samirmagdy80.workers.dev/api/webhooks -H 'content-type: application/json' -d '{}'
```

Observed response: HTTP 401 without a session.

## Frontend wiring

The API & Webhooks screen shows the secret once and requires copying it before closing.
