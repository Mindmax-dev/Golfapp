export const HOLES = [
  { number: 1, name: "Teehäuschen", par: 4 },
  { number: 2, name: "Schlosspark", par: 4 },
  { number: 3, name: "Tafelberg", par: 3 },
  { number: 4, name: "Schweinebucht", par: 5 },
  { number: 5, name: "Swilcan Bridge", par: 4 },
  { number: 6, name: "Kessel", par: 3 },
  { number: 7, name: "Insel", par: 3 },
  { number: 8, name: "Birkenwäldchen", par: 4 },
  { number: 9, name: "Grande Finale", par: 3 },
] as const;

export const TOTAL_PAR = HOLES.reduce((sum, h) => sum + h.par, 0); // 33

export type HoleResult = { holeNumber: number; strokes: number };

export function stablefordPerHole(par: number, strokes: number): number {
  return Math.max(0, 2 + par - strokes);
}

export function calculateRoundStats(holes: HoleResult[]) {
  const totalStrokes = holes.reduce((sum, h) => sum + h.strokes, 0);
  const uberPar = totalStrokes - TOTAL_PAR;

  const stablefordPunkte = holes.reduce((sum, hole) => {
    const holeConfig = HOLES.find((h) => h.number === hole.holeNumber)!;
    return sum + stablefordPerHole(holeConfig.par, hole.strokes);
  }, 0);

  return { totalStrokes, uberPar, stablefordPunkte };
}

export function getDurchschnittUberParLetzter5(
  rounds: Array<{ uberPar: number }>
): number {
  const last5 = rounds.slice(0, 5);
  if (last5.length === 0) return 0;
  const avg = last5.reduce((s, r) => s + r.uberPar, 0) / last5.length;
  return Math.round(avg * 10) / 10;
}

export function getRekordrunde<T extends { totalStrokes: number }>(
  rounds: T[]
): T | null {
  if (rounds.length === 0) return null;
  return rounds.reduce((best, r) =>
    r.totalStrokes < best.totalStrokes ? r : best
  );
}

export function getRollingStats(
  rounds: Array<{ datum: Date; uberPar: number }>
): Array<{ datum: Date; rolling5Avg: number; rekord: number }> {
  const chronological = [...rounds].reverse();
  return chronological.map((r, i) => {
    const fenster = chronological.slice(Math.max(0, i - 4), i + 1);
    const rolling5Avg =
      Math.round((fenster.reduce((s, w) => s + w.uberPar, 0) / fenster.length) * 10) / 10;
    const rekord = Math.min(...chronological.slice(0, i + 1).map((w) => w.uberPar));
    return { datum: r.datum, rolling5Avg, rekord };
  });
}

function holeAvg(rounds: Array<{ holes: HoleResult[] }>, holeNumber: number, fallback: number): number {
  const strokes = rounds.flatMap((r) =>
    r.holes.filter((h) => h.holeNumber === holeNumber).map((h) => h.strokes)
  );
  return strokes.length > 0
    ? Math.round((strokes.reduce((s, n) => s + n, 0) / strokes.length) * 100) / 100
    : fallback;
}

export function getHoleAverages(
  rounds: Array<{ holes: HoleResult[] }>
): Array<{ holeNumber: number; name: string; par: number; average: number; averageLast5: number }> {
  const last5 = rounds.slice(0, 5);
  return HOLES.map((hole) => ({
    holeNumber: hole.number,
    name: hole.name,
    par: hole.par,
    average: holeAvg(rounds, hole.number, hole.par),
    averageLast5: holeAvg(last5, hole.number, hole.par),
  }));
}
