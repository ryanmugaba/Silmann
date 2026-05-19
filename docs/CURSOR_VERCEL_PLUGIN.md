# Vercel plugin (Cursor)

The official **Vercel plugin** is installed for Cursor (user scope). It gives the AI agent Vercel/Next.js deploy skills, slash commands, and session context for this repo.

## Activate it

1. **Restart Cursor** (required after install).
2. Open this project (`Silman`) — the plugin auto-activates for Next.js repos.

Install location (user):  
`%USERPROFILE%\.cursor\extensions\vercel.vercel-plugin-*`

## Reinstall or update

```bash
npx plugins add vercel/vercel-plugin --target cursor
```

If prompted `Install? [Y/n]`, press Enter or pipe `echo y |`.

> The installer may warn that Cursor was not on PATH; `--target cursor` still works.

## Useful commands in Cursor chat

| Command | Use for Silman |
|---------|----------------|
| `/vercel-plugin:deploy` | Deploy preview to Vercel |
| `/vercel-plugin:deploy prod` | Production deploy |
| `/vercel-plugin:env` | List/pull/add env vars |
| `/vercel-plugin:status` | Project + deployment status |
| `/vercel-plugin:bootstrap` | Link project, env setup |
| `/vercel-plugin:nextjs` | Next.js App Router guidance |

## Silman-specific env (set in Vercel or via `/vercel-plugin:env`)

See `.env.local.example` — at minimum:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` (your Vercel URL)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`
- `OPENAI_API_KEY`, `CRON_SECRET`

Deploy region is already **Sydney (`syd1`)** in `vercel.json`.

## Docs

- [Vercel plugin docs](https://vercel.com/docs/agent-resources/vercel-plugin)
- [DEPLOY.md](./DEPLOY.md) — manual deploy checklist for this app
