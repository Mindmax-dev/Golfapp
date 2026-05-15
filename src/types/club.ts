import type { Club } from "@prisma/client";

export type { Club };

export const CLUB_TYPEN = [
  { value: "eisen", label: "Eisen" },
  { value: "wedge", label: "Wedge" },
  { value: "putter", label: "Putter" },
  { value: "holz", label: "Holz" },
  { value: "hybrid", label: "Hybrid" },
] as const;

export type ClubTyp = (typeof CLUB_TYPEN)[number]["value"];
