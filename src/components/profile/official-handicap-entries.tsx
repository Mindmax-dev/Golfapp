"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createOfficialHandicapEntry,
  updateOfficialHandicapEntry,
  deleteOfficialHandicapEntry,
} from "@/actions/profile";

export type EntryRow = {
  id: string;
  datum: string; // ISO yyyy-mm-dd
  datumLabel: string;
  handicapIndex: number;
  notiz: string | null;
};

type EditState = { mode: "new" } | { mode: "edit"; id: string } | null;

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

export function OfficialHandicapEntries({ entries }: { entries: EntryRow[] }) {
  const [editing, setEditing] = useState<EditState>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const editingEntry =
    editing?.mode === "edit"
      ? entries.find((e) => e.id === editing.id) ?? null
      : null;

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result =
        editing?.mode === "edit"
          ? await updateOfficialHandicapEntry(editing.id, null, formData)
          : await createOfficialHandicapEntry(null, formData);

      if ("error" in result) {
        setError(
          typeof result.error === "string"
            ? result.error
            : "Bitte Eingaben prüfen."
        );
        return;
      }
      setEditing(null);
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Diesen Eintrag wirklich löschen?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteOfficialHandicapEntry(id);
      if ("error" in result) {
        setError(
          typeof result.error === "string" ? result.error : "Fehler beim Löschen."
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {entries.length === 0
            ? "Noch keine Einträge. Trage deinen Start-Wert (z. B. 54.0) ein."
            : `${entries.length} Eintrag${entries.length === 1 ? "" : "e"}`}
        </p>
        {editing === null && (
          <Button
            size="sm"
            onClick={() => setEditing({ mode: "new" })}
            disabled={pending}
          >
            + Neuer Eintrag
          </Button>
        )}
      </div>

      {editing !== null && (
        <form
          action={handleSubmit}
          className="rounded-lg border border-[var(--color-card-border)] bg-[var(--color-card)] p-4 flex flex-col gap-3"
        >
          <h4 className="text-sm font-medium text-[var(--color-foreground)]">
            {editing.mode === "edit" ? "Eintrag bearbeiten" : "Neuer Eintrag"}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="datum"
              name="datum"
              type="date"
              label="Datum"
              defaultValue={editingEntry?.datum ?? todayIso()}
              required
            />
            <Input
              id="handicapIndex"
              name="handicapIndex"
              type="number"
              step="0.1"
              min={-10}
              max={54}
              label="Handicap Index"
              defaultValue={
                editingEntry?.handicapIndex != null
                  ? editingEntry.handicapIndex.toString()
                  : ""
              }
              required
              placeholder="z. B. 37.6"
            />
          </div>
          <Textarea
            id="notiz"
            name="notiz"
            label="Notiz (optional)"
            placeholder="Z. B. „Nach Turnier am Heimatplatz"
            defaultValue={editingEntry?.notiz ?? ""}
            rows={2}
          />
          {error && (
            <div className="rounded-md bg-[var(--color-destructive)]/10 border border-[var(--color-destructive)]/30 px-3 py-2 text-xs text-[var(--color-destructive)]">
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Wird gespeichert…" : "Speichern"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditing(null);
                setError(null);
              }}
              disabled={pending}
            >
              Abbrechen
            </Button>
          </div>
        </form>
      )}

      {entries.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--color-muted-foreground)] border-b border-[var(--color-card-border)]">
                <th className="text-left py-2 pr-3 font-medium">Datum</th>
                <th className="text-right py-2 pr-3 font-medium">HCP</th>
                <th className="text-left py-2 pr-3 font-medium">Notiz</th>
                <th className="text-right py-2 font-medium">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-[var(--color-card-border)]/40"
                >
                  <td className="py-2 pr-3 text-[var(--color-foreground)]">
                    {entry.datumLabel}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono font-medium text-[var(--color-foreground)]">
                    {entry.handicapIndex.toFixed(1)}
                  </td>
                  <td className="py-2 pr-3 text-[var(--color-muted-foreground)]">
                    {entry.notiz || "–"}
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setError(null);
                          setEditing({ mode: "edit", id: entry.id });
                        }}
                        disabled={pending}
                      >
                        Bearbeiten
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(entry.id)}
                        disabled={pending}
                      >
                        Löschen
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

