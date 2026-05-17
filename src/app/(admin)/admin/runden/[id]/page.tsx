import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getRoundById } from "@/queries/rounds";
import { updateRound } from "@/actions/rounds";
import { RoundForm } from "@/components/rounds/round-form";
import { DeleteRoundButton } from "@/components/rounds/delete-round-button";
import { formatDatum } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  HOLES,
  effectiveHandicapIndex,
  FALLBACK_HANDICAP_INDEX,
} from "@/lib/calculations";
import { getUserProfile } from "@/queries/profile";
import { signDisplay } from "@/lib/utils";

export const metadata: Metadata = { title: "Runde bearbeiten" };

export default async function EditRundePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const runde = await getRoundById(id);

  if (!runde) notFound();

  const profile = await getUserProfile(runde.userId);
  // Prefer the round's recorded "before" HI so editing keeps the same context.
  const hiForForm =
    runde.handicapIndexBeforeRound != null
      ? Number(runde.handicapIndexBeforeRound)
      : effectiveHandicapIndex({
          internalHandicapIndex: profile.internalHandicapIndex,
          officialHandicapIndex: profile.officialHandicapIndex,
        }) ?? FALLBACK_HANDICAP_INDEX;

  const boundAction = updateRound.bind(null, id);

  const totalStrokes = runde.holes.reduce((s, h) => s + h.strokes, 0);
  const uberPar = totalStrokes - HOLES.reduce((s, h) => s + h.par, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
            Runde bearbeiten
          </h1>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
            {formatDatum(runde.datum)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/runden">
            <Button variant="ghost">Zurück</Button>
          </Link>
          <DeleteRoundButton id={id} />
        </div>
      </div>

      <RoundDetailSummary
        runde={runde}
        totalStrokes={totalStrokes}
        uberPar={uberPar}
      />

      <RoundDetailHoleBreakdown holes={runde.holes} />

      <Card>
        <CardHeader>
          <CardTitle>Bearbeiten</CardTitle>
        </CardHeader>
        <RoundForm
          action={boundAction}
          defaultValues={{
            datum: runde.datum,
            turnier: runde.turnier,
            notizen: runde.notizen,
            links: runde.links,
            holes: runde.holes.map((h) => ({
              holeNumber: h.holeNumber,
              strokes: h.strokes,
              putts: h.putts ?? null,
            })),
          }}
          handicapIndex={hiForForm}
        />
      </Card>
    </div>
  );
}

function RoundDetailSummary({
  runde,
  totalStrokes,
  uberPar,
}: {
  runde: NonNullable<Awaited<ReturnType<typeof getRoundById>>>;
  totalStrokes: number;
  uberPar: number;
}) {
  const stats: Array<{ label: string; value: string; tone?: "primary" }> = [
    { label: "Bruttoschläge", value: String(totalStrokes) },
    { label: "Über Par", value: signDisplay(uberPar), tone: uberPar <= 0 ? "primary" : undefined },
    {
      label: "Adjusted Gross Score",
      value: runde.adjustedGrossScore != null ? String(runde.adjustedGrossScore) : "–",
    },
    {
      label: "Course Handicap",
      value: runde.courseHandicap != null ? String(runde.courseHandicap) : "–",
    },
    {
      label: "Score Differential",
      value:
        runde.scoreDifferential != null
          ? Number(runde.scoreDifferential).toFixed(1)
          : "–",
    },
    {
      label: "Stableford (netto)",
      value:
        runde.totalStablefordPoints != null
          ? String(runde.totalStablefordPoints)
          : "–",
    },
    {
      label: "HI vor Runde",
      value:
        runde.handicapIndexBeforeRound != null
          ? Number(runde.handicapIndexBeforeRound).toFixed(1)
          : "–",
    },
    {
      label: "HI nach Runde",
      value:
        runde.handicapIndexAfterRound != null
          ? Number(runde.handicapIndexAfterRound).toFixed(1)
          : "–",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Übersicht</CardTitle>
      </CardHeader>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col">
            <span className="text-xs text-[var(--color-muted-foreground)]">{s.label}</span>
            <span
              className={`text-xl font-bold font-mono ${
                s.tone === "primary"
                  ? "text-[var(--color-primary)]"
                  : "text-[var(--color-foreground)]"
              }`}
            >
              {s.value}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-[var(--color-muted-foreground)] leading-relaxed">
        Brutto = tatsächliche Schläge. Adjusted Gross Score wird ausschließlich für die Handicap-Berechnung verwendet
        (Net Double Bogey pro Loch). Der interne Handicap Index ist eine Annäherung und nicht DGV-offiziell.
      </p>
    </Card>
  );
}

function RoundDetailHoleBreakdown({
  holes,
}: {
  holes: NonNullable<Awaited<ReturnType<typeof getRoundById>>>["holes"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Loch-Aufstellung</CardTitle>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[var(--color-muted-foreground)] border-b border-[var(--color-card-border)]">
              <th className="text-left py-2 pr-2 font-medium">Loch</th>
              <th className="text-center py-2 pr-2 font-medium">Par</th>
              <th className="text-center py-2 pr-2 font-medium" title="Offizieller Stroke Index">SI</th>
              <th className="text-center py-2 pr-2 font-medium" title="Normalisiert auf 9 Loch">SI-9</th>
              <th className="text-center py-2 pr-2 font-medium" title="Vorgabe">HCP</th>
              <th className="text-center py-2 pr-2 font-medium">Schläge</th>
              <th className="text-center py-2 pr-2 font-medium" title="Net Double Bogey gekappt">AGS</th>
              <th className="text-center py-2 pr-2 font-medium">Putts</th>
              <th className="text-center py-2 font-medium">Netto-SP</th>
            </tr>
          </thead>
          <tbody>
            {HOLES.map((cfg) => {
              const h = holes.find((x) => x.holeNumber === cfg.number);
              return (
                <tr key={cfg.number} className="border-b border-[var(--color-card-border)]/40">
                  <td className="py-2 pr-2 text-[var(--color-foreground)]">
                    <span className="text-[var(--color-muted-foreground)] mr-2 text-xs">{cfg.number}.</span>
                    {cfg.name}
                  </td>
                  <td className="py-2 pr-2 text-center text-[var(--color-muted-foreground)]">{cfg.par}</td>
                  <td className="py-2 pr-2 text-center text-[var(--color-muted-foreground)]">{cfg.strokeIndex18}</td>
                  <td className="py-2 pr-2 text-center text-[var(--color-muted-foreground)]">{cfg.strokeIndex9}</td>
                  <td className="py-2 pr-2 text-center font-mono text-[var(--color-foreground)]">
                    {h?.handicapStrokes != null
                      ? h.handicapStrokes > 0 ? `+${h.handicapStrokes}` : "0"
                      : "–"}
                  </td>
                  <td className="py-2 pr-2 text-center font-mono font-medium text-[var(--color-foreground)]">
                    {h?.strokes ?? "–"}
                  </td>
                  <td className="py-2 pr-2 text-center font-mono text-[var(--color-muted-foreground)]">
                    {h?.adjustedScore ?? "–"}
                  </td>
                  <td className="py-2 pr-2 text-center font-mono text-[var(--color-muted-foreground)]">
                    {h?.putts ?? "–"}
                  </td>
                  <td className="py-2 text-center font-mono text-[var(--color-foreground)]">
                    {h?.stablefordPoints ?? "–"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
