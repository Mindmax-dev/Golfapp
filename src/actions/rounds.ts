"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  computeRoundWhsStats,
  calculateInternalHandicapIndex,
  FALLBACK_HANDICAP_INDEX,
} from "@/lib/calculations";
import { getUserProfile } from "@/queries/profile";

type FormState = { error: string | Record<string, string[]> } | null;

const HoleSchema = z.object({
  holeNumber: z.coerce.number().int().min(1).max(9),
  strokes: z.coerce.number().int().min(1).max(20),
  putts: z
    .union([z.literal(""), z.coerce.number().int().min(0).max(20)])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
});

const RoundSchema = z.object({
  datum: z.string().min(1, "Datum ist erforderlich"),
  turnier: z.coerce.boolean().default(false),
  notizen: z.string().optional(),
  links: z.string().optional(),
  holes: z.array(HoleSchema).length(9),
});

async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

function parseFormData(formData: FormData) {
  const holes = Array.from({ length: 9 }, (_, i) => ({
    holeNumber: i + 1,
    strokes: formData.get(`hole_${i + 1}`),
    putts: formData.get(`putts_${i + 1}`),
  }));

  return {
    datum: formData.get("datum") as string,
    turnier: formData.get("turnier") === "on",
    notizen: formData.get("notizen") as string | undefined,
    links: formData.get("links") as string | undefined,
    holes,
  };
}

async function ensureProfileRow(userId: string) {
  await prisma.userProfile.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

async function recalculateUserHandicapIndex(userId: string): Promise<number | null> {
  const rounds = await prisma.round.findMany({
    where: { userId, scoreDifferential: { not: null } },
    orderBy: { datum: "desc" },
    take: 20,
    select: { scoreDifferential: true },
  });

  const differentials = rounds
    .map((r) => (r.scoreDifferential ? Number(r.scoreDifferential) : null))
    .filter((d): d is number => d !== null);

  const newHi = calculateInternalHandicapIndex(differentials);

  await prisma.userProfile.update({
    where: { userId },
    data: { internalHandicapIndex: newHi },
  });

  return newHi;
}

export async function createRound(prevState: FormState, formData: FormData): Promise<FormState> {
  const user = await getAuthUser();
  if (!user) return { error: "Nicht autorisiert" };

  const raw = parseFormData(formData);
  const parsed = RoundSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { datum, turnier, notizen, links, holes } = parsed.data;
  const linksArray = links
    ? links
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
    : [];

  await ensureProfileRow(user.id);
  const profile = await getUserProfile(user.id);
  const hiBefore = profile.effectiveHandicapIndex;

  const whs = computeRoundWhsStats(holes, hiBefore);

  const created = await prisma.round.create({
    data: {
      userId: user.id,
      datum: new Date(datum),
      turnier,
      notizen: notizen || null,
      links: linksArray,
      courseHandicap: whs.courseHandicap,
      adjustedGrossScore: whs.adjustedGrossScore,
      scoreDifferential: whs.scoreDifferential,
      totalStablefordPoints: whs.totalStablefordPoints,
      handicapIndexBeforeRound: hiBefore,
      holes: {
        create: whs.holes.map((h) => ({
          holeNumber: h.holeNumber,
          strokes: h.strokes,
          putts: h.putts,
          handicapStrokes: h.handicapStrokes,
          adjustedScore: h.adjustedScore,
          netScore: h.netScore,
          stablefordPoints: h.stablefordPoints,
        })),
      },
    },
  });

  const newHi = await recalculateUserHandicapIndex(user.id);

  await prisma.round.update({
    where: { id: created.id },
    data: { handicapIndexAfterRound: newHi },
  });

  revalidatePath("/admin/runden");
  revalidatePath("/admin");
  revalidatePath("/admin/profil");
  revalidatePath("/home");
  redirect("/admin/runden");
}

export async function updateRound(
  id: string,
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await getAuthUser();
  if (!user) return { error: "Nicht autorisiert" };

  const existing = await prisma.round.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id)
    return { error: "Runde nicht gefunden" };

  const raw = parseFormData(formData);
  const parsed = RoundSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { datum, turnier, notizen, links, holes } = parsed.data;
  const linksArray = links
    ? links
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
    : [];

  // Reuse the round's original HI if present — keeps history stable across edits.
  let hiBefore: number;
  if (existing.handicapIndexBeforeRound != null) {
    hiBefore = Number(existing.handicapIndexBeforeRound);
  } else {
    await ensureProfileRow(user.id);
    const profile = await getUserProfile(user.id);
    hiBefore = profile.effectiveHandicapIndex;
  }

  const whs = computeRoundWhsStats(holes, hiBefore);

  await prisma.round.update({
    where: { id },
    data: {
      datum: new Date(datum),
      turnier,
      notizen: notizen || null,
      links: linksArray,
      courseHandicap: whs.courseHandicap,
      adjustedGrossScore: whs.adjustedGrossScore,
      scoreDifferential: whs.scoreDifferential,
      totalStablefordPoints: whs.totalStablefordPoints,
      handicapIndexBeforeRound: hiBefore,
      holes: {
        deleteMany: {},
        create: whs.holes.map((h) => ({
          holeNumber: h.holeNumber,
          strokes: h.strokes,
          putts: h.putts,
          handicapStrokes: h.handicapStrokes,
          adjustedScore: h.adjustedScore,
          netScore: h.netScore,
          stablefordPoints: h.stablefordPoints,
        })),
      },
    },
  });

  const newHi = await recalculateUserHandicapIndex(user.id);

  await prisma.round.update({
    where: { id },
    data: { handicapIndexAfterRound: newHi },
  });

  revalidatePath("/admin/runden");
  revalidatePath(`/admin/runden/${id}`);
  revalidatePath("/admin");
  revalidatePath("/admin/profil");
  revalidatePath("/home");
  redirect("/admin/runden");
}

export async function deleteRound(id: string) {
  const user = await getAuthUser();
  if (!user) return { error: "Nicht autorisiert" };

  const existing = await prisma.round.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id)
    return { error: "Runde nicht gefunden" };

  await prisma.round.delete({ where: { id } });

  await recalculateUserHandicapIndex(user.id);

  revalidatePath("/admin/runden");
  revalidatePath("/admin");
  revalidatePath("/admin/profil");
  revalidatePath("/home");
  redirect("/admin/runden");
}

// ─────────────────────────────────────────────────────────────────────────────
// Backfill / recompute helpers — for migrating existing rounds to WHS values.
// ─────────────────────────────────────────────────────────────────────────────

export async function recalculateAllRoundsForUser(startingHi?: number) {
  const user = await getAuthUser();
  if (!user) return { error: "Nicht autorisiert" } as const;

  await ensureProfileRow(user.id);

  // Backfill seed must NOT come from internalHandicapIndex (chicken-and-egg if the
  // last backfill was wrong). Use the explicit starting HI, falling back to 54.0
  // (canonical "newcomer" value per WHS).
  const hiSeed =
    startingHi != null && Number.isFinite(startingHi)
      ? startingHi
      : FALLBACK_HANDICAP_INDEX;

  // Process oldest → newest so each round's "before HI" reflects the running internal HI.
  const rounds = await prisma.round.findMany({
    where: { userId: user.id },
    orderBy: { datum: "asc" },
    include: { holes: { orderBy: { holeNumber: "asc" } } },
  });

  let runningHi = hiSeed;

  for (const round of rounds) {
    const whs = computeRoundWhsStats(
      round.holes.map((h) => ({ holeNumber: h.holeNumber, strokes: h.strokes, putts: h.putts })),
      runningHi
    );

    await prisma.round.update({
      where: { id: round.id },
      data: {
        courseHandicap: whs.courseHandicap,
        adjustedGrossScore: whs.adjustedGrossScore,
        scoreDifferential: whs.scoreDifferential,
        totalStablefordPoints: whs.totalStablefordPoints,
        handicapIndexBeforeRound: runningHi,
        holes: {
          deleteMany: {},
          create: whs.holes.map((h) => ({
            holeNumber: h.holeNumber,
            strokes: h.strokes,
            putts: h.putts,
            handicapStrokes: h.handicapStrokes,
            adjustedScore: h.adjustedScore,
            netScore: h.netScore,
            stablefordPoints: h.stablefordPoints,
          })),
        },
      },
    });

    // Recompute HI from differentials known so far (this round inclusive, latest 20).
    const recent = await prisma.round.findMany({
      where: {
        userId: user.id,
        datum: { lte: round.datum },
        scoreDifferential: { not: null },
      },
      orderBy: { datum: "desc" },
      take: 20,
      select: { scoreDifferential: true },
    });
    const diffs = recent
      .map((r) => (r.scoreDifferential ? Number(r.scoreDifferential) : null))
      .filter((d): d is number => d !== null);
    const newHi = calculateInternalHandicapIndex(diffs) ?? runningHi;

    await prisma.round.update({
      where: { id: round.id },
      data: { handicapIndexAfterRound: newHi },
    });

    runningHi = newHi;
  }

  await prisma.userProfile.update({
    where: { userId: user.id },
    data: { internalHandicapIndex: rounds.length > 0 ? runningHi : null },
  });

  revalidatePath("/admin/runden");
  revalidatePath("/admin");
  revalidatePath("/admin/profil");
  revalidatePath("/home");

  return { ok: true as const, processed: rounds.length, internalHandicapIndex: runningHi };
}
