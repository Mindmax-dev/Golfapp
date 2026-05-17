import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getClubById } from "@/queries/clubs";
import { updateClub } from "@/actions/clubs";
import { ClubForm } from "@/components/bag/club-form";
import { DeleteClubButton } from "@/components/bag/delete-club-button";

export const metadata: Metadata = { title: "Club bearbeiten" };

export default async function EditClubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const club = await getClubById(id);

  if (!club) notFound();

  const boundAction = updateClub.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
            Club bearbeiten
          </h1>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
            {club.club} — {club.modell}
          </p>
        </div>
        <DeleteClubButton id={id} />
      </div>
      <ClubForm
        action={boundAction}
        defaultValues={{
          typ: club.typ,
          club: club.club,
          modell: club.modell,
          loft: club.loft != null ? Number(club.loft) : null,
          durchschnittsDistanz: club.durchschnittsDistanz,
          notizen: club.notizen,
        }}
      />
    </div>
  );
}
