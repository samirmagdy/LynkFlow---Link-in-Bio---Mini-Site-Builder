<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.
https://ai.studio/apps/b0e89e82-952c-4633-a758-52ef62b99354

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Supabase + Cloudflare

The production path uses Supabase Auth/Postgres and Cloudflare Workers Static Assets. Supabase browser configuration uses only the publishable key; never expose a `service_role` key in Vite environment variables.

1. Create a Supabase project.
2. Run [`supabase/migrations/202609280001_initial.sql`](supabase/migrations/202609280001_initial.sql) in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. Start locally with `npm run dev`. With Supabase variables present, authentication and profile/workspace persistence use Supabase; without them, the local demo fallback remains available.
5. Authenticate Wrangler and deploy:

   `npx wrangler login`

   `npm run deploy`

Cloudflare serves `dist` as a single-page application through [`wrangler.jsonc`](wrangler.jsonc). Add the deployed URL to Supabase Auth redirect URLs and configure the production Supabase values in the Cloudflare deployment environment.

Current deployment: https://lynkflow.samirmagdy80.workers.dev

### Stripe billing

Billing uses Stripe Checkout in subscription mode. The browser only calls the Worker; Stripe secrets and Price IDs never enter Vite or React. Create four recurring Stripe Prices (Pro monthly/annual and Agency monthly/annual), then configure the Worker secrets:

```bash
printf '%s' 'sk_test_...' | npx wrangler secret put STRIPE_SECRET_KEY
printf '%s' 'whsec_...' | npx wrangler secret put STRIPE_WEBHOOK_SECRET
printf '%s' 'your-supabase-service-role-key' | npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
npx wrangler secret put APP_URL
npx wrangler secret put STRIPE_PRICE_PRO_MONTHLY
npx wrangler secret put STRIPE_PRICE_PRO_ANNUAL
npx wrangler secret put STRIPE_PRICE_AGENCY_MONTHLY
npx wrangler secret put STRIPE_PRICE_AGENCY_ANNUAL
```

Set the Stripe webhook endpoint to `https://lynkflow.samirmagdy80.workers.dev/api/stripe/webhook` and subscribe to `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, and `invoice.payment_failed`. Run migration `202609280004_stripe_billing.sql` before testing. Stripe recommends creating Checkout Sessions server-side and verifying webhook signatures against the untouched request body; this Worker follows that model. [Stripe Checkout Sessions](https://docs.stripe.com/api/checkout/sessions), [Stripe webhook signatures](https://docs.stripe.com/webhooks/signature)

### Webhooks and custom domains

The Worker owns webhook secrets and delivery. Set `WEBHOOK_ENCRYPTION_KEY` as a Worker secret; it is generated automatically in the configured deployment. Delivery signs `timestamp.body` with HMAC-SHA256, persists attempts in `webhook_deliveries`, and retries failed deliveries up to three times.

Custom-domain verification uses Cloudflare DNS and Supabase uniqueness records. DNS verification works without additional credentials, but live custom-hostname SSL/routing requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ZONE_ID` with custom-hostname permissions, plus a domain added to the Cloudflare account. Until those are present, the UI remains in explicit SSL provisioning state.

Supabase Auth email delivery is configured through Resend SMTP: `smtp.resend.com`, port `465`, username `resend`, with the Resend API key stored remotely as the SMTP password. The current test sender is `onboarding@resend.dev`; replace it with a verified Resend-domain sender before opening registration to the public.

### Resend email test

Email delivery runs server-side in the Cloudflare Worker. Do not put the Resend key in React code or `VITE_*` variables.

Set the secrets with Wrangler, replacing `re_xxxxxxxxx` with your real Resend API key:

```bash
printf '%s' 're_xxxxxxxxx' | npx wrangler secret put RESEND_API_KEY
printf '%s' 'replace-with-a-long-random-test-token' | npx wrangler secret put EMAIL_TEST_TOKEN
```

Deploy, then send the test email:

```bash
curl -X POST https://lynkflow.samirmagdy80.workers.dev/api/email/test \
  -H "Authorization: Bearer replace-with-a-long-random-test-token" \
  -H "Content-Type: application/json" \
  -d '{"to":"samirmagdy80@gmail.com","subject":"Hello World","html":"<p>Congrats on sending your <strong>first email</strong>!</p>"}'
```
