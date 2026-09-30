---
id: unsubscribe-marketing-newsletter
method: POST
path: /api/public/newsletter/unsubscribe
status: implemented
auth: none
source: src/worker.ts
verified_by: src/qaMarketingNewsletterSuite.ts
updated: 2026-09-30
---

## Summary

Marks a marketing subscriber as unsubscribed without revealing whether an email address exists.

## Request

```json
{ "email": "person@example.com" }
```

## Response

HTTP `200 OK`

```json
{ "data": { "unsubscribed": true } }
```

## Errors

- `400 VALIDATION_ERROR` for malformed JSON.
- `422 VALIDATION_ERROR` for an invalid email address.
- `429 RATE_LIMITED` when the public IP limit is exceeded.
- `503 PERSISTENCE_ERROR` when the subscriber state cannot be saved.

## Evidence

Exact deployed validation request:

```sh
curl -i -X POST https://lynkflow.samirmagdy80.workers.dev/api/public/newsletter/unsubscribe \
  -H 'content-type: application/json' \
  --data '{"email":"not-an-email"}'
```

Observed response: HTTP `422` with `error.code=VALIDATION_ERROR`. The same route returns HTTP `200` with `data.unsubscribed=true` for a valid request.

## Frontend wiring

The public footer links to `/unsubscribe`, which submits to this endpoint from `public/unsubscribe.html`.
