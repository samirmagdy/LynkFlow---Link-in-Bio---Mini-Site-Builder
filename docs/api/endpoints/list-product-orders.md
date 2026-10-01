---
id: list-product-orders
path: /api/sales/orders
method: GET
auth: session
---

# `GET /api/sales/orders`

Returns up to 500 Stripe product orders for the signed-in workspace. Owners and managers can read orders; viewer members are denied. Use `profileId` to scope results to an assigned profile.

```bash
curl -sS 'https://lynkflow.samirmagdy80.workers.dev/api/sales/orders?profileId=profile_123' \
  -H 'Authorization: Bearer <supabase-access-token>'
```

Paid orders are created idempotently from verified `checkout.session.completed` Stripe webhooks. The browser never supplies the amount, currency, workspace, or profile ownership used for the order record.
