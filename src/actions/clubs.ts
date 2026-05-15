"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

type FormState = { error: string | Record<string, string[]> } | null;

const ClubSchema = z.object({
  typ: z.enum(["eisen", "wedge", "putter", "holz", "hybrid"]),
  hersteller: z.string().min(1, "Hersteller ist erforderlich"),
  modell: z.string().min(1, "Modell ist erforderlich"),
  loft: z.coerce.number().optional().nullable(),
  durchschnittsDistanz: z.coerce.number().int().optional().nullable(),
  notizen: z.string().optional(),
  sortOrder: z.coerce.number().int().default(0),
});

async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function createClub(prevState: FormState, formData: FormData): Promise<FormState> {
  const user = await getAuthUser();
  if (!user) return { error: "Nicht autorisiert" };

  const parsed = ClubSchema.safeParse({
    typ: formData.get("typ"),
    hersteller: formData.get("hersteller"),
    modell: formData.get("modell"),
    loft: formData.get("loft") || null,
    durchschnittsDistanz: formData.get("durchschnittsDistanz") || null,
    notizen: formData.get("notizen"),
    sortOrder: formData.get("sortOrder") || 0,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await prisma.club.create({
    data: {
      userId: user.id,
      ...parsed.data,
    },
  });

  revalidatePath("/admin/bag");
  revalidatePath("/bag");
  redirect("/admin/bag");
}

export async function updateClub(
  id: string,
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await getAuthUser();
  if (!user) return { error: "Nicht autorisiert" };

  const existing = await prisma.club.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id)
    return { error: "Club nicht gefunden" };

  const parsed = ClubSchema.safeParse({
    typ: formData.get("typ"),
    hersteller: formData.get("hersteller"),
    modell: formData.get("modell"),
    loft: formData.get("loft") || null,
    durchschnittsDistanz: formData.get("durchschnittsDistanz") || null,
    notizen: formData.get("notizen"),
    sortOrder: formData.get("sortOrder") || 0,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await prisma.club.update({
    where: { id },
    data: parsed.data,
  });

  revalidatePath("/admin/bag");
  revalidatePath("/bag");
  redirect("/admin/bag");
}

export async function deleteClub(id: string) {
  const user = await getAuthUser();
  if (!user) return { error: "Nicht autorisiert" };

  const existing = await prisma.club.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id)
    return { error: "Club nicht gefunden" };

  await prisma.club.delete({ where: { id } });

  revalidatePath("/admin/bag");
  revalidatePath("/bag");
  redirect("/admin/bag");
}
