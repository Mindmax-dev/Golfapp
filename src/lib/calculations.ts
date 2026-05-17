export const HOLES = [
  { number: 1, name: "Teehäuschen", par: 4, strokeIndex18: 3, strokeIndex9: 2 },
  { number: 2, name: "Schlosspark", par: 4, strokeIndex18: 5, strokeIndex9: 3 },
  { number: 3, name: "Tafelberg", par: 3, strokeIndex18: 13, strokeIndex9: 7 },
  { number: 4, name: "Schweinebucht", par: 5, strokeIndex18: 1, strokeIndex9: 1 },
  { number: 5, name: "Swilcan Bridge", par: 4, strokeIndex18: 9, strokeIndex9: 5 },
  { number: 6, name: "Kessel", par: 3, strokeIndex18: 15, strokeIndex9: 8 },
  { number: 7, name: "Insel", par: 3, strokeIndex18: 11, strokeIndex9: 6 },
  { number: 8, name: "Birkenwäldchen", par: 4, strokeIndex18: 7, strokeIndex9: 4 },
  { number: 9, name: "Grande Finale", par: 3, strokeIndex18: 17, strokeIndex9: 9 },
] as const;

export const TOTAL_PAR = HOLES.reduce((sum, h) => sum + h.par, 0); // 33

export const COURSE_RATING_9 = 32.0;
export const COURSE_RATING_18 = COURSE_RATING_9 * 2; // 64.0
export const SLOPE_RATING = 124;
export const PAR_9 = TOTAL_PAR; // 33
export const NEUTRAL_SLOPE = 113;
export const FALLBACK_HANDICAP_INDEX = 54.0;
export const DEFAULT_OFFICIAL_HANDICAP_INDEX = 37.6;

export type HoleResult = { holeNumber: number; strokes: number };

export function holeConfig(holeNumber: number) {
  const h = HOLES.find((x) => x.number === holeNumber);
  if (!h) throw new Error(`Unknown hole ${holeNumber}`);
  return h;
}

export function stablefordPerHole(par: number, strokes: number): number {
  return Math.max(0, 2 + par - strokes);
}

export function calculateRoundStats(holes: HoleResult[]) {
  const totalStrokes = holes.reduce((sum, h) => sum + h.strokes, 0);
  const uberPar = totalStrokes - TOTAL_PAR;

  const stablefordPunkte = holes.reduce((sum, hole) => {
    const cfg = holeConfig(hole.holeNumber);
    return sum + stablefordPerHole(cfg.par, hole.strokes);
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

// ─────────────────────────────────────────────────────────────────────────────
// Simplified WHS-based Handicap calculation (9-hole, single fixed course).
// Not an official DGV/WHS calculation — internal performance index only.
// ─────────────────────────────────────────────────────────────────────────────

export function calculateCourseHandicap9(
  handicapIndex: number,
  slopeRating = SLOPE_RATING,
  courseRating9 = COURSE_RATING_9,
  par9 = PAR_9
): number {
  return Math.round(
    (handicapIndex / 2) * (slopeRating / NEUTRAL_SLOPE) + (courseRating9 - par9)
  );
}

export function calculateHandicapStrokesForHole(
  courseHandicap9: number,
  normalizedStrokeIndex9: number
): number {
  if (courseHandicap9 <= 0) return 0;
  const base = Math.floor(courseHandicap9 / 9);
  const remainder = courseHandicap9 % 9;
  return base + (normalizedStrokeIndex9 <= remainder ? 1 : 0);
}

export function calculateAdjustedHoleScore(
  par: number,
  strokes: number,
  handicapStrokes: number
): number {
  const maxAdjustedScore = par + 2 + handicapStrokes;
  return Math.min(strokes, maxAdjustedScore);
}

export function calculateNetScore(strokes: number, handicapStrokes: number): number {
  return strokes - handicapStrokes;
}

export function calculateStablefordPoints(
  par: number,
  strokes: number,
  handicapStrokes: number
): number {
  const netScore = calculateNetScore(strokes, handicapStrokes);
  return Math.max(0, 2 + (par - netScore));
}

export function calculateScoreDifferential9(
  adjustedGrossScore: number,
  courseRating9 = COURSE_RATING_9,
  slopeRating = SLOPE_RATING
): number {
  const raw = ((adjustedGrossScore - courseRating9) * NEUTRAL_SLOPE) / slopeRating;
  return Math.round(raw * 10) / 10;
}

export function bestDifferentialsCount(roundCount: number): number {
  if (roundCount <= 0) return 0;
  if (roundCount < 3) return 1;
  if (roundCount <= 5) return 1;
  if (roundCount <= 8) return 2;
  if (roundCount <= 11) return 3;
  if (roundCount <= 14) return 4;
  if (roundCount <= 16) return 5;
  if (roundCount <= 18) return 6;
  if (roundCount === 19) return 7;
  return 8; // 20 rounds (capped)
}

export function calculateInternalHandicapIndex(
  scoreDifferentials: number[]
): number | null {
  if (scoreDifferentials.length === 0) return null;
  const considered = [...scoreDifferentials]
    .slice(0, 20)
    .sort((a, b) => a - b);
  const n = bestDifferentialsCount(considered.length);
  const best = considered.slice(0, n);
  const avg = best.reduce((s, d) => s + d, 0) / best.length;
  return Math.round(avg * 10) / 10;
}

export type ComputedHole = {
  holeNumber: number;
  par: number;
  strokes: number;
  putts: number | null;
  officialStrokeIndex18: number;
  normalizedStrokeIndex9: number;
  handicapStrokes: number;
  adjustedScore: number;
  netScore: number;
  stablefordPoints: number;
};

export type ComputedRound = {
  holes: ComputedHole[];
  courseHandicap: number;
  totalStrokes: number;
  adjustedGrossScore: number;
  scoreDifferential: number;
  totalStablefordPoints: number;
  handicapIndexBeforeRound: number;
};

export function computeRoundWhsStats(
  holes: Array<{ holeNumber: number; strokes: number; putts?: number | null }>,
  handicapIndexBeforeRound: number
): ComputedRound {
  const courseHandicap = calculateCourseHandicap9(handicapIndexBeforeRound);

  const computed: ComputedHole[] = holes.map((h) => {
    const cfg = holeConfig(h.holeNumber);
    const handicapStrokes = calculateHandicapStrokesForHole(
      courseHandicap,
      cfg.strokeIndex9
    );
    const adjustedScore = calculateAdjustedHoleScore(cfg.par, h.strokes, handicapStrokes);
    const netScore = calculateNetScore(h.strokes, handicapStrokes);
    const stablefordPoints = calculateStablefordPoints(cfg.par, h.strokes, handicapStrokes);
    return {
      holeNumber: h.holeNumber,
      par: cfg.par,
      strokes: h.strokes,
      putts: h.putts ?? null,
      officialStrokeIndex18: cfg.strokeIndex18,
      normalizedStrokeIndex9: cfg.strokeIndex9,
      handicapStrokes,
      adjustedScore,
      netScore,
      stablefordPoints,
    };
  });

  const totalStrokes = computed.reduce((s, h) => s + h.strokes, 0);
  const adjustedGrossScore = computed.reduce((s, h) => s + h.adjustedScore, 0);
  const totalStablefordPoints = computed.reduce((s, h) => s + h.stablefordPoints, 0);
  const scoreDifferential = calculateScoreDifferential9(adjustedGrossScore);

  return {
    holes: computed,
    courseHandicap,
    totalStrokes,
    adjustedGrossScore,
    scoreDifferential,
    totalStablefordPoints,
    handicapIndexBeforeRound,
  };
}

export function effectiveHandicapIndex(profile: {
  internalHandicapIndex?: number | null;
  officialHandicapIndex?: number | null;
}): number {
  if (profile.internalHandicapIndex != null) return profile.internalHandicapIndex;
  if (profile.officialHandicapIndex != null) return profile.officialHandicapIndex;
  return FALLBACK_HANDICAP_INDEX;
}
