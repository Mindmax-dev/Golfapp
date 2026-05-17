import { prisma } from "@/lib/prisma";
import { FALLBACK_HANDICAP_INDEX } from "@/lib/calculations";

export type HandicapHistoryPoint = {
  datum: Date;
  /** Running internal HI (vereinfachte WHS), recomputed each round. */
  internal: number | null;
  /** Manually entered official HI, forward-filled from the latest entry on/before this date. */
  official: number;
  turnier: boolean;
};

export type OfficialHandicapEntryRow = {
  id: string;
  datum: Date;
  handicapIndex: number;
  notiz: string | null;
};

export async function getOfficialHandicapEntries(
  userId: string
): Promise<OfficialHandicapEntryRow[]> {
  const rows = await prisma.officialHandicapEntry.findMany({
    where: { userId },
    orderBy: [{ datum: "desc" }, { createdAt: "desc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    datum: r.datum,
    handicapIndex: Number(r.handicapIndex),
    notiz: r.notiz,
  }));
}

export async function getHandicapHistory(userId?: string): Promise<HandicapHistoryPoint[]> {
  const where = userId ? { userId } : {};
  const [rounds, entries] = await Promise.all([
    prisma.round.findMany({
      where,
      select: {
        datum: true,
        turnier: true,
        handicapIndexAfterRound: true,
      },
      orderBy: { datum: "asc" },
    }),
    prisma.officialHandicapEntry.findMany({
      where,
      orderBy: { datum: "asc" },
      select: { datum: true, handicapIndex: true },
    }),
  ]);

  const entriesAsc = entries.map((e) => ({
    datum: e.datum,
    value: Number(e.handicapIndex),
  }));

  function officialAt(date: Date): number {
    // Latest entry with datum <= round's date. Entries are sorted ascending.
    let value = FALLBACK_HANDICAP_INDEX;
    for (const e of entriesAsc) {
      if (e.datum.getTime() <= date.getTime()) value = e.value;
      else break;
    }
    return value;
  }

  return rounds.map((r) => ({
    datum: r.datum,
    internal:
      r.handicapIndexAfterRound != null ? Number(r.handicapIndexAfterRound) : null,
    official: officialAt(r.datum),
    turnier: r.turnier,
  }));
}
