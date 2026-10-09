"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  ALLOWED_SWING_VIDEO_TYPES,
  MAX_SWING_VIDEO_SIZE,
  SWING_VIDEOS_BUCKET,
} from "@/lib/swing-videos";
import { SwingAnalysisSchema, type SwingAnalysis } from "@/lib/swing-analysis";

type RegisterSwingVideoResult =
  | { success: true }
  | { success: false; error: string };

const RegisterSwingVideoSchema = z.object({
  storagePath: z.string().min(1).max(500),
  recordedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  originalName: z.string().min(1).max(255),
});

export async function registerSwingVideo(input: {
  storagePath: string;
  recordedAt: string;
  originalName: string;
}): Promise<RegisterSwingVideoResult> {
  const parsed = RegisterSwingVideoSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Die Angaben zum Video sind ungültig." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Bitte melde dich erneut an." };
  }

  const pathParts = parsed.data.storagePath.split("/");
  if (pathParts.length !== 2 || pathParts[0] !== user.id || !pathParts[1]) {
    return { success: false, error: "Der Speicherpfad ist ungültig." };
  }

  const [folder, fileName] = pathParts;
  const { data: objects, error: storageError } = await supabase.storage
    .from(SWING_VIDEOS_BUCKET)
    .list(folder, { limit: 10, search: fileName });

  const storedObject = objects?.find((object) => object.name === fileName);
  if (storageError || !storedObject) {
    return { success: false, error: "Das hochgeladene Video wurde nicht gefunden." };
  }

  const metadata = storedObject.metadata as
    | { size?: number; mimetype?: string }
    | null;
  const sizeBytes = metadata?.size;
  const mimeType = metadata?.mimetype;

  if (
    typeof sizeBytes !== "number" ||
    sizeBytes <= 0 ||
    sizeBytes > MAX_SWING_VIDEO_SIZE ||
    !mimeType ||
    !ALLOWED_SWING_VIDEO_TYPES.includes(
      mimeType as (typeof ALLOWED_SWING_VIDEO_TYPES)[number]
    )
  ) {
    return { success: false, error: "Das Videoformat oder die Dateigröße ist ungültig." };
  }

  const recordedAt = new Date(`${parsed.data.recordedAt}T00:00:00.000Z`);
  if (Number.isNaN(recordedAt.getTime())) {
    return { success: false, error: "Das Aufnahmedatum ist ungültig." };
  }

  try {
    await prisma.swingVideo.create({
      data: {
        userId: user.id,
        storagePath: parsed.data.storagePath,
        recordedAt,
        originalName: parsed.data.originalName,
        mimeType,
        sizeBytes: BigInt(sizeBytes),
      },
    });
  } catch {
    return { success: false, error: "Das Video konnte nicht gespeichert werden." };
  }

  revalidatePath("/schwuenge");
  revalidatePath("/admin/schwuenge");
  return { success: true };
}

export async function saveSwingAnalysis(
  videoId: string,
  input: SwingAnalysis
): Promise<RegisterSwingVideoResult> {
  const parsedId = z.string().min(1).max(100).safeParse(videoId);
  const parsedAnalysis = SwingAnalysisSchema.safeParse(input);
  if (!parsedId.success || !parsedAnalysis.success) {
    return { success: false, error: "Die Analyse enthält ungültige Daten." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Bitte melde dich erneut an." };
  }

  let updated: { count: number };
  try {
    updated = await prisma.swingVideo.updateMany({
      where: { id: parsedId.data, userId: user.id },
      data: { analysisData: parsedAnalysis.data },
    });
  } catch {
    return { success: false, error: "Die Analyse konnte nicht gespeichert werden." };
  }

  if (updated.count === 0) {
    return { success: false, error: "Das Video wurde nicht gefunden." };
  }

  revalidatePath(`/admin/schwuenge/${parsedId.data}/analyse`);
  revalidatePath("/admin/schwuenge");
  revalidatePath("/schwuenge");
  return { success: true };
}

export async function deleteSwingVideo(
  videoId: string
): Promise<RegisterSwingVideoResult> {
  const parsedId = z.string().min(1).max(100).safeParse(videoId);
  if (!parsedId.success) {
    return { success: false, error: "Das Video konnte nicht gefunden werden." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Bitte melde dich erneut an." };
  }

  let video: { storagePath: string } | null;
  try {
    video = await prisma.swingVideo.findFirst({
      where: { id: parsedId.data, userId: user.id },
      select: { storagePath: true },
    });
  } catch {
    return { success: false, error: "Das Video konnte nicht geladen werden." };
  }
  if (!video) {
    return { success: false, error: "Das Video wurde nicht gefunden." };
  }

  const pathParts = video.storagePath.split("/");
  if (pathParts.length !== 2 || pathParts[0] !== user.id || !pathParts[1]) {
    return { success: false, error: "Der Speicherpfad des Videos ist ungültig." };
  }

  let storageError: { message: string } | null = null;
  try {
    const result = await supabase.storage
      .from(SWING_VIDEOS_BUCKET)
      .remove([video.storagePath]);
    storageError = result.error;
  } catch {
    storageError = { message: "Storage request failed" };
  }
  if (storageError) {
    return {
      success: false,
      error: "Das Video konnte nicht aus dem Speicher gelöscht werden.",
    };
  }

  try {
    await prisma.swingVideo.deleteMany({
      where: {
        id: parsedId.data,
        userId: user.id,
        storagePath: video.storagePath,
      },
    });
  } catch {
    return {
      success: false,
      error: "Das Video wurde aus dem Speicher entfernt, aber der Galerie-Eintrag konnte nicht gelöscht werden. Bitte versuche es erneut.",
    };
  }

  revalidatePath("/admin/schwuenge");
  revalidatePath("/schwuenge");
  return { success: true };
}
