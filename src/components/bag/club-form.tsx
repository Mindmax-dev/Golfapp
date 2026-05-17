"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { CLUB_TYPEN } from "@/types/club";

type FormState = { error: string | Record<string, string[]> } | null;

export type ClubFormDefaults = {
  typ: string;
  club: string;
  modell: string;
  loft: number | null;
  durchschnittsDistanz: number | null;
  notizen: string | null;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Wird gespeichert..." : "Speichern"}
    </Button>
  );
}

interface ClubFormProps {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  defaultValues?: ClubFormDefaults;
}

export function ClubForm({ action, defaultValues }: ClubFormProps) {
  const [state, formAction] = useActionState(action, null);

  return (
    <form action={formAction} className="flex flex-col gap-5 max-w-lg">
      {state?.error && typeof state.error === "string" && (
        <div className="rounded-md bg-[var(--color-destructive)]/10 border border-[var(--color-destructive)]/30 px-4 py-3 text-sm text-[var(--color-destructive)]">
          {state.error}
        </div>
      )}

      <Select
        id="typ"
        name="typ"
        label="Typ"
        defaultValue={defaultValues?.typ ?? "eisen"}
        options={[...CLUB_TYPEN]}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          id="club"
          name="club"
          label="Club"
          placeholder="7, PW, Driver..."
          defaultValue={defaultValues?.club ?? ""}
          required
        />
        <Input
          id="modell"
          name="modell"
          label="Modell"
          placeholder="Ping i10, Callaway Apex..."
          defaultValue={defaultValues?.modell ?? ""}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          id="loft"
          name="loft"
          type="number"
          label="Loft (°)"
          placeholder="48"
          step="0.5"
          min="0"
          max="70"
          defaultValue={defaultValues?.loft != null ? String(defaultValues.loft) : ""}
        />
        <Input
          id="durchschnittsDistanz"
          name="durchschnittsDistanz"
          type="number"
          label="Ø Distanz (m)"
          placeholder="150"
          min="0"
          max="400"
          defaultValue={defaultValues?.durchschnittsDistanz ?? ""}
        />
      </div>

      <Textarea
        id="notizen"
        name="notizen"
        label="Notizen"
        placeholder="Besonderheiten, Spielgefühl..."
        defaultValue={defaultValues?.notizen ?? ""}
        rows={3}
      />

      <div className="flex gap-3">
        <SubmitButton />
        <Link href="/admin/bag">
          <Button type="button" variant="ghost">Abbrechen</Button>
        </Link>
      </div>
    </form>
  );
}
