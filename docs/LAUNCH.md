# Silman launch checklist

Use this on launch day. Complete in order.

## 1. Database (Supabase production)

Apply all migrations including the latest:

```bash
npx supabase db push
# or run SQL from supabase/migrations/0016_incidents.sql in the SQL editor
```

Confirm tables exist: `incidents`, `shifts`, `profiles`, `organizations`.

Enable **Realtime** (optional): `messages`, `shifts`.

## 2. Environment variables (Vercel)

| Variable | Required |
|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes |
| `NEXT_PUBLIC_APP_URL` | Yes (production URL) |
| `OPENAI_API_KEY` | Yes (AI features) |
| `STRIPE_SECRET_KEY` | Yes (billing) |
| `STRIPE_PRICE_ID` | Yes (billing) |
| `STRIPE_WEBHOOK_SECRET` | Yes (billing webhooks) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Recommended |
| `CRON_SECRET` | Yes (reminder cron on Vercel) |

Redeploy after changing env vars.

## 3. Stripe

1. Webhook endpoint: `https://YOUR_DOMAIN/api/stripe/webhook`
2. Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`
3. Google OAuth redirect URLs include production domain

## 4. Smoke test (15 min)

- [ ] `/setup` — all checks green
- [ ] Sign up / log in
- [ ] Dashboard loads with live counts
- [ ] Roster — create/view shift
- [ ] Participants — list and detail
- [ ] Workers — invite flow (house required first)
- [ ] **Incidents** — record and close an incident
- [ ] **Reports** — download roster CSV
- [ ] Messages — send message
- [ ] AI (`Ctrl+K`) — simple prompt
- [ ] Settings → Billing (owner)

## 5. Post-launch

- Monitor Vercel logs and Supabase logs for errors
- Do not commit `.env.local`
