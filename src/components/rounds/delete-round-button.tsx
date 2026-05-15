"use client";

import { useTransition } from "react";
import { deleteRound } from "@/actions/rounds";
import { Button } from "@/components/ui/button";

export function DeleteRoundButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Runde wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) {
      return;
    }
    startTransition(() => {
      deleteRound(id);
    });
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={isPending}
    >
      {isPending ? "Wird gelöscht..." : "Löschen"}
    </Button>
  );
}
