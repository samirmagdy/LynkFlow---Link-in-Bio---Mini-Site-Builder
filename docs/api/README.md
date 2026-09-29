# LynkFlow API v1

The deployed API is served by the Cloudflare Worker under `/api/v1`. API keys are scoped, hashed at rest, shown once, and rejected immediately after revocation or expiry. Mutations return an authoritative server response and should include an idempotency key when a client may retry after a timeout.

OpenAPI: [`openapi.yaml`](./openapi.yaml)

Implemented resources:

- `GET /api/v1/profiles`
- `GET/PATCH /api/v1/profiles/{profileId}`
- `GET/PATCH /api/v1/profiles/{profileId}/blocks/{blockId}`
- `GET/PATCH /api/v1/profiles/{profileId}/themes`
- `POST /api/v1/profiles/{profileId}/publish`

Management endpoints for keys and billing are documented in the OpenAPI file under `/api/api-keys` and `/api/stripe`.
