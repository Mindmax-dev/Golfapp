import type { Metadata } from "next";
import { SwingGallery } from "@/components/swings/swing-gallery";
import { SWING_VIDEOS_BUCKET } from "@/lib/swing-videos";
import { createClient } from "@/lib/supabase/server";
import { formatDatum } from "@/lib/utils";
import { getSwingVideos } from "@/queries/swings";
import { parseSwingAnalysis } from "@/lib/swing-analysis";

export const metadata: Metadata = { title: "Schwünge" };

export default async function SwingsPage() {
  const supabase = await createClient();
  const videos = await getSwingVideos();

  const galleryVideos = videos.map((video) => ({
    id: video.id,
    url: supabase.storage
      .from(SWING_VIDEOS_BUCKET)
      .getPublicUrl(video.storagePath).data.publicUrl,
    recordedAt: formatDatum(video.recordedAt),
    originalName: video.originalName,
    canEdit: false,
    analysis: parseSwingAnalysis(video.analysisData),
  }));

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 sm:gap-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Schwünge</h1>
          <p className="mt-1 max-w-xl text-sm text-[var(--color-muted-foreground)]">
            Aufnahmen vergleichen, Details erkennen und Fortschritte festhalten.
          </p>
        </div>
        {galleryVideos.length > 0 && (
          <p className="shrink-0 pb-0.5 text-sm tabular-nums text-[var(--color-muted-foreground)]">
            {galleryVideos.length} {galleryVideos.length === 1 ? "Aufnahme" : "Aufnahmen"}
          </p>
        )}
      </div>

      {galleryVideos.length === 0 && (
        <p className="-mt-3 text-sm text-[var(--color-muted-foreground)]">
          Noch keine Schwünge gespeichert.
        </p>
      )}

      <SwingGallery videos={galleryVideos} />
    </div>
  );
}
