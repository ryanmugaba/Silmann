# Silman — Pre-launch checklist

Use this before onboarding the first pilot SIL provider.

## Infrastructure

- [ ] All migrations applied to **production** Supabase (`npx supabase db push`), including `0010_message_storage`, `0011_channels_shift_id`, `0012_api_grants`, and `0013_production_hardening`
- [ ] RLS enabled on every table; smoke-test with worker vs owner accounts (`npm test` + manual QA)
- [ ] Supabase project in **ap-southeast-2** (Sydney)
- [ ] Vercel deployment region **syd1** (`vercel.json`)
- [ ] Daily backups enabled in Supabase dashboard

## Secrets & integrations

- [ ] `NEXT_PUBLIC_SUPABASE_*` and `SUPABASE_SERVICE_ROLE_KEY` set in Vercel
- [ ] `OPENAI_API_KEY` set in production (optional `OPENAI_MODEL`, e.g. `gpt-4o-mini`)
- [ ] `CRON_SECRET` set in Vercel (matches `/api/cron/reminders-due` auth)
- [ ] `NEXT_PUBLIC_APP_URL` set to production URL
- [ ] Google Auth provider enabled in Supabase with `/auth/callback` redirect URLs
- [ ] Resend domain verified (when email notifications go live)
- [ ] Twilio credentials stubbed or configured (SMS phase 2)

## Application

- [ ] `npm run build` passes in CI / locally
- [ ] Audit log writes on permission changes and critical mutations
- [ ] `countdown-daily` edge function deployed and scheduled in Supabase
- [ ] Vercel cron active for reminder-due notifications
- [ ] Custom domain + SSL on Vercel
- [ ] Privacy policy and terms of service linked from auth (`/privacy`, `/terms`)

## Pilot

- [ ] **Do not** run `seed.sql` against production
- [ ] First team leader onboarded with hand-holding session
- [ ] Feedback channel established (email or shared doc)
- [ ] Written testimonial agreed in exchange for free pilot

## Security

- [ ] No service role key exposed to client bundles
- [ ] Worker DM scope tested (same-house only)
- [ ] Owner-only routes: permissions matrix, audit log
- [ ] `message-attachments` storage bucket policies verified (migration 0010)

---

*Last updated: Prompt 14 — pilot deploy & seed*
