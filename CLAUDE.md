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
    (admin)/          # Auth required — /admin, /admin/runden, /admin/bag
    login/            # Login page
    auth/callback/    # Supabase OAuth callback
    globals.css       # Tailwind v4 @theme + OKLch palette
  actions/
    auth.ts           # signIn, signOut
    rounds.ts         # createRound, updateRound, deleteRound
    clubs.ts          # createClub, updateClub, deleteClub
  queries/
    rounds.ts         # getAllRoundsWithStats, getRoundById, getPublicStats
    clubs.ts          # getAllClubs, getClubById, getGroupedClubs
  components/
    ui/               # button, input, textarea, select, card, badge, spinner
    layout/           # public-nav, admin-sidebar, admin-header
    rounds/           # round-form, hole-input-grid, delete-round-button
    bag/              # club-form, delete-club-button
    charts/           # performance-trend-chart, hole-averages-chart
  generated/
    prisma/client.ts  # Generated Prisma client — import PrismaClient and all model types from here
  lib/
    calculations.ts   # All golf stat pure functions — HOLES, TOTAL_PAR, stableford, averages
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
  schema.prisma       # Round, RoundHole, Club models (generator outputs to src/generated/prisma)
prisma.config.ts      # Prisma 7 CLI config — uses DIRECT_URL for migrations (bypasses PgBouncer)
```

## Database Schema

```prisma
model Round {
  id        String      @id @default(cuid())
  userId    String
  datum     DateTime    @db.Date
  turnier   Boolean     @default(false)
  notizen   String?
  links     String[]
  holes     RoundHole[]
}

model RoundHole {
  id         String  @id @default(cuid())
  roundId    String
  holeNumber Int     // 1–9
  strokes    Int
  @@unique([roundId, holeNumber])
}

model Club {
  id                  String   @id @default(cuid())
  userId              String
  typ                 ClubTyp  // eisen | wedge | putter | holz | hybrid
  hersteller          String
  modell              String
  loft                Decimal?
  durchschnittsDistanz Int?
  notizen             String?
  sortOrder           Int      @default(0)
}
```

## Course Configuration

- **9 holes**, Par 33 total
- Holes (in order): Teehäuschen(4), Schlosspark(4), Tafelberg(3), Schweinebucht(5), Swilcan Bridge(4), Kessel(3), Insel(3), Birkenwäldchen(4), Grande Finale(3)
- **Stableford**: `max(0, 2 + par - strokes)` per hole — defined in `src/lib/calculations.ts`

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
DATABASE_URL=                   # postgres://... with ?pgbouncer=true for pooling
DIRECT_URL=                     # postgres://... direct connection (for migrations)
```

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
```bash
# 1. Edit prisma/schema.prisma
# 2. Generate migration + apply:
npm run db:migrate -- --name add_weather_column
# → writes prisma/migrations/<timestamp>/migration.sql
# → applies to local DB
# → regenerates src/generated/prisma/
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

## Updating This File

Update `CLAUDE.md` whenever:
- New routes, components, or lib functions are added
- Database schema changes
- Architecture patterns change
- New dependencies are added
