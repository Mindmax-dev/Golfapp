/**
 * Tests for the simplified WHS calculations. Run with `npm run test:whs`.
 *
 * No test framework — keeps zero new dev dependencies. Each `check()` either
 * prints PASS or throws, which `tsx` surfaces as a non-zero exit code.
 */

import {
  calculateCourseHandicap9,
  calculateHandicapStrokesForHole,
  calculateAdjustedHoleScore,
  calculateStablefordPoints,
  calculateScoreDifferential9,
  calculateInternalHandicapIndex,
  bestDifferentialsCount,
  computeRoundWhsStats,
  effectiveHandicapIndex,
  HOLES,
  FALLBACK_HANDICAP_INDEX,
} from "../src/lib/calculations";

let failed = 0;
let passed = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}\n     expected: ${JSON.stringify(expected)}\n     actual:   ${JSON.stringify(actual)}`);
  }
}

function approx(name: string, actual: number, expected: number, eps = 0.05) {
  const ok = Math.abs(actual - expected) <= eps;
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}\n     expected: ${expected} (±${eps})\n     actual:   ${actual}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log("calculateCourseHandicap9");
// (37.6 / 2) * (124 / 113) + (32.0 - 33) = 18.8 * 1.0973 - 1 ≈ 19.63 → 20
check("HI 37.6 → 20", calculateCourseHandicap9(37.6), 20);
check("HI 0 → round(0 + (32.0 - 33)) = -1", calculateCourseHandicap9(0), -1);
// 27 * (124/113) - 1 = 29.628 - 1 ≈ 28.63 → 29
check("HI 54 → 29", calculateCourseHandicap9(54), 29);
// 9 * (124/113) - 1 = 9.876 - 1 ≈ 8.88 → 9
check("HI 18 → 9", calculateCourseHandicap9(18), 9);

// ─────────────────────────────────────────────────────────────────────────────
console.log("\ncalculateHandicapStrokesForHole");
// CH=20: floor(20/9)=2; remainder=2 → SI9 1 & 2 get +1
check("CH 20 SI9 1 → 3", calculateHandicapStrokesForHole(20, 1), 3);
check("CH 20 SI9 2 → 3", calculateHandicapStrokesForHole(20, 2), 3);
check("CH 20 SI9 3 → 2", calculateHandicapStrokesForHole(20, 3), 2);
check("CH 20 SI9 9 → 2", calculateHandicapStrokesForHole(20, 9), 2);
check("CH 9 SI9 1 → 1", calculateHandicapStrokesForHole(9, 1), 1);
check("CH 9 SI9 9 → 1", calculateHandicapStrokesForHole(9, 9), 1);
check("CH 0 → 0", calculateHandicapStrokesForHole(0, 5), 0);
check("CH negative → 0", calculateHandicapStrokesForHole(-3, 1), 0);
check("CH 5 SI9 5 → 1", calculateHandicapStrokesForHole(5, 5), 1);
check("CH 5 SI9 6 → 0", calculateHandicapStrokesForHole(5, 6), 0);

// ─────────────────────────────────────────────────────────────────────────────
console.log("\ncalculateAdjustedHoleScore (Net Double Bogey cap)");
// Spec example: par=4, hcpStrokes=3, max=9; strokes=10 → 9; strokes=6 → 6
check("par 4, hcp 3, strokes 10 → cap 9", calculateAdjustedHoleScore(4, 10, 3), 9);
check("par 4, hcp 3, strokes 6 → 6", calculateAdjustedHoleScore(4, 6, 3), 6);
check("par 3, hcp 0, strokes 5 → cap 5", calculateAdjustedHoleScore(3, 5, 0), 5);
check("par 3, hcp 0, strokes 6 → cap 5", calculateAdjustedHoleScore(3, 6, 0), 5);
check("par 5, hcp 2, strokes 4 → 4", calculateAdjustedHoleScore(5, 4, 2), 4);

// ─────────────────────────────────────────────────────────────────────────────
console.log("\ncalculateStablefordPoints (net)");
// net par → 2; net birdie → 3; net bogey → 1; worse → 0
check("par 4 strokes 5 hcp 1 (net par) → 2", calculateStablefordPoints(4, 5, 1), 2);
check("par 4 strokes 4 hcp 1 (net birdie) → 3", calculateStablefordPoints(4, 4, 1), 3);
check("par 4 strokes 6 hcp 1 (net bogey) → 1", calculateStablefordPoints(4, 6, 1), 1);
check("par 4 strokes 8 hcp 1 → 0", calculateStablefordPoints(4, 8, 1), 0);
check("par 3 strokes 3 hcp 0 → 2", calculateStablefordPoints(3, 3, 0), 2);
check("par 4 strokes 4 hcp 0 (net par no strokes) → 2", calculateStablefordPoints(4, 4, 0), 2);

// ─────────────────────────────────────────────────────────────────────────────
console.log("\ncalculateScoreDifferential9");
// (AGS - 32.0) * 113 / 124
// AGS = 45 → (13.0 * 113 / 124) ≈ 11.8
approx("AGS 45 → ≈ 11.8", calculateScoreDifferential9(45), 11.8);
approx("AGS 32 → 0.0", calculateScoreDifferential9(32), 0.0, 0.05);
approx("AGS 33 → ≈ 0.9", calculateScoreDifferential9(33), 0.91, 0.05);

// ─────────────────────────────────────────────────────────────────────────────
console.log("\nbestDifferentialsCount");
check("0 → 0", bestDifferentialsCount(0), 0);
check("1 → 1", bestDifferentialsCount(1), 1);
check("2 → 1", bestDifferentialsCount(2), 1);
check("3 → 1", bestDifferentialsCount(3), 1);
check("5 → 1", bestDifferentialsCount(5), 1);
check("6 → 2", bestDifferentialsCount(6), 2);
check("8 → 2", bestDifferentialsCount(8), 2);
check("9 → 3", bestDifferentialsCount(9), 3);
check("11 → 3", bestDifferentialsCount(11), 3);
check("12 → 4", bestDifferentialsCount(12), 4);
check("14 → 4", bestDifferentialsCount(14), 4);
check("15 → 5", bestDifferentialsCount(15), 5);
check("16 → 5", bestDifferentialsCount(16), 5);
check("17 → 6", bestDifferentialsCount(17), 6);
check("18 → 6", bestDifferentialsCount(18), 6);
check("19 → 7", bestDifferentialsCount(19), 7);
check("20 → 8", bestDifferentialsCount(20), 8);
check("25 (capped at 20) → 8", bestDifferentialsCount(25), 8);

// ─────────────────────────────────────────────────────────────────────────────
console.log("\ncalculateInternalHandicapIndex");
check("empty → null", calculateInternalHandicapIndex([]), null);
check("single 10 → 10", calculateInternalHandicapIndex([10]), 10);
check("[5, 10, 15] (best 1) → 5", calculateInternalHandicapIndex([5, 10, 15]), 5);
// 6 differentials → best 2 averaged
check("[20,15,10,5,8,12] best 2 (5,8) avg → 6.5", calculateInternalHandicapIndex([20, 15, 10, 5, 8, 12]), 6.5);

// ─────────────────────────────────────────────────────────────────────────────
console.log("\nspec example end-to-end");
// HI 37.6 → CH 20 → SI9=2 hole, par 4 → hcpStrokes 3, max adj 9
const ch = calculateCourseHandicap9(37.6);
check("end-to-end CH", ch, 20);
const hpStrokes = calculateHandicapStrokesForHole(ch, 2);
check("end-to-end hpStrokes for SI9=2", hpStrokes, 3);
check("end-to-end max adj for strokes 10", calculateAdjustedHoleScore(4, 10, hpStrokes), 9);
check("end-to-end keep for strokes 6", calculateAdjustedHoleScore(4, 6, hpStrokes), 6);

// ─────────────────────────────────────────────────────────────────────────────
console.log("\ncomputeRoundWhsStats");
// 9 strokes = par + 1 each, hcpIndex 37.6 (CH 20)
const parRound = HOLES.map((h) => ({ holeNumber: h.number, strokes: h.par + 1, putts: null }));
const result = computeRoundWhsStats(parRound, 37.6);
check("CH", result.courseHandicap, 20);
check("total strokes (each +1 over par)", result.totalStrokes, 33 + 9);
// every hole should be 1 over → with handicap strokes, all are well under the NDB cap
check("AGS equals raw strokes when no cap hit", result.adjustedGrossScore, 33 + 9);
// total handicap strokes distributed = 20
const totalHcp = result.holes.reduce((s, h) => s + h.handicapStrokes, 0);
check("sum hcpStrokes equals CH", totalHcp, 20);
// every hole stableford ≥ 1 because each stroke = 1 over par, net is ≤ par (or =) → 2+ pts
const totalSP = result.holes.reduce((s, h) => s + h.stablefordPoints, 0);
check("total net stableford matches sum", result.totalStablefordPoints, totalSP);

// All bogey, AGS=42 (handicap caps don't fire on +1 over par)
// differential = (42 - 32.0) * 113 / 124 = 10 * 113 / 124 ≈ 9.11 → 9.1
approx("differential for AGS=42 (+9)", result.scoreDifferential, 9.11, 0.05);

// ─────────────────────────────────────────────────────────────────────────────
console.log("\neffectiveHandicapIndex");
check("internal preferred", effectiveHandicapIndex({ internalHandicapIndex: 12.3, officialHandicapIndex: 37.6 }), 12.3);
check("official when internal null", effectiveHandicapIndex({ internalHandicapIndex: null, officialHandicapIndex: 37.6 }), 37.6);
check("fallback when both null", effectiveHandicapIndex({ internalHandicapIndex: null, officialHandicapIndex: null }), FALLBACK_HANDICAP_INDEX);

// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
