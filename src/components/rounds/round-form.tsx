"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { HoleInputGrid } from "./hole-input-grid";

type FormState = { error: string | Record<string, string[]> } | null;

export type RoundFormDefaults = {
  datum: Date | string;
  turnier?: boolean;
  notizen?: string | null;
  links?: string[];
  holes?: Array<{ holeNumber: number; strokes: number; putts: number | null }>;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Wird gespeichert..." : "Speichern"}
    </Button>
  );
}

interface RoundFormProps {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  defaultValues?: RoundFormDefaults;
  handicapIndex: number;
}

export function RoundForm({ action, defaultValues, handicapIndex }: RoundFormProps) {
  const [state, formAction] = useActionState(action, null);

  const defaultHoles: Record<number, { strokes: number; putts: number | null }> = {};
  if (defaultValues?.holes) {
    defaultValues.holes.forEach((h) => {
      defaultHoles[h.holeNumber] = { strokes: h.strokes, putts: h.putts ?? null };
    });
  }

  const defaultDatum = defaultValues?.datum
    ? new Date(defaultValues.datum).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  return (
    <form action={formAction} className="flex flex-col gap-6 max-w-3xl">
      {state?.error && typeof state.error === "string" && (
        <div className="rounded-md bg-[var(--color-destructive)]/10 border border-[var(--color-destructive)]/30 px-4 py-3 text-sm text-[var(--color-destructive)]">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input
          id="datum"
          name="datum"
          type="date"
          label="Datum"
          defaultValue={defaultDatum}
          required
        />
        <div className="flex flex-col gap-1.5 justify-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="turnier"
              defaultChecked={defaultValues?.turnier ?? false}
              className="h-4 w-4 rounded border-[var(--color-card-border)] accent-[var(--color-primary)]"
            />
            <span className="text-sm font-medium text-[var(--color-foreground)]">
              Turnierrunde
            </span>
          </label>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
        <h3 className="text-sm font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide mb-4">
          Loch-Ergebnisse
        </h3>
        <HoleInputGrid defaultValues={defaultHoles} handicapIndex={handicapIndex} />
      </div>

      <Textarea
        id="notizen"
        name="notizen"
        label="Notizen"
        placeholder="Eindrücke, Wetter, besondere Momente..."
        defaultValue={defaultValues?.notizen ?? ""}
        rows={3}
      />

      <Textarea
        id="links"
        name="links"
        label="Links (ein Link pro Zeile)"
        placeholder="https://18birdies.com/...\nhttps://..."
        defaultValue={defaultValues?.links?.join("\n") ?? ""}
        rows={3}
      />

      <div className="flex gap-3">
        <SubmitButton />
        <Link href="/admin/runden">
          <Button type="button" variant="ghost">
            Abbrechen
          </Button>
        </Link>
      </div>
    </form>
  );
}
