# Deployment Guide

Production deployment runs on **Vercel** with the database hosted on **Supabase Cloud** (project ref `nrkhzrnffjqgzaduhuru`, region `eu-central-1`).

---

## 1. Vercel one-time setup

1. Push repo to GitHub (already at `Mindmax-dev/Golfapp`).
2. vercel.com → **Add New… → Project** → import the repo.
3. Framework preset: **Next.js** (auto-detected). Leave build command as default — `package.json` overrides it to `prisma migrate deploy && next build`.
4. Add these environment variables under **Production + Preview + Development**:

   | Variable | Value | Notes |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://nrkhzrnffjqgzaduhuru.supabase.co` | |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Supabase Dashboard → Project Settings → API | |
   | `DATABASE_URL` | pooler URL, port **6543**, with `?pgbouncer=true&schema=golf` | runtime |
   | `DIRECT_URL` | session URL, port **5432**, with `?schema=golf` | migrations |

5. Configure Supabase Auth (Dashboard → Authentication → URL Configuration):
   - **Site URL**: `https://golf.maxbeutler.de`
   - **Redirect URLs**: add both
     - `https://golf.maxbeutler.de/auth/callback`
     - `https://*.vercel.app/auth/callback` (preview deploys)

6. After the first successful deploy, attach the custom domain:
   - Vercel → Project → Settings → Domains → add `golf.maxbeutler.de`
   - Add the CNAME record Vercel shows to your DNS provider.

---

## 2. How migrations auto-apply on Vercel

The build script in `package.json` is:

```json
"build": "prisma migrate deploy && next build"
```

On every Vercel deploy:

1. `npm install` runs → `postinstall: prisma generate` produces the Prisma client.
2. `npm run build` → `prisma migrate deploy` applies any pending migrations to the cloud DB (uses `DIRECT_URL`).
3. If migrations succeed → `next build` runs.
4. If migrations fail → build aborts *before* `next build`. A broken migration never ships a broken app.

Neither `.env` nor `.env.local` exist on Vercel (both gitignored). Vercel sets `process.env.*` from the dashboard; `prisma.config.ts`'s dotenv calls become no-ops, so Vercel's env vars win.

---

## 3. Schema change workflow

> ⚠️ Do **not** use `npm run db:migrate` (`prisma migrate dev`). It spins up a shadow database to validate migrations, but the shadow DB is a fresh Postgres without Supabase's `auth` schema — the RLS migration (`auth.uid()`) fails with `schema "auth" does not exist`.

Use this instead:

```powershell
# 1. Edit prisma/schema.prisma

# 2. Generate the migration SQL (no shadow DB)
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script

# 3. Create the migration folder + write the SQL
$ts = (Get-Date -AsUTC -Format "yyyyMMddHHmmss")
$dir = "prisma/migrations/${ts}_<short_name>"
New-Item -ItemType Directory $dir | Out-Null
# Save the SQL output from step 2 into $dir/migration.sql

# 4. Apply locally + regenerate client
npm run db:deploy
npx prisma generate

# 5. Commit & push — Vercel auto-applies on deploy
git add prisma/schema.prisma prisma/migrations/<new-folder>
git commit -m "Add <description>"
git push
```

### Verify on Vercel

Watch the build logs. You should see:

```
> prisma migrate deploy && next build
Applying migration `<timestamp>_<name>`
The following migration(s) have been applied: ...
> next build
```

Optionally verify on the cloud DB via Supabase SQL editor or MCP:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema='golf' AND table_name='<table>' AND column_name='<column>';
```

---

## 4. Seeding production

The seed script (`prisma/seed.ts`) creates 11 clubs + 37 sample rounds attributed to one user. Requires an auth user to already exist on the production Supabase project.

1. Supabase Dashboard → Authentication → Users → **Add user** (email + password, **✅ Auto Confirm User**).
2. Copy the new user's UUID from the users table.
3. Run:

```powershell
Move-Item .env.local .env.local.bak
$env:SEED_USER_ID = "<prod-uuid>"
npm run db:seed
Move-Item .env.local.bak .env.local
```

`.env.local` is hidden so `DIRECT_URL` resolves to the cloud value in `.env`. `SEED_USER_ID` is set inline; `seed.ts`'s `dotenv` calls don't override existing `process.env`, so the inline value wins.

The seed deletes any existing data for that user before re-inserting, so it's safe to re-run.

---

## 5. Initial production setup history

> One-time work already done — kept here for reference.

- **Cloud schema was bootstrapped via Supabase MCP** (raw SQL through HTTPS) because port 5432 appeared unreachable on first try. Root cause was actually a placeholder password in `.env`, not network. Tables created in `golf` schema with RLS enabled.
- **Prisma's tracking table (`_prisma_migrations`) was backfilled** with `npx prisma migrate resolve --applied <name>` for each of the three initial migrations. Without this, future `prisma migrate deploy` runs would try to re-apply the existing migrations and fail because the tables already exist.

---

## 6. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `P1001: Can't reach database server` running `db:deploy` | placeholder password in `.env` | Pull real password from Supabase Dashboard → Project Settings → Database |
| Vercel build fails at `prisma migrate deploy` | `DIRECT_URL` env var missing or wrong on Vercel | Verify all 4 env vars are set; `DIRECT_URL` must use port 5432, no `pgbouncer=true` |
| Login fails on production | Supabase Auth redirect URLs missing prod domain | Add `https://golf.maxbeutler.de/auth/callback` to Supabase → Auth → URL Configuration |
| Local `prisma migrate dev` fails with `schema "auth" does not exist` | shadow DB lacks Supabase's `auth` schema | Use the `migrate diff` workflow in section 3 |
| `db:deploy` against cloud goes to local DB instead | `.env.local` overrides `.env` (loaded with `override: true` in `prisma.config.ts`) | Hide `.env.local` temporarily: `Move-Item .env.local .env.local.bak; npm run db:deploy; Move-Item .env.local.bak .env.local` |
| Seed runs against local instead of cloud | same `.env.local` override | Same fix as above |
