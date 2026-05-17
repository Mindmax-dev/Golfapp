import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAllRoundsWithStats } from "@/queries/rounds";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDatum, signDisplay } from "@/lib/utils";
import { DeleteRoundButton } from "@/components/rounds/delete-round-button";

export const metadata: Metadata = { title: "Runden" };

export default async function RundenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const rounds = await getAllRoundsWithStats(user!.id);

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Runden</h1>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
            {rounds.length} Runde{rounds.length !== 1 ? "n" : ""} gespeichert
          </p>
        </div>
        <Link href="/admin/runden/neu">
          <Button>+ Neue Runde</Button>
        </Link>
      </div>

      {rounds.length === 0 ? (
        <Card className="text-center py-16">
          <p className="text-[var(--color-muted-foreground)]">
            Noch keine Runden gespeichert.
          </p>
          <Link href="/admin/runden/neu" className="mt-4 inline-block">
            <Button>Erste Runde eingeben</Button>
          </Link>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-card-border)] text-[var(--color-muted-foreground)]">
                  <th className="text-left py-3 pr-3 font-medium">Datum</th>
                  <th className="text-right py-3 pr-3 font-medium">Schläge</th>
                  <th className="text-right py-3 pr-3 font-medium">Über Par</th>
                  <th className="text-right py-3 pr-3 font-medium" title="Adjusted Gross Score">AGS</th>
                  <th className="text-right py-3 pr-3 font-medium" title="Course Handicap">CH</th>
                  <th className="text-right py-3 pr-3 font-medium" title="Score Differential">Diff.</th>
                  <th className="text-right py-3 pr-3 font-medium">Netto-SP</th>
                  <th className="text-right py-3 pr-3 font-medium" title="HI nach dieser Runde">HI</th>
                  <th className="text-left py-3 pr-3 font-medium">Typ</th>
                  <th className="text-right py-3 font-medium">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {rounds.map((runde) => (
                  <tr
                    key={runde.id}
                    className="border-b border-[var(--color-card-border)]/50 hover:bg-[var(--color-muted)]/30 transition-colors"
                  >
                    <td className="py-3 pr-3">
                      <Link
                        href={`/admin/runden/${runde.id}`}
                        className="text-[var(--color-foreground)] hover:text-[var(--color-primary)] transition-colors"
                      >
                        {formatDatum(runde.datum)}
                      </Link>
                    </td>
                    <td className="py-3 pr-3 text-right font-mono font-medium text-[var(--color-foreground)]">
                      {runde.totalStrokes}
                    </td>
                    <td className="py-3 pr-3 text-right font-mono">
                      <span className={runde.uberPar <= 0 ? "text-[var(--color-primary)]" : "text-[var(--color-muted-foreground)]"}>
                        {signDisplay(runde.uberPar)}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-right font-mono text-[var(--color-muted-foreground)]">
                      {runde.adjustedGrossScore ?? "–"}
                    </td>
                    <td className="py-3 pr-3 text-right font-mono text-[var(--color-muted-foreground)]">
                      {runde.courseHandicap ?? "–"}
                    </td>
                    <td className="py-3 pr-3 text-right font-mono text-[var(--color-muted-foreground)]">
                      {runde.scoreDifferential != null ? Number(runde.scoreDifferential).toFixed(1) : "–"}
                    </td>
                    <td className="py-3 pr-3 text-right font-mono text-[var(--color-foreground)]">
                      {runde.stablefordPunkte}
                    </td>
                    <td className="py-3 pr-3 text-right font-mono text-[var(--color-foreground)]">
                      {runde.handicapIndexAfterRound != null ? Number(runde.handicapIndexAfterRound).toFixed(1) : "–"}
                    </td>
                    <td className="py-3 pr-3">
                      {runde.turnier ? (
                        <Badge variant="warning">Turnier</Badge>
                      ) : (
                        <Badge variant="default">Übungsrunde</Badge>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/runden/${runde.id}`}>
                          <Button variant="ghost" size="sm">Details</Button>
                        </Link>
                        <DeleteRoundButton id={runde.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
