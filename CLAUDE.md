# Golfapp — Claude Code Guide

Golf performance tracker SaaS. Target: golf.maxbeutler.de. UI language: **German throughout**.

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) |
| UI | React 19, TypeScript, TailwindCSS v4 |
| Database | Supabase (local: Docker) + Prisma 7 + pg adapter |
| Auth | @supabase/ssr (cookie-based JWT) |
| Charts | Recharts |
| Validation | Zod |
| Dates | date-fns |

## Architecture Rules

- **Server Components** do all data reads — fetch in `src/queries/`, never in components.
- **Server Actions** (`"use server"`) do all writes — lives in `src/actions/`.
- **Prisma** talks directly to the DB — no Supabase RLS needed.
- **Auth** is enforced in three layers: `src/middleware.ts`, `src/app/(admin)/layout.tsx`, and inside each Server Action.
- **Always dark** — theme is OKLch CSS vars in `globals.css @theme`. No light/dark toggle, no `dark:` classes.

## Project Structure

```
src/
  app/
    (public)/         # No auth — /home (stats), /bag (clubs)
    (admin)/          # Auth required — /admin, /admin/runden, /admin/bag, /admin/profil
    login/            # Login page
    auth/callback/    # Supabase OAuth callback
    globals.css       # Tailwind v4 @theme + OKLch palette
  actions/
    auth.ts           # signIn, signOut
    rounds.ts         # createRound, updateRound, deleteRound, recalculateAllRoundsForUser
    clubs.ts          # createClub, updateClub, deleteClub
    profile.ts        # updateOfficialHandicapIndex
  queries/
    rounds.ts         # getAllRoundsWithStats, getRoundById, getPublicStats
    clubs.ts          # getAllClubs, getClubById, getGroupedClubs
    profile.ts        # getUserProfile, ensureUserProfile
  components/
    ui/               # button, input, textarea, select, card, badge, spinner
    layout/           # public-nav, admin-sidebar, admin-header
    rounds/           # round-form, hole-input-grid, delete-round-button, recent-rounds-table
    bag/              # club-form, delete-club-button
    charts/           # performance-trend-chart, hole-averages-chart
    profile/          # profile-form, recalc-button
  generated/
    prisma/client.ts  # Generated Prisma client — import PrismaClient and all model types from here
  lib/
    calculations.ts   # Golf stat pure functions — HOLES (par + stroke indexes), WHS calcs (course handicap, NDB cap, stableford net, differential, internal HI), averages
    utils.ts          # cn(), formatDatum(), formatDatumKurz(), signDisplay()
    prisma.ts         # Singleton PrismaClient (PrismaPg adapter)
    supabase/
      client.ts       # Browser client
      server.ts       # Server client (cookie-aware)
  middleware.ts       # Auth guard: /admin → /login; logged-in → /admin from /login
  types/
    round.ts          # RoundWithHoles, RoundWithStats
    club.ts           # Club, CLUB_TYPEN, ClubTyp
prisma/
  schema.prisma       # Round, RoundHole, Club, UserProfile (generator outputs to src/generated/prisma)
prisma.config.ts      # Prisma 7 CLI config — uses DIRECT_URL for migrations (bypasses PgBouncer)
tests/
  whs.test.ts         # Calculation tests — run via `npm run test:whs` (no test framework, plain tsx)
```

## Database Schema

```prisma
model Round {
  id                       String      @id @default(cuid())
  userId                   String
  datum                    DateTime    @db.Date
  turnier                  Boolean     @default(false)
  notizen                  String?
  links                    String[]
  // WHS-derived (nullable for pre-handicap rounds — backfill via /admin/profil)
  courseHandicap           Int?
  adjustedGrossScore       Int?
  scoreDifferential        Decimal?    // 1 decimal
  totalStablefordPoints    Int?        // net stableford with handicap strokes
  handicapIndexBeforeRound Decimal?    // HI used to compute this round's stats
  handicapIndexAfterRound  Decimal?    // HI after this round (running internal HI)
  holes                    RoundHole[]
}

model RoundHole {
  id               String  @id @default(cuid())
  roundId          String
  holeNumber       Int     // 1–9
  strokes          Int
  putts            Int?
  handicapStrokes  Int?    // strokes received on this hole based on courseHandicap + SI-9
  adjustedScore    Int?    // min(strokes, par + 2 + handicapStrokes)
  netScore         Int?    // strokes - handicapStrokes
  stablefordPoints Int?    // max(0, 2 + (par - netScore))
  @@unique([roundId, holeNumber])
}

model Club {
  id                  String   @id @default(cuid())
  userId              String
  typ                 ClubTyp  // eisen | wedge | putter | holz | hybrid
  club                String   // Bezeichnung: "7", "PW", "Driver", ...
  modell              String   // Modellname inkl. Hersteller: "Ping i10"
  loft                Decimal?
  durchschnittsDistanz Int?
  notizen             String?
  sortOrder           Int      @default(0) // Reihenfolge via Up/Down auf /admin/bag
}

model UserProfile {
  userId                String   @id  // matches Supabase auth.uid
  officialHandicapIndex Decimal?      // DGV HI (manual, seeded with 37.6)
  internalHandicapIndex Decimal?      // computed from score differentials
}
```

## Course Configuration

- **9 holes**, Par 33 total, Course Rating 32.0/9 (64.0/18), Slope 124 — constants in `src/lib/calculations.ts`
- Holes (in order): Teehäuschen(4, SI 3/2), Schlosspark(4, SI 5/3), Tafelberg(3, SI 13/7), Schweinebucht(5, SI 1/1), Swilcan Bridge(4, SI 9/5), Kessel(3, SI 15/8), Insel(3, SI 11/6), Birkenwäldchen(4, SI 7/4), Grande Finale(3, SI 17/9) — pairs are `strokeIndex18 / strokeIndex9`
- **Net Stableford**: `max(0, 2 + (par - (strokes - handicapStrokes)))` per hole

## Handicap Calculation (simplified WHS — not DGV-official)

- `courseHandicap9 = round((HI / 2) * (slope / 113) + (CR9 - par9))` — typically ≈ 20 for HI 37.6
- Distribute strokes per hole using `floor(CH / 9)` + 1 for holes with `SI9 ≤ CH mod 9`
- Net Double Bogey cap: `adjustedScore = min(strokes, par + 2 + handicapStrokes)`
- `scoreDifferential9 = (AGS - CR9) * 113 / slope`, rounded to 1 decimal
- Internal HI = average of best N differentials from last 20 rounds (N table per spec: `bestDifferentialsCount`)
- HI fallback chain: `internal → official → 54.0`
- On every round create/update: re-compute round stats, then `recalculateUserHandicapIndex(userId)`; sets `handicapIndexAfterRound` on the round and `internalHandicapIndex` on the profile. Editing a round preserves its `handicapIndexBeforeRound` for history stability.
- Bulk backfill button under `/admin/profil` re-derives every round chronologically.

## Auth Flow

1. Unauthenticated → `/home` (public) or `/login`
2. `signIn()` calls Supabase `signInWithPassword`
3. Middleware refreshes session cookies on every request
4. `/admin/**` redirects to `/login` if no session
5. Each Server Action re-checks auth via `createClient()` — never trust client-side state

## Data Flow Pattern

**Read:**
```
Page (Server Component) → src/queries/*.ts → prisma.* → PostgreSQL
```

**Write:**
```
Client Component → Server Action (src/actions/*.ts) → Zod validate → prisma.* → revalidatePath()
```

## Key Coding Conventions

- Path alias `@/*` → `src/*`; generated Prisma types imported as `@/generated/prisma/client`
- German variable names in domain logic (e.g., `überPar`, `runde`, `schläge`)
- No comments unless the WHY is non-obvious
- Zod schemas defined inside action files, not shared
- `revalidatePath()` called after every mutation to invalidate Next.js cache
- UI components in `src/components/ui/` accept `className` prop for extension

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=       # http://127.0.0.1:54321 locally
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # from `npx supabase start` output
DATABASE_URL=                   # postgres://...?schema=golf  (add &pgbouncer=true in production)
DIRECT_URL=                     # postgres://...?schema=golf  direct connection (for migrations)
```

All tables live in the `golf` schema — both locally (Docker) and in Supabase Cloud. Allows sharing a Supabase project with other apps that use `public`.

## Migration Ownership

**Prisma owns everything in `public` schema** — tables, indexes, foreign keys, and RLS policies.  
**Supabase owns its own internal schemas** (`auth`, `storage`, `realtime`) — never touch those.

Do NOT add application tables to `supabase/migrations/`. That causes two systems creating the same tables and conflicts on `supabase db reset`.

```
prisma/migrations/
  20260515201137_init/migration.sql          ← tables + indexes
  20260515202000_add_rls_policies/migration.sql  ← RLS (runs after tables exist)
supabase/migrations/
  (empty — Supabase manages only its own auth schema)
```

## Database Commands

| Command | What it does |
|---|---|
| `npm run db:migrate -- --name <desc>` | Create + apply a new migration from schema changes |
| `npm run db:deploy` | Apply pending migrations (production / after supabase reset) |
| `npm run db:seed` | Load sample data (requires `SEED_USER_ID`) |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run db:reset` | `supabase db reset` then `prisma migrate deploy` — correct order |

**Schema change workflow:**

> ⚠️ `npm run db:migrate` (`prisma migrate dev`) **does not work** here — it uses a shadow DB without Supabase's `auth` schema, so the RLS migration fails. Use the `migrate diff` workflow documented in [DEPLOYMENT.md](./DEPLOYMENT.md#3-schema-change-workflow).

Short version:
```powershell
# 1. Edit prisma/schema.prisma
# 2. Generate SQL (no shadow DB)
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
# 3. Save output to prisma/migrations/<timestamp>_<name>/migration.sql
# 4. Apply locally + regenerate client
npm run db:deploy
npx prisma generate
# 5. Commit + push — Vercel runs `prisma migrate deploy` during build
```

**Seeding** — requires a Supabase user to already exist:
```bash
# Get UUID from Supabase Studio → Authentication → Users
SEED_USER_ID=<uuid> npm run db:seed
```

Seed file: `prisma/seed.ts` — creates 11 clubs + 6 sample rounds.

## Local Dev Setup

```bash
# 1. Start Supabase (requires Docker Desktop)
npx supabase start

# 2. Copy anon key from output into .env.local

# 3. Run migrations
npm run db:migrate -- --name init

# 4. Create admin user in Supabase Studio → http://127.0.0.1:54323

# 5. (Optional) seed sample data
SEED_USER_ID=<uuid-from-studio> npm run db:seed

# 6. Start dev server
npm run dev   # http://localhost:3000
```

> Docker Desktop must be running. On Windows, run `npx supabase start` from PowerShell, not Git Bash.

## Deployment

Production runs on **Vercel** with the database on **Supabase Cloud**. The `package.json` build script is `prisma migrate deploy && next build`, so migrations auto-apply on every deploy.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for:
- Vercel project setup (env vars, Supabase Auth URLs, custom domain)
- Schema change workflow (the shadow-DB-safe one)
- Seeding production data
- Troubleshooting

## Updating This File

Update `CLAUDE.md` whenever:
- New routes, components, or lib functions are added
- Database schema changes
- Architecture patterns change
- New dependencies are added
