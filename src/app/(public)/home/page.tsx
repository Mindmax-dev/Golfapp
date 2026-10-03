import type { Metadata } from "next";
import { Suspense } from "react";
import { getPublicStats } from "@/queries/rounds";
import { formatDatum, formatDatumKurz, signDisplay } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { RollingAverageChart } from "@/components/charts/rolling-average-chart";
import { HoleAveragesChart } from "@/components/charts/hole-averages-chart";
import { HolePuttsChart } from "@/components/charts/hole-putts-chart";
import { RecentRoundsTable } from "@/components/rounds/recent-rounds-table";

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
    <div className="flex w-full min-w-0 flex-col gap-6 sm:gap-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
          Golf Statistiken
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Persönliche Golfperformance im Überblick
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
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
            <CardTitle>Handicap Index</CardTitle>
          </CardHeader>
          {stats.officialHandicapIndex != null ? (
            <p className="text-3xl font-bold text-[var(--color-foreground)]">
              {stats.officialHandicapIndex.toFixed(1)}
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
          <CardHeader className="items-start">
            <div>
              <CardTitle>{"Schl\u00e4ge pro Loch"}</CardTitle>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                Letzte 20 Runden im Vergleich zum aktuellen 5-Runden-Trend
              </p>
            </div>
          </CardHeader>
          <Suspense fallback={<div className="h-64 animate-pulse bg-[var(--color-muted)] rounded" />}>
            <HoleAveragesChart data={stats.holeAverages} />
          </Suspense>
        </Card>
      )}

      {stats.puttAverages.some((hole) => hole.averageLast20 != null) && (
        <Card>
          <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:gap-4">
            <div>
              <CardTitle>Putts pro Loch</CardTitle>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                <span className="block">Letzte 20 Runden im Vergleich zum aktuellen 5-Runden-Trend</span>
                <span className="mt-0.5 block">Nur Runden mit erfassten Putts; weniger ist besser</span>
              </p>
            </div>
            {stats.puttingTrend.delta != null && (
              <div
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
                  stats.puttingTrend.delta < 0
                    ? "border-[oklch(0.45_0.12_142)] bg-[oklch(0.22_0.05_142)] text-[oklch(0.82_0.15_142)]"
                    : stats.puttingTrend.delta > 0
                      ? "border-[oklch(0.5_0.14_27)] bg-[oklch(0.22_0.05_27)] text-[oklch(0.8_0.15_27)]"
                      : "border-[oklch(0.55_0.12_85)] bg-[oklch(0.23_0.05_85)] text-[oklch(0.84_0.14_85)]"
                }`}
              >
                {stats.puttingTrend.delta < 0
                  ? "Verbessert"
                  : stats.puttingTrend.delta > 0
                    ? "Verschlechtert"
                    : "Unver\u00e4ndert"}{" "}
                {stats.puttingTrend.delta > 0 ? "+" : ""}
                {stats.puttingTrend.delta.toFixed(2).replace(".", ",")} Putts/Loch
              </div>
            )}
          </CardHeader>
          <Suspense fallback={<div className="h-64 animate-pulse bg-[var(--color-muted)] rounded" />}>
            <HolePuttsChart data={stats.puttAverages} />
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
