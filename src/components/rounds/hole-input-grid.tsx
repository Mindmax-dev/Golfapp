"use client";

import { useState } from "react";
import { HOLES, TOTAL_PAR, calculateRoundStats } from "@/lib/calculations";
import { signDisplay } from "@/lib/utils";

interface HoleInputGridProps {
  defaultValues?: Record<number, number>;
}

export function HoleInputGrid({ defaultValues = {} }: HoleInputGridProps) {
  const [strokes, setStrokes] = useState<Record<number, number>>(defaultValues);

  const holesData = HOLES.map((h) => ({
    ...h,
    strokes: strokes[h.number] ?? 0,
  }));

  const filledHoles = holesData.filter((h) => h.strokes > 0);
  const preview =
    filledHoles.length === 9
      ? calculateRoundStats(
          holesData.map((h) => ({ holeNumber: h.number, strokes: h.strokes }))
        )
      : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-2 pr-3 text-[var(--color-muted-foreground)] font-medium min-w-32">
                Loch
              </th>
              <th className="text-center py-2 pr-3 text-[var(--color-muted-foreground)] font-medium w-16">
                Par
              </th>
              <th className="text-center py-2 text-[var(--color-muted-foreground)] font-medium w-24">
                Schläge
              </th>
            </tr>
          </thead>
          <tbody>
            {HOLES.map((hole) => (
              <tr
                key={hole.number}
                className="border-t border-[var(--color-card-border)]/50"
              >
                <td className="py-2 pr-3 text-[var(--color-foreground)]">
                  <span className="text-[var(--color-muted-foreground)] mr-2 text-xs">
                    {hole.number}.
                  </span>
                  {hole.name}
                </td>
                <td className="py-2 pr-3 text-center text-[var(--color-muted-foreground)]">
                  {hole.par}
                </td>
                <td className="py-2">
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
                    className="w-20 text-center rounded-md border border-[var(--color-card-border)] bg-[var(--color-background)] px-2 py-1.5 text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[var(--color-card-border)]">
              <td className="py-3 font-medium text-[var(--color-foreground)]">
                Gesamt
              </td>
              <td className="py-3 text-center font-medium text-[var(--color-muted-foreground)]">
                {TOTAL_PAR}
              </td>
              <td className="py-3 text-center font-mono font-bold text-[var(--color-foreground)]">
                {filledHoles.length === 9
                  ? holesData.reduce((s, h) => s + h.strokes, 0)
                  : "–"}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {preview && (
        <div className="flex gap-4 p-4 rounded-lg bg-[var(--color-muted)]/50 border border-[var(--color-card-border)]">
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
          <div className="w-px bg-[var(--color-card-border)]" />
          <div className="text-center">
            <p className="text-xs text-[var(--color-muted-foreground)]">Stableford</p>
            <p className="text-xl font-bold font-mono text-[var(--color-foreground)]">
              {preview.stablefordPunkte}
            </p>
          </div>
          <div className="w-px bg-[var(--color-card-border)]" />
          <div className="text-center">
            <p className="text-xs text-[var(--color-muted-foreground)]">Schläge</p>
            <p className="text-xl font-bold font-mono text-[var(--color-foreground)]">
              {preview.totalStrokes}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
