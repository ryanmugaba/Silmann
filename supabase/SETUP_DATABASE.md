# Fix: "Could not find the table public.organizations"

Your Supabase project has **no database tables yet**. The app needs migrations applied once.

## Quick fix (Supabase Dashboard — ~2 minutes)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project **gmivupjmpznzevwkuwet**
2. Go to **SQL Editor** → **New query**
3. Open this file in your project: `supabase/apply-all-migrations.sql`
4. Copy **the entire file** and paste into the SQL Editor
5. Click **Run** (wait until it finishes — may take 30–60 seconds)

   The file starts with a **schema reset** (drops `public` and recreates it). That is intentional if your first run failed with errors like `relation "profiles" does not exist`.
6. If you see **permission denied for table organizations**, run `supabase/fix-grants.sql` in another query (do **not** reset again).
7. Optional demo data: run `supabase/seed.sql` in a **second** query (gives you `owner@demo.silman.app` / `DemoPass123!`)
8. Refresh http://localhost:3000 and continue onboarding (or log in with demo account)

## Alternative (CLI)

```bash
npx supabase login
npx supabase link --project-ref gmivupjmpznzevwkuwet
npx supabase db push
```

Then run `seed.sql` in SQL Editor if you want demo users.

## After setup

- **New org:** finish onboarding with your real organisation name
- **Demo login:** `owner@demo.silman.app` / `DemoPass123!` (only after `seed.sql`)
