import type { Metadata } from "next";
import { createRound } from "@/actions/rounds";
import { RoundForm } from "@/components/rounds/round-form";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/queries/profile";

export const metadata: Metadata = { title: "Neue Runde" };

export default async function NeueRundePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = await getUserProfile(user!.id);

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
      <RoundForm action={createRound} handicapIndex={profile.effectiveHandicapIndex} />
    </div>
  );
}
