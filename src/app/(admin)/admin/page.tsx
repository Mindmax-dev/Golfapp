import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPublicStats } from "@/queries/rounds";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDatum, signDisplay } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const stats = await getPublicStats();

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Dashboard</h1>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
            Willkommen, {user?.email}
          </p>
        </div>
        <Link href="/admin/runden/neu">
          <Button>+ Neue Runde</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Runden gesamt</CardTitle>
          </CardHeader>
          <p className="text-3xl font-bold">{stats.totalRunden}</p>
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
          <p className="text-3xl font-bold">
            {stats.totalRunden > 0 ? signDisplay(stats.durchschnittUberPar) : "–"}
          </p>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Handicap-Schätzung</CardTitle>
          </CardHeader>
          <p className="text-3xl font-bold">
            {stats.totalRunden > 0 ? signDisplay(stats.durchschnittUberPar) : "–"}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Schnellzugriff</CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-2">
            <Link href="/admin/runden/neu">
              <Button variant="secondary" className="w-full justify-start">
                🏌️ Neue Runde eingeben
              </Button>
            </Link>
            <Link href="/admin/runden">
              <Button variant="ghost" className="w-full justify-start">
                📋 Alle Runden anzeigen
              </Button>
            </Link>
            <Link href="/admin/bag">
              <Button variant="ghost" className="w-full justify-start">
                🎒 Bag verwalten
              </Button>
            </Link>
          </div>
        </Card>

        {stats.letzteRunden.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Letzte Runden</CardTitle>
            </CardHeader>
            <div className="flex flex-col gap-2">
              {stats.letzteRunden.slice(0, 5).map((r) => (
                <Link
                  key={r.id}
                  href={`/admin/runden/${r.id}`}
                  className="flex items-center justify-between text-sm hover:text-[var(--color-primary)] transition-colors"
                >
                  <span className="text-[var(--color-muted-foreground)]">
                    {formatDatum(r.datum)}
                  </span>
                  <span className="font-mono font-medium">
                    {r.totalStrokes}{" "}
                    <span className="text-[var(--color-muted-foreground)]">
                      ({signDisplay(r.uberPar)})
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
