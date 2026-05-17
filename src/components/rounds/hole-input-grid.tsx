"use client";

import { useState } from "react";
import {
  HOLES,
  TOTAL_PAR,
  calculateRoundStats,
  calculateCourseHandicap9,
  calculateHandicapStrokesForHole,
  calculateAdjustedHoleScore,
  calculateStablefordPoints,
  calculateScoreDifferential9,
  COURSE_RATING_9,
  SLOPE_RATING,
} from "@/lib/calculations";
import { signDisplay } from "@/lib/utils";

interface HoleInputGridProps {
  defaultValues?: Record<number, { strokes: number; putts: number | null }>;
  handicapIndex: number;
}

export function HoleInputGrid({ defaultValues = {}, handicapIndex }: HoleInputGridProps) {
  const [strokes, setStrokes] = useState<Record<number, number>>(
    Object.fromEntries(
      Object.entries(defaultValues).map(([k, v]) => [k, v.strokes ?? 0])
    )
  );
  const [putts, setPutts] = useState<Record<number, string>>(
    Object.fromEntries(
      Object.entries(defaultValues).map(([k, v]) => [k, v.putts != null ? String(v.putts) : ""])
    )
  );

  const courseHandicap = calculateCourseHandicap9(handicapIndex);

  const holesData = HOLES.map((h) => ({
    ...h,
    strokes: strokes[h.number] ?? 0,
    handicapStrokes: calculateHandicapStrokesForHole(courseHandicap, h.strokeIndex9),
  }));

  const filledHoles = holesData.filter((h) => h.strokes > 0);
  const preview = filledHoles.length === 9
    ? (() => {
        const base = calculateRoundStats(
          holesData.map((h) => ({ holeNumber: h.number, strokes: h.strokes }))
        );
        const adjustedGrossScore = holesData.reduce(
          (s, h) => s + calculateAdjustedHoleScore(h.par, h.strokes, h.handicapStrokes),
          0
        );
        const netStableford = holesData.reduce(
          (s, h) => s + calculateStablefordPoints(h.par, h.strokes, h.handicapStrokes),
          0
        );
        const differential = calculateScoreDifferential9(adjustedGrossScore);
        return { ...base, adjustedGrossScore, netStableford, differential };
      })()
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[var(--color-muted-foreground)]">
        <span>
          HI vor Runde: <span className="font-mono text-[var(--color-foreground)]">{handicapIndex.toFixed(1)}</span>
        </span>
        <span>
          Course Handicap: <span className="font-mono text-[var(--color-foreground)]">{courseHandicap}</span>
        </span>
        <span>
          CR/Slope: <span className="font-mono text-[var(--color-foreground)]">{COURSE_RATING_9} / {SLOPE_RATING}</span>
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[var(--color-muted-foreground)]">
              <th className="text-left py-2 pr-2 font-medium min-w-32">Loch</th>
              <th className="text-center py-2 pr-2 font-medium w-12">Par</th>
              <th className="text-center py-2 pr-2 font-medium w-12" title="Offizieller Stroke Index (18 Loch)">SI</th>
              <th className="text-center py-2 pr-2 font-medium w-12" title="Stroke Index normalisiert für 9 Loch">SI-9</th>
              <th className="text-center py-2 pr-2 font-medium w-12" title="Vorgabe-Schläge auf diesem Loch">HCP</th>
              <th className="text-center py-2 pr-2 font-medium w-20">Schläge</th>
              <th className="text-center py-2 pr-2 font-medium w-20">Putts</th>
              <th className="text-center py-2 font-medium w-16">Netto-SP</th>
            </tr>
          </thead>
          <tbody>
            {holesData.map((hole) => {
              const sp = hole.strokes > 0
                ? calculateStablefordPoints(hole.par, hole.strokes, hole.handicapStrokes)
                : null;
              return (
                <tr
                  key={hole.number}
                  className="border-t border-[var(--color-card-border)]/50"
                >
                  <td className="py-2 pr-2 text-[var(--color-foreground)]">
                    <span className="text-[var(--color-muted-foreground)] mr-2 text-xs">
                      {hole.number}.
                    </span>
                    {hole.name}
                  </td>
                  <td className="py-2 pr-2 text-center text-[var(--color-muted-foreground)]">{hole.par}</td>
                  <td className="py-2 pr-2 text-center text-[var(--color-muted-foreground)]">{hole.strokeIndex18}</td>
                  <td className="py-2 pr-2 text-center text-[var(--color-muted-foreground)]">{hole.strokeIndex9}</td>
                  <td className="py-2 pr-2 text-center font-mono text-[var(--color-foreground)]">
                    {hole.handicapStrokes > 0 ? `+${hole.handicapStrokes}` : "–"}
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      name={`hole_${hole.number}`}
                      min={1}
                      max={20}
                      value={strokes[hole.number] ?? ""}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setStrokes((prev) => ({
                          ...prev,
                          [hole.number]: isNaN(val) ? 0 : val,
                        }));
                      }}
                      required
                      className="w-16 text-center rounded-md border border-[var(--color-card-border)] bg-[var(--color-background)] px-2 py-1.5 text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      name={`putts_${hole.number}`}
                      min={0}
                      max={20}
                      value={putts[hole.number] ?? ""}
                      onChange={(e) =>
                        setPutts((prev) => ({ ...prev, [hole.number]: e.target.value }))
                      }
                      placeholder="–"
                      className="w-16 text-center rounded-md border border-[var(--color-card-border)] bg-[var(--color-background)] px-2 py-1.5 text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </td>
                  <td className="py-2 text-center font-mono text-[var(--color-foreground)]">
                    {sp ?? "–"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[var(--color-card-border)]">
              <td className="py-3 font-medium text-[var(--color-foreground)]">Gesamt</td>
              <td className="py-3 text-center font-medium text-[var(--color-muted-foreground)]">{TOTAL_PAR}</td>
              <td className="py-3" colSpan={2} />
              <td className="py-3 text-center font-mono text-[var(--color-muted-foreground)]">
                {holesData.reduce((s, h) => s + h.handicapStrokes, 0)}
              </td>
              <td className="py-3 text-center font-mono font-bold text-[var(--color-foreground)]">
                {filledHoles.length === 9 ? holesData.reduce((s, h) => s + h.strokes, 0) : "–"}
              </td>
              <td className="py-3 text-center font-mono text-[var(--color-muted-foreground)]">
                {Object.values(putts).reduce((s, v) => s + (parseInt(v) || 0), 0) || "–"}
              </td>
              <td className="py-3 text-center font-mono font-bold text-[var(--color-foreground)]">
                {preview?.netStableford ?? "–"}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {preview && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-lg bg-[var(--color-muted)]/50 border border-[var(--color-card-border)]">
          <div className="text-center">
            <p className="text-xs text-[var(--color-muted-foreground)]">Schläge</p>
            <p className="text-xl font-bold font-mono text-[var(--color-foreground)]">
              {preview.totalStrokes}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-[var(--color-muted-foreground)]">Über Par</p>
            <p
              className={`text-xl font-bold font-mono ${
                preview.uberPar <= 0
                  ? "text-[var(--color-primary)]"
                  : "text-[var(--color-foreground)]"
              }`}
            >
              {signDisplay(preview.uberPar)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-[var(--color-muted-foreground)]" title="Adjusted Gross Score">AGS</p>
            <p className="text-xl font-bold font-mono text-[var(--color-foreground)]">
              {preview.adjustedGrossScore}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-[var(--color-muted-foreground)]">Differential</p>
            <p className="text-xl font-bold font-mono text-[var(--color-foreground)]">
              {preview.differential.toFixed(1)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-[var(--color-muted-foreground)]">Stableford (netto)</p>
            <p className="text-xl font-bold font-mono text-[var(--color-foreground)]">
              {preview.netStableford}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
