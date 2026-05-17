import type { Metadata } from "next";
import { Suspense } from "react";
import { getPublicStats } from "@/queries/rounds";
import { formatDatum, signDisplay } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { RollingAverageChart } from "@/components/charts/rolling-average-chart";
import { HoleAveragesChart } from "@/components/charts/hole-averages-chart";
import { RecentRoundsTable } from "@/components/rounds/recent-rounds-table";
import { formatDatumKurz } from "@/lib/utils";

export const metadata: Metadata = { title: "Statistiken" };

export default async function HomePage() {
  const stats = await getPublicStats();

  const rollingData = stats.rollingData.map((r) => ({
    datum: formatDatumKurz(r.datum),
    rolling5Avg: r.rolling5Avg,
    rekord: r.rekord,
  }));

  const letzteRundenRows = stats.letzteRunden.map((r) => ({
    id: r.id,
    datum: formatDatum(r.datum),
    totalStrokes: r.totalStrokes,
    uberPar: r.uberPar,
    stablefordPunkte: r.stablefordPunkte,
    turnier: r.turnier,
    links: r.links,
    holes: r.holes.map((h) => ({ holeNumber: h.holeNumber, strokes: h.strokes })),
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

      {/* Rolling Average + Rekord + Trend */}
      {rollingData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Ø Über Par (letzte 5 Runden) & Rekord</CardTitle>
          </CardHeader>
          <Suspense fallback={<div className="h-96 animate-pulse bg-[var(--color-muted)] rounded" />}>
            <RollingAverageChart data={rollingData} />
          </Suspense>
        </Card>
      )}

      {/* Hole Averages */}
      {stats.totalRunden > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Loch-Durchschnitt</CardTitle>
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
          <RecentRoundsTable runden={letzteRundenRows} />
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
