import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRoundById } from "@/queries/rounds";
import { updateRound } from "@/actions/rounds";
import { RoundForm } from "@/components/rounds/round-form";
import { DeleteRoundButton } from "@/components/rounds/delete-round-button";
import { formatDatum } from "@/lib/utils";

export const metadata: Metadata = { title: "Runde bearbeiten" };

export default async function EditRundePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const runde = await getRoundById(id);

  if (!runde) notFound();

  const boundAction = updateRound.bind(null, id);

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
        <DeleteRoundButton id={id} />
      </div>
      <RoundForm action={boundAction} defaultValues={runde} />
    </div>
  );
}
