import { prisma } from "@/lib/prisma";
import { calculateRoundStats, getDurchschnittUberParLetzter5, getRekordrunde, getHoleAverages, getRollingStats } from "@/lib/calculations";
import type { RoundWithStats } from "@/types/round";

export async function getAllRoundsWithStats(userId?: string): Promise<RoundWithStats[]> {
  const where = userId ? { userId } : {};
  const rounds = await prisma.round.findMany({
    where,
    include: { holes: { orderBy: { holeNumber: "asc" } } },
    orderBy: { datum: "desc" },
  });

  return rounds.map((r) => ({
    ...r,
    ...calculateRoundStats(r.holes),
  }));
}

export async function getRoundById(id: string) {
  return prisma.round.findUnique({
    where: { id },
    include: { holes: { orderBy: { holeNumber: "asc" } } },
  });
}

export async function getPublicStats() {
  const rounds = await getAllRoundsWithStats();

  const rekordrunde = getRekordrunde(rounds);
  const durchschnittUberPar = getDurchschnittUberParLetzter5(rounds);
  const holeAverages = getHoleAverages(rounds);
  const trendData = [...rounds].reverse().map((r) => ({
    datum: r.datum,
    uberPar: r.uberPar,
    stableford: r.stablefordPunkte,
    totalStrokes: r.totalStrokes,
  }));
  const rollingData = getRollingStats(rounds);

  return {
    totalRunden: rounds.length,
    rekordrunde,
    durchschnittUberPar,
    holeAverages,
    trendData,
    rollingData,
    letzteRunden: rounds.slice(0, 10),
  };
}
