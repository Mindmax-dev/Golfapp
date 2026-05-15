import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma CLI only auto-loads .env — mirror Next.js behaviour by also loading .env.local.
config({ path: ".env" });
config({ path: ".env.local", override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // DIRECT_URL: unproxied direct connection — required for migrations via PgBouncer in production.
  // Falls back to DATABASE_URL locally where both point to the same Postgres instance.
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
