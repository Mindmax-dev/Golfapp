import type { Metadata } from "next";
import { Suspense } from "react";
import { getPublicStats } from "@/queries/rounds";
import { formatDatum, signDisplay } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PerformanceTrendChart } from "@/components/charts/performance-trend-chart";
import { HoleAveragesChart } from "@/components/charts/hole-averages-chart";
import { formatDatumKurz } from "@/lib/utils";

export const metadata: Metadata = { title: "Statistiken" };

export default async function HomePage() {
  const stats = await getPublicStats();

  const trendData = stats.trendData.map((r) => ({
    datum: formatDatumKurz(r.datum),
    uberPar: r.uberPar,
    stableford: r.stableford,
    totalStrokes: r.totalStrokes,
  }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
          Golf Statistiken
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Persönliche Golfperformance im Überblick
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Runden gespielt</CardTitle>
          </CardHeader>
          <p className="text-3xl font-bold text-[var(--color-foreground)]">
            {stats.totalRunden}
          </p>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rekordrunde</CardTitle>
          </CardHeader>
          {stats.rekordrunde ? (
            <>
              <p className="text-3xl font-bold text-[var(--color-primary)]">
                {stats.rekordrunde.totalStrokes}
              </p>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                {formatDatum(stats.rekordrunde.datum)}
              </p>
            </>
          ) : (
            <p className="text-[var(--color-muted-foreground)]">–</p>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ø Über Par (letzte 5)</CardTitle>
          </CardHeader>
          <p className="text-3xl font-bold text-[var(--color-foreground)]">
            {stats.totalRunden > 0
              ? signDisplay(stats.durchschnittUberPar)
              : "–"}
          </p>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rekordrunde Über Par</CardTitle>
          </CardHeader>
          {stats.rekordrunde ? (
            <p className="text-3xl font-bold text-[var(--color-foreground)]">
              {signDisplay(stats.rekordrunde.uberPar)}
            </p>
          ) : (
            <p className="text-[var(--color-muted-foreground)]">–</p>
          )}
        </Card>
      </div>

      {/* Performance Trend */}
      {trendData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance-Trend</CardTitle>
          </CardHeader>
          <Suspense fallback={<div className="h-64 animate-pulse bg-[var(--color-muted)] rounded" />}>
            <PerformanceTrendChart data={trendData} />
          </Suspense>
        </Card>
      )}

      {/* Hole Averages */}
      {stats.totalRunden > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Loch-Durchschnitt (alle Runden)</CardTitle>
          </CardHeader>
          <Suspense fallback={<div className="h-64 animate-pulse bg-[var(--color-muted)] rounded" />}>
            <HoleAveragesChart data={stats.holeAverages} />
          </Suspense>
        </Card>
      )}

      {/* Recent Rounds */}
      {stats.letzteRunden.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Letzte Runden</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-card-border)]">
                  <th className="text-left py-2 pr-4 text-[var(--color-muted-foreground)] font-medium">Datum</th>
                  <th className="text-right py-2 pr-4 text-[var(--color-muted-foreground)] font-medium">Schläge</th>
                  <th className="text-right py-2 pr-4 text-[var(--color-muted-foreground)] font-medium">Über Par</th>
                  <th className="text-right py-2 pr-4 text-[var(--color-muted-foreground)] font-medium">Stableford</th>
                  <th className="text-left py-2 text-[var(--color-muted-foreground)] font-medium">Typ</th>
                </tr>
              </thead>
              <tbody>
                {stats.letzteRunden.map((runde) => (
                  <tr key={runde.id} className="border-b border-[var(--color-card-border)]/50">
                    <td className="py-2.5 pr-4 text-[var(--color-foreground)]">
                      {formatDatum(runde.datum)}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono text-[var(--color-foreground)]">
                      {runde.totalStrokes}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono">
                      <span className={runde.uberPar <= 0 ? "text-[var(--color-primary)]" : "text-[var(--color-muted-foreground)]"}>
                        {signDisplay(runde.uberPar)}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono text-[var(--color-foreground)]">
                      {runde.stablefordPunkte}
                    </td>
                    <td className="py-2.5">
                      {runde.turnier ? (
                        <Badge variant="warning">Turnier</Badge>
                      ) : (
                        <Badge variant="default">Übungsrunde</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {stats.totalRunden === 0 && (
        <div className="text-center py-16 text-[var(--color-muted-foreground)]">
          Noch keine Runden gespeichert.
        </div>
      )}
    </div>
  );
}
