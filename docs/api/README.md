# LynkFlow API v1

The deployed API is served by the Cloudflare Worker under `/api/v1`. API keys are scoped, hashed at rest, shown once, and rejected immediately after revocation or expiry. Mutations return an authoritative server response and should include an idempotency key when a client may retry after a timeout.

OpenAPI: [`openapi.yaml`](./openapi.yaml)

Implemented resources:

- POST /api/public/newsletter
- POST /api/public/newsletter/unsubscribe
- `GET /api/v1/profiles`
- `GET/PATCH /api/v1/profiles/{profileId}`
- `GET/POST /api/v1/profiles/{profileId}/blocks` and `GET/PATCH/DELETE /api/v1/profiles/{profileId}/blocks/{blockId}`
- `GET/PATCH /api/v1/profiles/{profileId}/themes`
- `POST /api/v1/profiles/{profileId}/publish`

All API mutations require an `Idempotency-Key` header containing 8–128 safe characters. Reusing a key with the same request returns the original authoritative response; reusing it for a different request returns `409 Conflict`.

Management endpoints for keys and billing are documented in the OpenAPI file under `/api/api-keys` and `/api/stripe`.
