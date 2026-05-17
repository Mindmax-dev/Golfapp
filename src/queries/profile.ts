import { prisma } from "@/lib/prisma";
import { effectiveHandicapIndex } from "@/lib/calculations";

export type ProfileSnapshot = {
  userId: string;
  officialHandicapIndex: number | null;
  internalHandicapIndex: number | null;
  effectiveHandicapIndex: number;
};

function toNumber(d: { toNumber: () => number } | null | undefined): number | null {
  return d ? d.toNumber() : null;
}

export async function getUserProfile(userId: string): Promise<ProfileSnapshot> {
  const [row, latestEntry] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.officialHandicapEntry.findFirst({
      where: { userId },
      orderBy: [{ datum: "desc" }, { createdAt: "desc" }],
      select: { handicapIndex: true },
    }),
  ]);

  // Latest manually entered HI is the source of truth; fall back to the legacy
  // profile column for users who haven't migrated to entries yet.
  const official =
    toNumber(latestEntry?.handicapIndex ?? null) ??
    toNumber(row?.officialHandicapIndex ?? null);
  const internal = toNumber(row?.internalHandicapIndex ?? null);

  return {
    userId,
    officialHandicapIndex: official,
    internalHandicapIndex: internal,
    effectiveHandicapIndex: effectiveHandicapIndex({
      internalHandicapIndex: internal,
      officialHandicapIndex: official,
    }),
  };
}

export async function ensureUserProfile(userId: string) {
  return prisma.userProfile.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}
