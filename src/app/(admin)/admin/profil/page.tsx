import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { OfficialHandicapEntries } from "@/components/profile/official-handicap-entries";
import { RecalcAllRoundsButton } from "@/components/profile/recalc-button";
import { getUserProfile } from "@/queries/profile";
import { getOfficialHandicapEntries } from "@/queries/handicap";
import { formatDatum } from "@/lib/utils";
import {
  HOLES,
  COURSE_RATING_18,
  COURSE_RATING_9,
  SLOPE_RATING,
  PAR_9,
} from "@/lib/calculations";

export const metadata: Metadata = { title: "Profil & Handicap" };

export default async function ProfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [profile, entriesRaw] = await Promise.all([
    getUserProfile(user!.id),
    getOfficialHandicapEntries(user!.id),
  ]);
  const entries = entriesRaw.map((e) => ({
    id: e.id,
    datum: e.datum.toISOString().split("T")[0],
    datumLabel: formatDatum(e.datum),
    handicapIndex: e.handicapIndex,
    notiz: e.notiz,
  }));

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Profil & Handicap</h1>
        <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
          Vereinfachte WHS-basierte interne Berechnung – nicht DGV-offiziell.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Handicap Index</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 gap-6 mb-2">
          <div>
            <p className="text-xs text-[var(--color-muted-foreground)] mb-1">Offiziell (DGV)</p>
            <p className="text-3xl font-bold font-mono text-[var(--color-foreground)]">
              {profile.officialHandicapIndex != null ? profile.officialHandicapIndex.toFixed(1) : "–"}
            </p>
            <p className="text-[10px] text-[var(--color-muted-foreground)] mt-1">
              aus letztem manuellem Eintrag
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-muted-foreground)] mb-1">Intern (berechnet)</p>
            <p className="text-3xl font-bold font-mono text-[var(--color-foreground)]">
              {profile.internalHandicapIndex != null ? profile.internalHandicapIndex.toFixed(1) : "–"}
            </p>
            <p className="text-[10px] text-[var(--color-muted-foreground)] mt-1">
              aus Runden via vereinfachter WHS
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Offizieller Handicap-Verlauf</CardTitle>
        </CardHeader>
        <p className="text-sm text-[var(--color-muted-foreground)] mb-4 leading-relaxed">
          Trage jeden offiziellen Handicap-Stand mit Datum ein. Zwischen Einträgen bleibt der zuletzt gültige Wert
          bestehen. Vor dem ersten Eintrag wird {54.0} als Fallback verwendet.
        </p>
        <OfficialHandicapEntries entries={entries} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Platzdaten (fest)</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 text-sm">
          <div>
            <p className="text-[var(--color-muted-foreground)] text-xs">Course Rating (18)</p>
            <p className="font-mono">{COURSE_RATING_18}</p>
          </div>
          <div>
            <p className="text-[var(--color-muted-foreground)] text-xs">Course Rating (9)</p>
            <p className="font-mono">{COURSE_RATING_9}</p>
          </div>
          <div>
            <p className="text-[var(--color-muted-foreground)] text-xs">Slope Rating</p>
            <p className="font-mono">{SLOPE_RATING}</p>
          </div>
          <div>
            <p className="text-[var(--color-muted-foreground)] text-xs">Par (9)</p>
            <p className="font-mono">{PAR_9}</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-card-border)] text-[var(--color-muted-foreground)]">
                <th className="text-left py-2 pr-3 font-medium">Loch</th>
                <th className="text-center py-2 pr-3 font-medium">Par</th>
                <th className="text-center py-2 pr-3 font-medium" title="Offizieller Stroke Index (18 Loch)">SI (18)</th>
                <th className="text-center py-2 font-medium" title="Normalisierter Stroke Index (9 Loch)">SI (9)</th>
              </tr>
            </thead>
            <tbody>
              {HOLES.map((h) => (
                <tr key={h.number} className="border-b border-[var(--color-card-border)]/40">
                  <td className="py-2 pr-3 text-[var(--color-foreground)]">
                    <span className="text-[var(--color-muted-foreground)] mr-2 text-xs">{h.number}.</span>
                    {h.name}
                  </td>
                  <td className="py-2 pr-3 text-center text-[var(--color-muted-foreground)]">{h.par}</td>
                  <td className="py-2 pr-3 text-center font-mono">{h.strokeIndex18}</td>
                  <td className="py-2 text-center font-mono">{h.strokeIndex9}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bestehende Runden neu berechnen</CardTitle>
        </CardHeader>
        <p className="text-sm text-[var(--color-muted-foreground)] mb-4 leading-relaxed">
          Berechnet für alle vorhandenen Runden in chronologischer Reihenfolge Course Handicap, Adjusted Gross Score,
          Score Differential, Netto-Stableford sowie den Handicap-Verlauf neu. Schläge bleiben unverändert.
        </p>
        <RecalcAllRoundsButton />
      </Card>
    </div>
  );
}
