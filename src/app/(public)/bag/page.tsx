import type { Metadata } from "next";
import { getGroupedClubs } from "@/queries/clubs";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Mein Bag" };

function ClubRow({
  label,
  loft,
  distanz,
  notizen,
}: {
  label: string;
  loft?: number | null;
  distanz?: number | null;
  notizen?: string | null;
}) {
  return (
    <tr className="border-b border-[var(--color-card-border)]/50">
      <td className="py-2.5 pr-4 font-medium text-[var(--color-foreground)]">{label}</td>
      <td className="py-2.5 pr-4 text-[var(--color-muted-foreground)]">
        {loft != null ? `${loft}°` : "–"}
      </td>
      <td className="py-2.5 text-[var(--color-muted-foreground)]">
        {distanz != null ? `${distanz} m` : "–"}
      </td>
      {notizen && (
        <td className="py-2.5 pl-4 text-xs text-[var(--color-muted-foreground)] max-w-48">
          {notizen}
        </td>
      )}
    </tr>
  );
}

export default async function BagPage() {
  const groups = await getGroupedClubs();
  const hasClubs = Object.values(groups).some((g) => g.length > 0);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
          Mein Bag
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Aktuelle Ausrüstung
        </p>
      </div>

      {!hasClubs && (
        <div className="text-center py-16 text-[var(--color-muted-foreground)]">
          Noch keine Clubs eingetragen.
        </div>
      )}

      {groups.eisen.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Eisen</CardTitle>
          </CardHeader>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-card-border)]">
                <th className="text-left py-2 pr-4 text-[var(--color-muted-foreground)] font-medium">Club</th>
                <th className="text-left py-2 pr-4 text-[var(--color-muted-foreground)] font-medium">Loft</th>
                <th className="text-left py-2 text-[var(--color-muted-foreground)] font-medium">Distanz</th>
              </tr>
            </thead>
            <tbody>
              {groups.eisen.map((c) => (
                <ClubRow
                  key={c.id}
                  label={`${c.hersteller} ${c.modell}`}
                  loft={c.loft ? Number(c.loft) : null}
                  distanz={c.durchschnittsDistanz}
                  notizen={c.notizen}
                />
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {groups.wedge.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Wedges</CardTitle>
          </CardHeader>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-card-border)]">
                <th className="text-left py-2 pr-4 text-[var(--color-muted-foreground)] font-medium">Club</th>
                <th className="text-left py-2 pr-4 text-[var(--color-muted-foreground)] font-medium">Loft</th>
                <th className="text-left py-2 text-[var(--color-muted-foreground)] font-medium">Distanz</th>
              </tr>
            </thead>
            <tbody>
              {groups.wedge.map((c) => (
                <ClubRow
                  key={c.id}
                  label={`${c.hersteller} ${c.modell}`}
                  loft={c.loft ? Number(c.loft) : null}
                  distanz={c.durchschnittsDistanz}
                  notizen={c.notizen}
                />
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {groups.putter.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Putter</CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-3">
            {groups.putter.map((c) => (
              <div key={c.id}>
                <p className="font-medium text-[var(--color-foreground)]">
                  {c.hersteller} {c.modell}
                </p>
                {c.notizen && (
                  <p className="text-sm text-[var(--color-muted-foreground)]">{c.notizen}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {(groups.holz.length > 0 || groups.hybrid.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Hölzer & Hybride</CardTitle>
          </CardHeader>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-card-border)]">
                <th className="text-left py-2 pr-4 text-[var(--color-muted-foreground)] font-medium">Club</th>
                <th className="text-left py-2 pr-4 text-[var(--color-muted-foreground)] font-medium">Loft</th>
                <th className="text-left py-2 text-[var(--color-muted-foreground)] font-medium">Distanz</th>
              </tr>
            </thead>
            <tbody>
              {[...groups.holz, ...groups.hybrid].map((c) => (
                <ClubRow
                  key={c.id}
                  label={`${c.hersteller} ${c.modell}`}
                  loft={c.loft ? Number(c.loft) : null}
                  distanz={c.durchschnittsDistanz}
                  notizen={c.notizen}
                />
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
