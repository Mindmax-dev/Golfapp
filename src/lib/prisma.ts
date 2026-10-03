import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function usesLocalDatabase(connectionString: string) {
  const hostname = new URL(connectionString).hostname;
  return ["localhost", "127.0.0.1", "::1", "host.docker.internal"].includes(hostname);
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL!;
  const pool = new Pool({
    connectionString,
    // `next start` always sets NODE_ENV=production, even when it serves the local
    // Docker stack. Decide TLS from the database host instead of the app mode.
    ssl: usesLocalDatabase(connectionString) ? false : { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool, { schema: "golf" });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
