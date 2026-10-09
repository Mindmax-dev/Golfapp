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
