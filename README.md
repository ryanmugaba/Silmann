# Silman

NDIS Supported Independent Living (SIL) management for Australian providers. Desktop-first web app with house-scoped RBAC, roster, compliance countdowns, messaging, and audit-grade logging.

## Prerequisites

- **Node.js** 20+
- **npm** or **pnpm**
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm i -g supabase` or use `npx supabase`)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for local Supabase)
- [Vercel CLI](https://vercel.com/docs/cli) (optional, for deploy)

## Local development

1. **Clone and install**

   ```bash
   npm install
   ```

2. **Environment**

   Copy `.env.local.example` to `.env.local` and set:

   | Variable | Description |
   |----------|-------------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (Sydney / ap-southeast-2) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server only — never expose to the client) |
   | `OPENAI_API_KEY` | OpenAI API key for AI rostering (`/api/ai`) |
   | `OPENAI_MODEL` | Optional — defaults to `gpt-4o-mini` |
   | `NEXT_PUBLIC_APP_URL` | App URL (`http://localhost:3000` locally) |
   | `CRON_SECRET` | Random secret for Vercel cron (`/api/cron/reminders-due`) |
   | `RESEND_API_KEY` | Optional — email notifications |
   | `RESEND_FROM_EMAIL` | Verified sender for email notifications |
   | `TWILIO_*` | Optional — SMS (phase 2) |
   | `STRIPE_SECRET_KEY` | Stripe secret key (subscriptions) |
   | `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
   | `STRIPE_PRICE_ID` | Stripe Price ID for **$29.99 AUD/month** |
   | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional — Stripe publishable key |

3. **Supabase (local)**

   Start Docker, then:

   ```bash
   npx supabase start
   npx supabase db reset
   ```

   `db reset` applies migrations in `supabase/migrations/` (empty production seed).

4. **Run the app**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

### Production signup & billing

1. Open [http://localhost:3000](http://localhost:3000) → **Get started** (or `/signup`).
2. Create your organisation (onboarding wizard).
3. **Settings → Billing** → subscribe via Stripe Checkout (**$29.99 AUD/month** per organisation).

See **[docs/STRIPE_SETUP.md](docs/STRIPE_SETUP.md)** for Stripe keys and webhooks.  
**Host in the cloud (recommended):** **[docs/DEPLOY.md](docs/DEPLOY.md)** — Vercel Sydney + Supabase Australia.

**Cursor + Vercel:** Official Vercel agent plugin — see **[docs/CURSOR_VERCEL_PLUGIN.md](docs/CURSOR_VERCEL_PLUGIN.md)** (`/vercel-plugin:deploy`, env management).

Optional local UI fixtures only: `NEXT_PUBLIC_ENABLE_MOCK_DATA=true` (never use in production).

## Database

Migrations: `supabase/migrations/` (`0001` foundation → `0015` billing).

```bash
# Local reset + seed
npx supabase db reset

# Remote (after linking your project)
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

**Migrations 0010–0013** (messaging attachments storage, shift-linked channels,
API grants, production hardening) are included in the repo; run `db push` or
`db reset` so they are applied.

## Deployment

1. Create a Supabase project in **ap-southeast-2** (Sydney).
2. Link and push schema:

   ```bash
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```

3. Deploy to Vercel (region **syd1** via `vercel.json`):

   ```bash
   npx vercel deploy --prod
   ```

4. Set production environment variables in Vercel (match `.env.local.example`).
5. Set `CRON_SECRET` in Vercel and add the same value to the project env (cron route validates it).
6. Enable Google as a Supabase Auth provider and add
   `<production-url>/auth/callback` plus local preview callback URLs to the
   provider redirect allow-list.

### Edge functions & cron

| Component | How to deploy |
|-----------|----------------|
| **Compliance countdown** | `npx supabase functions deploy countdown-daily` — schedule in Supabase dashboard (daily). |
| **AI rostering** | Next.js route `/api/ai` on Vercel — set `OPENAI_API_KEY` (no separate `ai-handler` edge function). |
| **Due reminders** | Vercel cron in `vercel.json` → `/api/cron/reminders-due` (daily ~6am Sydney). |

### AI command bar

Managers can click the top search box or press `⌘K` / `Ctrl+K` and type natural
language operational commands, for example: `roster Sarah Chen at Parramatta SIL
on 13 June day shift`, `remind me to review Alex's plan tomorrow`, or `post an
urgent notice to Parramatta SIL`. Silman AI uses OpenAI tool calling as a
translator, fetches scoped context, then executes server-side tools that still
enforce RBAC, house scope, validation, and rules engine checks. Settings and
administration configuration remain manual by design.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest (RBAC unit tests) |

## Architecture

- **Next.js 14** App Router, TypeScript strict
- **Supabase** Postgres + Auth + RLS (Sydney)
- **OpenAI** function-calling for roster AI (`lib/ai/`)
- **Primitives**: RBAC, Countdown, Rules Engine
- **UI**: shadcn/ui, Tailwind, Framer Motion

See `SILMAN_BUILD_PROMPTS.md` for the full build sequence and `LAUNCH_CHECKLIST.md` before pilot go-live.
