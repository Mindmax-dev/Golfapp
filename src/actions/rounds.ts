"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

type FormState = { error: string | Record<string, string[]> } | null;

const HoleSchema = z.object({
  holeNumber: z.coerce.number().int().min(1).max(9),
  strokes: z.coerce.number().int().min(1).max(20),
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
  }));

  return {
    datum: formData.get("datum") as string,
    turnier: formData.get("turnier") === "on",
    notizen: formData.get("notizen") as string | undefined,
    links: formData.get("links") as string | undefined,
    holes,
  };
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

  await prisma.round.create({
    data: {
      userId: user.id,
      datum: new Date(datum),
      turnier,
      notizen: notizen || null,
      links: linksArray,
      holes: { create: holes },
    },
  });

  revalidatePath("/admin/runden");
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

  await prisma.round.update({
    where: { id },
    data: {
      datum: new Date(datum),
      turnier,
      notizen: notizen || null,
      links: linksArray,
      holes: {
        deleteMany: {},
        create: holes,
      },
    },
  });

  revalidatePath("/admin/runden");
  revalidatePath(`/admin/runden/${id}`);
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

  revalidatePath("/admin/runden");
  revalidatePath("/home");
  redirect("/admin/runden");
}
