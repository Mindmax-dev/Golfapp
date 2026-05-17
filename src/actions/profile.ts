"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

type ActionResult =
  | { ok: true }
  | { error: string | Record<string, string[]> };

const EntrySchema = z.object({
  datum: z.string().min(1, "Datum ist erforderlich"),
  handicapIndex: z.coerce.number().min(-10).max(54),
  notiz: z.string().optional(),
});

async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

function revalidateAll(): void {
  revalidatePath("/admin/profil");
  revalidatePath("/admin");
  revalidatePath("/home");
}

export async function createOfficialHandicapEntry(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return { error: "Nicht autorisiert" };

  const parsed = EntrySchema.safeParse({
    datum: formData.get("datum"),
    handicapIndex: formData.get("handicapIndex"),
    notiz: formData.get("notiz") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await prisma.officialHandicapEntry.create({
    data: {
      userId: user.id,
      datum: new Date(parsed.data.datum),
      handicapIndex: parsed.data.handicapIndex,
      notiz: parsed.data.notiz || null,
    },
  });

  revalidateAll();
  return { ok: true };
}

export async function updateOfficialHandicapEntry(
  id: string,
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return { error: "Nicht autorisiert" };

  const existing = await prisma.officialHandicapEntry.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) {
    return { error: "Eintrag nicht gefunden" };
  }

  const parsed = EntrySchema.safeParse({
    datum: formData.get("datum"),
    handicapIndex: formData.get("handicapIndex"),
    notiz: formData.get("notiz") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await prisma.officialHandicapEntry.update({
    where: { id },
    data: {
      datum: new Date(parsed.data.datum),
      handicapIndex: parsed.data.handicapIndex,
      notiz: parsed.data.notiz || null,
    },
  });

  revalidateAll();
  return { ok: true };
}

export async function deleteOfficialHandicapEntry(id: string): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return { error: "Nicht autorisiert" };

  const existing = await prisma.officialHandicapEntry.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) {
    return { error: "Eintrag nicht gefunden" };
  }

  await prisma.officialHandicapEntry.delete({ where: { id } });

  revalidateAll();
  return { ok: true };
}
