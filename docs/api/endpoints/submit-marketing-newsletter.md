---
id: submit-marketing-newsletter
method: POST
path: /api/public/newsletter
status: implemented
auth: none
source: src/worker.ts
verified_by: src/qaMarketingNewsletterSuite.ts
updated: 2026-09-30
---
# POST /api/public/newsletter

## Summary

An anonymous visitor subscribes an email address to LynkFlow product updates after explicit consent.

## Request

The JSON body contains email, consent, and an optional source. Email must be valid and at most 320 characters. Consent must be true.

## Response

Success status is 200 with a data object containing subscribed=true.

## Errors

405 is returned for the wrong method. 422 is returned for malformed email or missing consent. 429 is returned for rate limiting with Retry-After. 503 is returned when a dependency is unavailable.

## Evidence

The deployed validation request is:

    curl -sS -X POST https://lynkflow.samirmagdy80.workers.dev/api/public/newsletter -H 'content-type: application/json' -d '{"email":"not-an-email","consent":true}'

Observed response: HTTP 422 with error.code VALIDATION_ERROR.

## Frontend wiring

The landing page newsletter form disables submission while loading, renders server errors, and shows success only after data.subscribed=true.
