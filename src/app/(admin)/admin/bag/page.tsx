import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAllClubs } from "@/queries/clubs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteClubButton } from "@/components/bag/delete-club-button";
import { ReorderButtons } from "@/components/bag/reorder-buttons";
import { CLUB_TYPEN } from "@/types/club";

export const metadata: Metadata = { title: "Bag" };

export default async function AdminBagPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const clubs = await getAllClubs(user!.id);

  const typLabel = (typ: string) =>
    CLUB_TYPEN.find((t) => t.value === typ)?.label ?? typ;

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Bag</h1>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
            {clubs.length} Club{clubs.length !== 1 ? "s" : ""} im Bag
          </p>
        </div>
        <Link href="/admin/bag/neu">
          <Button>+ Neuer Club</Button>
        </Link>
      </div>

      {clubs.length === 0 ? (
        <Card className="text-center py-16">
          <p className="text-[var(--color-muted-foreground)]">
            Noch keine Clubs eingetragen.
          </p>
          <Link href="/admin/bag/neu" className="mt-4 inline-block">
            <Button>Ersten Club hinzufügen</Button>
          </Link>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-card-border)]">
                  <th className="py-3 pr-2 w-10"></th>
                  <th className="text-left py-3 pr-4 text-[var(--color-muted-foreground)] font-medium">Typ</th>
                  <th className="text-left py-3 pr-4 text-[var(--color-muted-foreground)] font-medium">Club</th>
                  <th className="text-left py-3 pr-4 text-[var(--color-muted-foreground)] font-medium">Modell</th>
                  <th className="text-right py-3 pr-4 text-[var(--color-muted-foreground)] font-medium">Loft</th>
                  <th className="text-right py-3 pr-4 text-[var(--color-muted-foreground)] font-medium">Ø Distanz</th>
                  <th className="text-right py-3 text-[var(--color-muted-foreground)] font-medium">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {clubs.map((club, index) => (
                  <tr
                    key={club.id}
                    className="border-b border-[var(--color-card-border)]/50 hover:bg-[var(--color-muted)]/30 transition-colors"
                  >
                    <td className="py-2 pr-2">
                      <ReorderButtons
                        id={club.id}
                        canMoveUp={index > 0}
                        canMoveDown={index < clubs.length - 1}
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant="default">{typLabel(club.typ)}</Badge>
                    </td>
                    <td className="py-3 pr-4 font-medium text-[var(--color-foreground)]">
                      {club.club}
                    </td>
                    <td className="py-3 pr-4 text-[var(--color-foreground)]">
                      {club.modell}
                      {club.notizen && (
                        <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5 truncate max-w-48">
                          {club.notizen}
                        </p>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-right text-[var(--color-muted-foreground)]">
                      {club.loft != null ? `${club.loft}°` : "–"}
                    </td>
                    <td className="py-3 pr-4 text-right text-[var(--color-muted-foreground)]">
                      {club.durchschnittsDistanz != null ? `${club.durchschnittsDistanz} m` : "–"}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/bag/${club.id}`}>
                          <Button variant="ghost" size="sm">Bearbeiten</Button>
                        </Link>
                        <DeleteClubButton id={club.id} />
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
