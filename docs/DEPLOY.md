# Deploy Silman (Vercel + Supabase Sydney)

Run the app in the cloud so it is fast, always on, and data stays in **Australia**. Your laptop only needs a browser for admin tasks.

## Architecture

| Service | Region | Role |
|---------|--------|------|
| **Vercel** | Sydney (`syd1`) | Next.js app, API routes, Stripe webhooks |
| **Supabase** | `ap-southeast-2` | Postgres, auth, storage |
| **Stripe** | AU account | Billing, 14-day trial → $29.99 AUD/mo |

---

## Step 1 — Supabase (database + auth)

1. [supabase.com](https://supabase.com) → **New project**
2. **Region:** Australia (Sydney) / `ap-southeast-2`
3. Save the database password.

4. **SQL Editor** → run migrations in order:
   - Paste and run `supabase/migrations/0001_foundation.sql` through `0015_billing.sql`
   - Or use CLI: `npx supabase link` then `npx supabase db push`

5. **Authentication** → Providers → enable **Email** (and **Google** if you use it).

6. **Project Settings → API** — copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` `secret` → `SUPABASE_SERVICE_ROLE_KEY` (never expose to the browser)

7. **Authentication → URL configuration** (after you have a Vercel URL):
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: `https://your-app.vercel.app/auth/callback`

---

## Step 2 — Stripe (14-day trial, then $29.99/mo)

See **[STRIPE_SETUP.md](./STRIPE_SETUP.md)** for detail. Summary:

1. Stripe account (Australia, AUD).
2. Product **Silman Pro** → price **$29.99 / month** recurring AUD.
3. Copy **Price ID** → `STRIPE_PRICE_ID`.
4. API keys → `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
5. Webhook (after deploy):  
   `https://YOUR-VERCEL-URL/api/stripe/webhook`  
   Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`  
   → `STRIPE_WEBHOOK_SECRET`

Trial is applied in **Checkout** (`trial_period_days: 14`) — do **not** add a trial on the Price in Stripe Dashboard (would double-trial).

---

## Step 3 — Push code to GitHub

```bash
git add .
git commit -m "Prepare production deploy"
git push origin main
```

---

## Step 4 — Deploy on Vercel

1. [vercel.com](https://vercel.com) → **Add New Project** → import your GitHub repo.
2. Framework: **Next.js** (auto-detected).
3. **Region:** Sydney (`syd1`) — `vercel.json` already sets this.
4. **Environment variables** — add every key from `.env.local.example`:

   | Variable | Environments |
   |----------|----------------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview |
   | `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview |
   | `NEXT_PUBLIC_APP_URL` | Production = `https://your-app.vercel.app` |
   | `STRIPE_SECRET_KEY` | Production (live keys), Preview (test keys) |
   | `STRIPE_WEBHOOK_SECRET` | Production (live webhook secret) |
   | `STRIPE_PRICE_ID` | Production + Preview |
   | `OPENAI_API_KEY` | Production, Preview |
   | `CRON_SECRET` | Production |
   | `OPENAI_MODEL` | optional |
   | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | optional |

5. **Deploy**.

   **If you see `MIDDLEWARE_INVOCATION_FAILED`:** usually (1) missing `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` on Vercel, or (2) an old middleware build that mutated cookies on the Edge runtime. Set real Supabase keys under **Production**, redeploy from latest `main`, then hard-refresh the site.

6. After first deploy, set `NEXT_PUBLIC_APP_URL` to the real Vercel URL and **Redeploy**.

7. Update Supabase auth redirect URLs (Step 1.7).

8. Update Stripe webhook URL to production (Step 2.5).

---

## Step 5 — Verify

1. Open `https://your-app.vercel.app` — marketing page loads.
2. **Sign up** → onboarding → **Settings → Billing** → **Start free trial**.
3. Stripe Checkout (test card `4242 4242 4242 4242`) → success → app unlocks.
4. In Supabase `organizations`, `subscription_status` should be `trialing`.

---

## Local `.env.local` (optional)

You can keep developing locally with the **same** Supabase project and Stripe **test** keys:

```bash
cp .env.local.example .env.local
# fill in values
npm run dev
```

Use Stripe CLI for webhooks locally:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

---

## Custom domain (optional)

Vercel → Project → **Domains** → add `app.yourbusiness.com.au`  
Then update `NEXT_PUBLIC_APP_URL`, Supabase redirect URLs, and Stripe webhook URL.

---

## Stop using your laptop as the server

Once Vercel is live, you only need:

```bash
npm run dev   # optional, for code changes only
```

Customers and your team use the **Vercel URL** — not `localhost`.
