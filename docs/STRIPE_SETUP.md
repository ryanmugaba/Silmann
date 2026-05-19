# Stripe billing setup (14-day trial → $29.99 AUD/month)

Silman uses the **Stripe API** for subscriptions:

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/stripe/checkout` | POST | Checkout Session with **14-day trial** (first signup only) |
| `/api/stripe/portal` | POST | Stripe Customer Portal |
| `/api/stripe/webhook` | POST | Syncs `subscription_status` to Supabase |

## 1. Stripe Dashboard

1. Create a [Stripe account](https://dashboard.stripe.com/register) — **Australia**, charges in **AUD**.
2. **Products** → **Silman Pro** → add price **$29.99 AUD / month** (recurring).
3. Copy **Price ID** (`price_...`) → `STRIPE_PRICE_ID`.

**Important:** Do **not** add a trial on the Price in Stripe. The app sets `trial_period_days: 14` in Checkout so you control it in one place.

## 2. API keys → `.env.local` / Vercel

| Variable | Where |
|----------|--------|
| `STRIPE_SECRET_KEY` | Developers → API keys → Secret (`sk_test_` or `sk_live_`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Publishable (`pk_test_` or `pk_live_`) — optional today |
| `STRIPE_PRICE_ID` | Product price ID |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (see below) |
| `NEXT_PUBLIC_APP_URL` | Your public URL (Stripe return URLs) |
| `STRIPE_TRIAL_DAYS` | Optional — default `14` |

Copy from `.env.local.example` and fill in real values locally; paste the same keys into **Vercel → Environment Variables** for production.

## 3. Webhook

**Production** (after Vercel deploy):

- URL: `https://YOUR-DOMAIN/api/stripe/webhook`
- Events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- Signing secret → `STRIPE_WEBHOOK_SECRET` on Vercel

**Local** (optional):

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Use the CLI `whsec_...` as `STRIPE_WEBHOOK_SECRET` in `.env.local`.

## 4. Database

Run `supabase/migrations/0015_billing.sql` on your Supabase project.

## 5. Customer Portal

[Stripe Customer portal](https://dashboard.stripe.com/settings/billing/portal) — enable cancel / update payment method.

## 6. Trial flow

1. Owner completes onboarding → **Settings → Billing** → **Start 14-day free trial**.
2. Stripe Checkout collects a card; status becomes **`trialing`** (full app access).
3. After 14 days, Stripe charges **$29.99 AUD**; status becomes **`active`**.
4. Webhook keeps `organizations.subscription_status` in sync.

Repeat trials are **not** offered if the org already had a subscription (`stripe_subscription_id` set).

## 7. Test card

Stripe test mode: `4242 4242 4242 4242`, any future expiry, any CVC.

See **[DEPLOY.md](./DEPLOY.md)** for hosting on Vercel (Sydney) so you are not running the app on your laptop.
