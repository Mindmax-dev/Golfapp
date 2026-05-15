import type { Round, RoundHole } from "@/generated/prisma/client";

export type RoundWithHoles = Round & {
  holes: RoundHole[];
};

export type RoundWithStats = RoundWithHoles & {
  totalStrokes: number;
  uberPar: number;
  stablefordPunkte: number;
};
