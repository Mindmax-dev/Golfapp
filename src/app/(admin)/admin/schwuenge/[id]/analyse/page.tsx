import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SwingAnalysisEditor } from "@/components/swings/swing-analysis-editor";
import { parseSwingAnalysis } from "@/lib/swing-analysis";
import { SWING_VIDEOS_BUCKET } from "@/lib/swing-videos";
import { createClient } from "@/lib/supabase/server";
import { formatDatum } from "@/lib/utils";
import { getSwingVideoById } from "@/queries/swings";

export const metadata: Metadata = { title: "Schwung analysieren" };

export default async function SwingAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const video = await getSwingVideoById(id);

  if (!video || video.userId !== user!.id) notFound();

  const publicUrl = supabase.storage
    .from(SWING_VIDEOS_BUCKET)
    .getPublicUrl(video.storagePath).data.publicUrl;

  return (
    <div className="flex w-full max-w-[1600px] flex-col gap-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Link
            href="/admin/schwuenge"
            className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]"
          >
            ← Zurück zur Galerie
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-[var(--color-foreground)]">
            Schwung vom {formatDatum(video.recordedAt)}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Schnitt und Zeichnungen werden nicht-destruktiv gespeichert.
          </p>
        </div>
        <p className="hidden text-xs text-[var(--color-muted-foreground)] lg:block">
          Leertaste: Wiedergabe · Entf: Ebene löschen
        </p>
      </div>

      <SwingAnalysisEditor
        videoId={video.id}
        videoUrl={publicUrl}
        initialAnalysis={parseSwingAnalysis(video.analysisData)}
      />
    </div>
  );
}
