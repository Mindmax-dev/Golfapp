"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteSwingVideo, registerSwingVideo } from "@/actions/swings";
import {
  getContainedVideoBounds,
  SwingDrawingShape,
} from "@/components/swings/swing-drawing-shape";
import type { SwingAnalysis } from "@/lib/swing-analysis";
import { createClient } from "@/lib/supabase/client";
import {
  ALLOWED_SWING_VIDEO_TYPES,
  MAX_SWING_VIDEO_SIZE,
  SWING_VIDEOS_BUCKET,
} from "@/lib/swing-videos";

export type SwingVideoItem = {
  id: string;
  url: string;
  recordedAt: string;
  originalName: string;
  canEdit: boolean;
  analysis: SwingAnalysis | null;
};

type SwingGalleryProps = {
  videos: SwingVideoItem[];
  manageUserId?: string | null;
};

function Icon({ name, className = "h-5 w-5" }: { name: "play" | "upload" | "edit" | "close" | "video" | "trash"; className?: string }) {
  const paths = {
    play: <path d="m9 7 8 5-8 5V7Z" fill="currentColor" stroke="none" />,
    upload: <><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" /><path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" /></>,
    edit: <><path d="m14.5 5.5 4 4" /><path d="M4 20h4l10.5-10.5a2.83 2.83 0 0 0-4-4L4 16v4Z" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    video: <><rect x="3" y="5" width="14" height="14" rx="2" /><path d="m17 10 4-2v8l-4-2" /></>,
    trash: <><path d="M5 7h14" /><path d="M9 7V4h6v3M8 10v7m4-7v7m4-7v7M7 20h10l1-13H6l1 13Z" /></>,
  };

  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

function localDateValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function extensionFor(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension && ["mp4", "mov", "webm"].includes(extension)) return extension;
  if (file.type === "video/quicktime") return "mov";
  if (file.type === "video/webm") return "webm";
  return "mp4";
}

function AnalyzedVideoPlayer({ video }: { video: SwingVideoItem }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(video.analysis?.trimStart ?? 0);
  const [playbackRange, setPlaybackRange] = useState({
    start: video.analysis?.trimStart ?? 0,
    end: video.analysis?.trimEnd ?? Number.POSITIVE_INFINITY,
  });
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [videoAspect, setVideoAspect] = useState(9 / 16);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(([entry]) => {
      setStageSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isPlaying) return;

    let animationFrame = 0;
    const synchronizePlayback = () => {
      const element = videoRef.current;
      if (!element || element.paused) return;

      if (element.currentTime >= playbackRange.end) {
        element.pause();
        element.currentTime = playbackRange.end;
        setCurrentTime(playbackRange.end);
        return;
      }

      setCurrentTime(element.currentTime);
      animationFrame = requestAnimationFrame(synchronizePlayback);
    };

    animationFrame = requestAnimationFrame(synchronizePlayback);
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying, playbackRange.end]);

  function handleMetadata() {
    const element = videoRef.current;
    if (!element || !Number.isFinite(element.duration)) return;
    const start = Math.min(
      Math.max(video.analysis?.trimStart ?? 0, 0),
      Math.max(0, element.duration - 0.05)
    );
    const end = Math.min(
      Math.max(video.analysis?.trimEnd ?? element.duration, start + 0.05),
      element.duration
    );
    setPlaybackRange({ start, end });
    setCurrentTime(start);
    element.currentTime = start;
    if (element.videoWidth > 0 && element.videoHeight > 0) {
      setVideoAspect(element.videoWidth / element.videoHeight);
    }
  }

  function handlePlay() {
    const element = videoRef.current;
    if (!element) return;
    if (
      element.currentTime < playbackRange.start ||
      element.currentTime >= playbackRange.end - 0.02
    ) {
      element.currentTime = playbackRange.start;
      setCurrentTime(playbackRange.start);
    }
    setIsPlaying(true);
  }

  function handleTimeUpdate() {
    const element = videoRef.current;
    if (!element) return;
    if (!element.paused && element.currentTime >= playbackRange.end) {
      element.pause();
      element.currentTime = playbackRange.end;
    }
    setCurrentTime(element.currentTime);
  }

  function handlePause() {
    const element = videoRef.current;
    setIsPlaying(false);
    if (element) setCurrentTime(element.currentTime);
  }

  function keepInsideTrim() {
    const element = videoRef.current;
    if (!element) return;
    if (element.currentTime < playbackRange.start) {
      element.currentTime = playbackRange.start;
    } else if (element.currentTime > playbackRange.end) {
      element.currentTime = playbackRange.end;
    }
  }

  const visibleLayers = video.analysis?.layers.filter(
    (layer) => currentTime >= layer.startTime && currentTime <= layer.endTime
  ) ?? [];
  const videoBounds = getContainedVideoBounds(
    stageSize.width,
    stageSize.height,
    videoAspect
  );

  return (
    <div
      ref={stageRef}
      className="relative max-h-[calc(100vh-5rem)] max-w-[min(100vw-1.5rem,32rem)] overflow-hidden rounded-xl bg-black shadow-2xl"
      style={{ aspectRatio: videoAspect, height: "calc(100vh - 5rem)" }}
    >
      <video
        ref={videoRef}
        src={video.url}
        controls
        autoPlay
        playsInline
        className="h-full w-full bg-black object-contain"
        onLoadedMetadata={handleMetadata}
        onPlay={handlePlay}
        onPause={handlePause}
        onTimeUpdate={handleTimeUpdate}
        onSeeking={keepInsideTrim}
      />
      {visibleLayers.length > 0 && (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{
            left: videoBounds.left,
            top: videoBounds.top,
            width: videoBounds.width,
            height: videoBounds.height,
          }}
          viewBox={`0 0 ${Math.max(videoBounds.width, 1)} ${Math.max(videoBounds.height, 1)}`}
          preserveAspectRatio="none"
        >
          {visibleLayers.map((layer) => (
            <SwingDrawingShape
              key={layer.id}
              layer={layer}
              width={videoBounds.width}
              height={videoBounds.height}
            />
          ))}
        </svg>
      )}
    </div>
  );
}

export function SwingGallery({ videos, manageUserId }: SwingGalleryProps) {
  const router = useRouter();
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [playingVideo, setPlayingVideo] = useState<SwingVideoItem | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [recordedAt, setRecordedAt] = useState(localDateValue);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingVideo, setDeletingVideo] = useState<SwingVideoItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!playingVideo && !uploadOpen && !deletingVideo) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !uploading && !deleting) {
        setPlayingVideo(null);
        setUploadOpen(false);
        setDeletingVideo(null);
        setDeleteError(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [playingVideo, uploadOpen, deletingVideo, uploading, deleting]);

  function closeUpload() {
    if (uploading) return;
    setUploadOpen(false);
    setFile(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(nextFile: File | undefined) {
    setError(null);
    if (!nextFile) {
      setFile(null);
      return;
    }
    if (!ALLOWED_SWING_VIDEO_TYPES.includes(nextFile.type as (typeof ALLOWED_SWING_VIDEO_TYPES)[number])) {
      setError("Bitte wähle ein MP4-, MOV- oder WebM-Video aus.");
      setFile(null);
      return;
    }
    if (nextFile.size > MAX_SWING_VIDEO_SIZE) {
      setError("Das Video darf höchstens 50 MB groß sein.");
      setFile(null);
      return;
    }
    setFile(nextFile);
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!manageUserId || !file || !recordedAt) return;

    setUploading(true);
    setError(null);
    const storagePath = `${manageUserId}/${crypto.randomUUID()}.${extensionFor(file)}`;
    const supabase = createClient();

    const { error: uploadError } = await supabase.storage
      .from(SWING_VIDEOS_BUCKET)
      .upload(storagePath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      setError(`Upload fehlgeschlagen: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    const result = await registerSwingVideo({
      storagePath,
      recordedAt,
      originalName: file.name,
    });

    if (!result.success) {
      await supabase.storage.from(SWING_VIDEOS_BUCKET).remove([storagePath]);
      setError(result.error);
      setUploading(false);
      return;
    }

    setUploading(false);
    closeUpload();
    router.refresh();
  }

  function askToDelete(video: SwingVideoItem) {
    setDeleteError(null);
    setDeletingVideo(video);
  }

  function closeDelete() {
    if (deleting) return;
    setDeletingVideo(null);
    setDeleteError(null);
  }

  async function handleDelete() {
    if (!deletingVideo || deleting) return;
    setDeleting(true);
    setDeleteError(null);

    let result: Awaited<ReturnType<typeof deleteSwingVideo>>;
    try {
      result = await deleteSwingVideo(deletingVideo.id);
    } catch {
      setDeleteError("Das Video konnte nicht gelöscht werden. Bitte versuche es erneut.");
      setDeleting(false);
      return;
    }
    if (!result.success) {
      setDeleteError(result.error);
      setDeleting(false);
      return;
    }

    if (playingVideo?.id === deletingVideo.id) setPlayingVideo(null);
    setDeletingVideo(null);
    setDeleting(false);
    router.refresh();
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-7 lg:grid-cols-4">
        {manageUserId && (
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="group flex aspect-[9/16] min-h-0 flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-[var(--color-primary)]/60 bg-[var(--color-primary)]/[0.045] px-4 text-center transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] transition-transform group-hover:-translate-y-0.5">
              <Icon name="upload" className="h-6 w-6" />
            </span>
            <span className="mt-4 text-sm font-semibold text-[var(--color-foreground)]">Schwung hochladen</span>
            <span className="mt-1 max-w-32 text-xs leading-5 text-[var(--color-muted-foreground)]">Hochkant · bis 50 MB</span>
          </button>
        )}

        {videos.map((video) => (
          <article key={video.id} className="min-w-0">
            <button
              type="button"
              onClick={() => setPlayingVideo(video)}
              aria-label={`Schwung vom ${video.recordedAt} abspielen`}
              className="group relative block aspect-[9/16] w-full overflow-hidden rounded-xl bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]"
            >
              <video
                src={`${video.url}#t=${Math.max(video.analysis?.trimStart ?? 0.001, 0.001)}`}
                preload="metadata"
                muted
                playsInline
                className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-75"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />
              <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/45 text-white backdrop-blur-sm transition-transform group-hover:scale-105">
                <Icon name="play" className="ml-0.5 h-6 w-6" />
              </span>
            </button>
            <div className="flex items-center justify-between gap-2 px-0.5 pt-2.5">
              <time className="truncate text-sm font-medium text-[var(--color-foreground)]">{video.recordedAt}</time>
              {video.canEdit && (
                <div className="flex shrink-0 items-center gap-1">
                  <Link
                    href={`/admin/schwuenge/${video.id}/analyse`}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                  >
                    <Icon name="edit" className="h-3.5 w-3.5" />
                    Bearbeiten
                  </Link>
                  <button
                    type="button"
                    onClick={() => askToDelete(video)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:bg-[var(--color-destructive)]/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-destructive)]"
                    aria-label={`Schwung vom ${video.recordedAt} löschen`}
                    title="Löschen"
                  >
                    <Icon name="trash" className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      {playingVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Schwung vom ${playingVideo.recordedAt}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPlayingVideo(null);
          }}
        >
          <div className="relative flex max-h-full max-w-full flex-col items-center">
            <button
              type="button"
              onClick={() => setPlayingVideo(null)}
              autoFocus
              className="absolute -right-1 -top-1 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] sm:-right-12 sm:top-0"
              aria-label="Video schließen"
            >
              <Icon name="close" />
            </button>
            <AnalyzedVideoPlayer key={playingVideo.id} video={playingVideo} />
            <p className="mt-3 text-sm font-medium text-white">{playingVideo.recordedAt}</p>
          </div>
        </div>
      )}

      {deletingVideo && manageUserId && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-swing-title"
          aria-describedby="delete-swing-description"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDelete();
          }}
        >
          <div className="w-full max-w-md rounded-t-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5 shadow-2xl sm:rounded-2xl sm:p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-destructive)]/10 text-red-400">
              <Icon name="trash" />
            </div>
            <h2 id="delete-swing-title" className="mt-4 text-lg font-semibold text-[var(--color-foreground)]">
              Video löschen?
            </h2>
            <p id="delete-swing-description" className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
              Der Schwung vom {deletingVideo.recordedAt}, das Originalvideo und die gespeicherte Analyse werden dauerhaft entfernt.
            </p>
            <p className="mt-2 truncate text-xs text-[var(--color-muted-foreground)]/75">
              {deletingVideo.originalName}
            </p>

            {deleteError && (
              <p role="alert" className="mt-4 rounded-md border border-[var(--color-destructive)]/40 bg-[var(--color-destructive)]/10 px-3 py-2 text-sm text-red-300">
                {deleteError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDelete}
                disabled={deleting}
                autoFocus
                className="rounded-md px-4 py-2 text-sm font-medium text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex min-w-32 items-center justify-center gap-2 rounded-md bg-[var(--color-destructive)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />}
                {deleting ? "Wird gelöscht" : "Endgültig löschen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {uploadOpen && manageUserId && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeUpload();
          }}
        >
          <form onSubmit={handleUpload} className="w-full max-w-md rounded-t-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5 shadow-2xl sm:rounded-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="upload-title" className="text-lg font-semibold text-[var(--color-foreground)]">Neuen Schwung hochladen</h2>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">MP4, MOV oder WebM · maximal 50 MB</p>
              </div>
              <button type="button" onClick={closeUpload} disabled={uploading} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]" aria-label="Upload schließen">
                <Icon name="close" />
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-5">
              <div>
                <label htmlFor={fileInputId} className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]">Video</label>
                <label htmlFor={fileInputId} className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-card-border)] bg-[var(--color-background)]/40 px-4 py-5 text-center hover:border-[var(--color-primary)]">
                  <Icon name="video" className="h-7 w-7 text-[var(--color-primary)]" />
                  <span className="mt-2 max-w-full truncate text-sm font-medium text-[var(--color-foreground)]">{file ? file.name : "Video auswählen"}</span>
                  {file && <span className="mt-1 text-xs text-[var(--color-muted-foreground)]">{(file.size / 1024 / 1024).toFixed(1).replace(".", ",")} MB</span>}
                </label>
                <input
                  ref={fileInputRef}
                  id={fileInputId}
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                  className="sr-only"
                  onChange={(event) => handleFileChange(event.target.files?.[0])}
                  disabled={uploading}
                  required
                />
              </div>

              <div>
                <label htmlFor="swing-recorded-at" className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]">Aufnahmedatum</label>
                <input
                  id="swing-recorded-at"
                  type="date"
                  value={recordedAt}
                  max={localDateValue()}
                  onChange={(event) => setRecordedAt(event.target.value)}
                  disabled={uploading}
                  required
                  className="w-full rounded-md border border-[var(--color-card-border)] bg-[var(--color-background)] px-3 py-2.5 text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
            </div>

            {error && <p role="alert" className="mt-4 rounded-md border border-[var(--color-destructive)]/40 bg-[var(--color-destructive)]/10 px-3 py-2 text-sm text-red-300">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={closeUpload} disabled={uploading} className="rounded-md px-4 py-2 text-sm font-medium text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] disabled:opacity-50">Abbrechen</button>
              <button type="submit" disabled={!file || !recordedAt || uploading} className="inline-flex min-w-36 items-center justify-center gap-2 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50">
                {uploading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />}
                {uploading ? "Wird hochgeladen" : "Video hochladen"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
