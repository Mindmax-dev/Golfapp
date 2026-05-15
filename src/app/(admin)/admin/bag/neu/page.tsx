import type { Metadata } from "next";
import { createClub } from "@/actions/clubs";
import { ClubForm } from "@/components/bag/club-form";

export const metadata: Metadata = { title: "Neuer Club" };

export default function NeuerClubPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
          Neuer Club
        </h1>
        <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
          Club zum Bag hinzufügen
        </p>
      </div>
      <ClubForm action={createClub} />
    </div>
  );
}
