"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { recalculateAllRoundsForUser } from "@/actions/rounds";

export function RecalcAllRoundsButton({
  defaultStartingHi = 54,
}: {
  defaultStartingHi?: number;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [startingHi, setStartingHi] = useState<string>(String(defaultStartingHi));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="startingHi"
            className="text-sm font-medium text-[var(--color-foreground)]"
          >
            Start-Handicap (für älteste Runde)
          </label>
          <input
            id="startingHi"
            type="number"
            step="0.1"
            min={-10}
            max={54}
            value={startingHi}
            onChange={(e) => setStartingHi(e.target.value)}
            className="w-32 rounded-md border border-[var(--color-card-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => {
            setMessage(null);
            const parsed = parseFloat(startingHi);
            const seed = Number.isFinite(parsed) ? parsed : undefined;
            startTransition(async () => {
              const result = await recalculateAllRoundsForUser(seed);
              if ("error" in result) {
                setMessage(`Fehler: ${result.error}`);
              } else {
                setMessage(
                  `${result.processed} Runde${result.processed === 1 ? "" : "n"} neu berechnet. Interner HI: ${
                    result.internalHandicapIndex?.toFixed(1) ?? "–"
                  }`
                );
              }
            });
          }}
        >
          {pending ? "Wird berechnet…" : "Alle Runden neu berechnen"}
        </Button>
      </div>
      <p className="text-xs text-[var(--color-muted-foreground)] max-w-prose">
        Der Start-Wert wird als HI vor der ältesten Runde verwendet. Mit jeder berechneten Runde wird der
        interne HI aus den besten Differentials der letzten 20 Runden neu ermittelt.
      </p>
      {message && (
        <p className="text-xs text-[var(--color-foreground)]">{message}</p>
      )}
    </div>
  );
}
