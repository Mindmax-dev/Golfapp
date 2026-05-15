"use client";

import { useTransition } from "react";
import { deleteClub } from "@/actions/clubs";
import { Button } from "@/components/ui/button";

export function DeleteClubButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Club wirklich löschen?")) return;
    startTransition(() => {
      deleteClub(id);
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
