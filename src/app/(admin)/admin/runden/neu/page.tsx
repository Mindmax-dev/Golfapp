import type { Metadata } from "next";
import { createRound } from "@/actions/rounds";
import { RoundForm } from "@/components/rounds/round-form";

export const metadata: Metadata = { title: "Neue Runde" };

export default function NeueRundePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
          Neue Runde
        </h1>
        <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
          Ergebnisse einer Golfrunde eingeben
        </p>
      </div>
      <RoundForm action={createRound} />
    </div>
  );
}
