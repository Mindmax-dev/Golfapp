"use client";

import { useTransition } from "react";
import { moveClub } from "@/actions/clubs";
import { Button } from "@/components/ui/button";

interface ReorderButtonsProps {
  id: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export function ReorderButtons({ id, canMoveUp, canMoveDown }: ReorderButtonsProps) {
  const [isPending, startTransition] = useTransition();

  function handleMove(direction: "up" | "down") {
    startTransition(() => {
      moveClub(id, direction);
    });
  }

  return (
    <div className="flex flex-col">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Nach oben"
        disabled={!canMoveUp || isPending}
        onClick={() => handleMove("up")}
        className="px-2 py-0.5 h-6"
      >
        ▲
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Nach unten"
        disabled={!canMoveDown || isPending}
        onClick={() => handleMove("down")}
        className="px-2 py-0.5 h-6"
      >
        ▼
      </Button>
    </div>
  );
}
