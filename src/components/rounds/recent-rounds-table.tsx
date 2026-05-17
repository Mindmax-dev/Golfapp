"use client";

import { Fragment, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { HOLES } from "@/lib/calculations";
import { signDisplay } from "@/lib/utils";

interface HoleRow {
  holeNumber: number;
  strokes: number;
}

interface RundeRow {
  id: string;
  datum: string;
  totalStrokes: number;
  uberPar: number;
  stablefordPunkte: number;
  turnier: boolean;
  links: string[];
  holes: HoleRow[];
}

export function RecentRoundsTable({ runden }: { runden: RundeRow[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-card-border)] text-[var(--color-muted-foreground)]">
            <th className="text-left py-2 pr-3 font-medium">Datum</th>
            <th className="text-right py-2 pr-3 font-medium">Schläge</th>
            <th className="text-right py-2 pr-3 font-medium">Über Par</th>
            <th className="text-right py-2 pr-3 font-medium">Stableford</th>
            <th className="text-left py-2 font-medium">Typ</th>
          </tr>
        </thead>
        <tbody>
          {runden.map((runde) => {
            const isExpanded = expandedId === runde.id;
            return (
              <Fragment key={runde.id}>
                <tr
                  className="border-b border-[var(--color-card-border)]/50 cursor-pointer hover:bg-[var(--color-card-border)]/20 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : runde.id)}
                >
                  <td className="py-2.5 pr-3 text-[var(--color-foreground)]">
                    {runde.datum}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono text-[var(--color-foreground)]">
                    {runde.totalStrokes}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono">
                    <span className={runde.uberPar <= 0 ? "text-[var(--color-primary)]" : "text-[var(--color-muted-foreground)]"}>
                      {signDisplay(runde.uberPar)}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono text-[var(--color-foreground)]">
                    {runde.stablefordPunkte}
                  </td>
                  <td className="py-2.5 flex items-center gap-2">
                    {runde.turnier ? (
                      <Badge variant="warning">Turnier</Badge>
                    ) : (
                      <Badge variant="default">Übungsrunde</Badge>
                    )}
                    <span className="text-[var(--color-muted-foreground)] text-xs ml-auto pr-1">
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="border-b border-[var(--color-card-border)]/50 bg-[var(--color-card-border)]/10">
                    <td colSpan={5} className="py-3 px-1">
                      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2 mb-3">
                        {HOLES.map((hole) => {
                          const holeData = runde.holes.find((h) => h.holeNumber === hole.number);
                          const strokes = holeData?.strokes ?? null;
                          const diff = strokes !== null ? strokes - hole.par : null;
                          return (
                            <div
                              key={hole.number}
                              className="flex flex-col items-center rounded-md bg-[var(--color-card-border)]/30 px-2 py-1.5 gap-0.5"
                            >
                              <span className="text-[10px] text-[var(--color-muted-foreground)] font-medium">
                                L{hole.number}
                              </span>
                              <span className="text-[10px] text-[var(--color-muted-foreground)] truncate max-w-full text-center">
                                {hole.name}
                              </span>
                              <span className="text-base font-bold text-[var(--color-foreground)]">
                                {strokes ?? "–"}
                              </span>
                              {diff !== null && (
                                <span className={`text-[10px] font-medium ${diff < 0 ? "text-[var(--color-primary)]" : diff === 0 ? "text-[var(--color-muted-foreground)]" : "text-[oklch(0.75_0.18_50)]"}`}>
                                  {signDisplay(diff)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {runde.links.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          <span className="text-xs text-[var(--color-muted-foreground)]">Links:</span>
                          {runde.links.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-[var(--color-primary)] underline underline-offset-2 hover:opacity-75 transition-opacity break-all"
                            >
                              {url}
                            </a>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
