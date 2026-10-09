"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { saveSwingAnalysis } from "@/actions/swings";
import {
  getContainedVideoBounds,
  SwingDrawingShape,
} from "@/components/swings/swing-drawing-shape";
import type {
  SwingAnalysis,
  SwingDrawingKind,
  SwingDrawingLayer,
  SwingPoint,
} from "@/lib/swing-analysis";
import { cn } from "@/lib/utils";

type EditorTool = "select" | SwingDrawingKind;
type SaveState = "idle" | "saving" | "saved" | "error";
type DragMode = "start" | "end" | "move";
type CanvasDragMode = "move" | "line-start" | "line-end";

const COLORS = ["#f8fafc", "#facc15", "#38bdf8", "#4ade80", "#fb7185"];

const TOOL_LABELS: Record<EditorTool, string> = {
  select: "Auswahl",
  line: "Linie",
  circle: "Kreis",
  pen: "Stift",
};

const LAYER_LABELS: Record<SwingDrawingKind, string> = {
  line: "Linie",
  circle: "Kreis",
  pen: "Freihand",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "0:00.0";
  const minutes = Math.floor(value / 60);
  const seconds = value - minutes * 60;
  return `${minutes}:${seconds.toFixed(1).padStart(4, "0")}`;
}

function EditorIcon({ name, className = "h-5 w-5" }: { name: EditorTool | "play" | "pause" | "back" | "forward" | "trash" | "save"; className?: string }) {
  const paths: Record<string, ReactNode> = {
    select: <path d="m5 3 6.5 16 2.1-6.2L20 10.5 5 3Z" />,
    line: <path d="M5 19 19 5" />,
    circle: <circle cx="12" cy="12" r="7" />,
    pen: <><path d="m4 20 4.5-1 10-10a2.8 2.8 0 0 0-4-4l-10 10L4 20Z" /><path d="m13 7 4 4" /></>,
    play: <path d="m9 7 8 5-8 5V7Z" fill="currentColor" stroke="none" />,
    pause: <><path d="M9 7v10" /><path d="M15 7v10" /></>,
    back: <><path d="m11 8-4 4 4 4" /><path d="M17 8v8" /></>,
    forward: <><path d="m13 8 4 4-4 4" /><path d="M7 8v8" /></>,
    trash: <><path d="M5 7h14" /><path d="M9 7V4h6v3M8 10v7m4-7v7m4-7v7M7 20h10l1-13H6l1 13Z" /></>,
    save: <><path d="M5 4h12l2 2v14H5V4Z" /><path d="M8 4v6h8V4M8 20v-6h8v6" /></>,
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function EditableLayerControls({
  layer,
  width,
  height,
  selected,
  onPointerDown,
}: {
  layer: SwingDrawingLayer;
  width: number;
  height: number;
  selected: boolean;
  onPointerDown: (
    mode: CanvasDragMode,
    event: ReactPointerEvent<SVGElement>
  ) => void;
}) {
  if (layer.kind === "pen" || layer.points.length < 2) return null;

  const first = {
    x: layer.points[0].x * width,
    y: layer.points[0].y * height,
  };
  const second = {
    x: layer.points[1].x * width,
    y: layer.points[1].y * height,
  };

  if (layer.kind === "line") {
    return (
      <g>
        <line
          x1={first.x}
          y1={first.y}
          x2={second.x}
          y2={second.y}
          stroke="transparent"
          strokeWidth={20}
          strokeLinecap="round"
          pointerEvents="stroke"
          className="cursor-move"
          onPointerDown={(event) => onPointerDown("move", event)}
        />
        {selected && (
          <>
            <circle
              cx={first.x}
              cy={first.y}
              r={7}
              fill="white"
              stroke={layer.color}
              strokeWidth={3}
              className="cursor-grab active:cursor-grabbing"
              onPointerDown={(event) => onPointerDown("line-start", event)}
            />
            <circle
              cx={second.x}
              cy={second.y}
              r={7}
              fill="white"
              stroke={layer.color}
              strokeWidth={3}
              className="cursor-grab active:cursor-grabbing"
              onPointerDown={(event) => onPointerDown("line-end", event)}
            />
          </>
        )}
      </g>
    );
  }

  const radius = Math.hypot(second.x - first.x, second.y - first.y);
  return (
    <g>
      <circle
        cx={first.x}
        cy={first.y}
        r={radius}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        pointerEvents="stroke"
        className="cursor-move"
        onPointerDown={(event) => onPointerDown("move", event)}
      />
      {selected && (
        <circle
          cx={first.x}
          cy={first.y}
          r={6}
          fill="white"
          stroke={layer.color}
          strokeWidth={3}
          className="cursor-grab active:cursor-grabbing"
          onPointerDown={(event) => onPointerDown("move", event)}
        />
      )}
    </g>
  );
}

function RangeTrack({
  start,
  end,
  duration,
  color,
  currentTime,
  selected,
  videoTrack,
  onChange,
  onSelect,
}: {
  start: number;
  end: number;
  duration: number;
  color: string;
  currentTime: number;
  selected?: boolean;
  videoTrack?: boolean;
  onChange: (start: number, end: number) => void;
  onSelect?: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    mode: DragMode;
    pointerId: number;
    x: number;
    start: number;
    end: number;
  } | null>(null);
  const minimum = videoTrack ? 0.25 : 0.1;
  const safeDuration = Math.max(duration, 0.001);
  const left = (start / safeDuration) * 100;
  const width = ((end - start) / safeDuration) * 100;
  const playhead = (currentTime / safeDuration) * 100;

  function beginDrag(mode: DragMode, event: ReactPointerEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      mode,
      pointerId: event.pointerId,
      x: event.clientX,
      start,
      end,
    };
    onSelect?.();
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const rect = trackRef.current?.getBoundingClientRect();
    if (!drag || !rect || event.pointerId !== drag.pointerId) return;
    const delta = ((event.clientX - drag.x) / rect.width) * safeDuration;

    if (drag.mode === "start") {
      onChange(clamp(drag.start + delta, 0, drag.end - minimum), drag.end);
      return;
    }
    if (drag.mode === "end") {
      onChange(drag.start, clamp(drag.end + delta, drag.start + minimum, safeDuration));
      return;
    }

    const length = drag.end - drag.start;
    const nextStart = clamp(drag.start + delta, 0, safeDuration - length);
    onChange(nextStart, nextStart + length);
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  return (
    <div
      ref={trackRef}
      className={cn(
        "relative h-10 overflow-hidden rounded-md border bg-black/25",
        selected ? "border-white/40" : "border-[var(--color-card-border)]"
      )}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClick={onSelect}
    >
      {videoTrack && (
        <div className="absolute inset-0 opacity-35 [background-image:repeating-linear-gradient(90deg,transparent_0,transparent_22px,rgba(255,255,255,.13)_23px,rgba(255,255,255,.13)_24px)]" />
      )}
      <div
        className="absolute bottom-1 top-1 cursor-grab rounded active:cursor-grabbing"
        style={{ left: `${left}%`, width: `${width}%`, backgroundColor: color }}
        onPointerDown={(event) => beginDrag("move", event)}
      >
        <button
          type="button"
          aria-label="Startpunkt verschieben"
          className="absolute inset-y-0 left-0 w-3 cursor-ew-resize rounded-l bg-white/70 hover:bg-white"
          onPointerDown={(event) => beginDrag("start", event)}
        />
        <button
          type="button"
          aria-label="Endpunkt verschieben"
          className="absolute inset-y-0 right-0 w-3 cursor-ew-resize rounded-r bg-white/70 hover:bg-white"
          onPointerDown={(event) => beginDrag("end", event)}
        />
      </div>
      <span
        className="pointer-events-none absolute inset-y-0 z-20 w-px bg-white shadow-[0_0_5px_rgba(255,255,255,.8)]"
        style={{ left: `${clamp(playhead, 0, 100)}%` }}
      />
    </div>
  );
}

export function SwingAnalysisEditor({
  videoId,
  videoUrl,
  initialAnalysis,
}: {
  videoId: string;
  videoUrl: string;
  initialAnalysis: SwingAnalysis | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const timelineSeekRef = useRef<HTMLDivElement>(null);
  const layerDragRef = useRef<{
    pointerId: number;
    layerId: string;
    mode: CanvasDragMode;
    origin: SwingPoint;
    points: SwingPoint[];
    changed: boolean;
  } | null>(null);
  const [duration, setDuration] = useState(initialAnalysis?.duration ?? 0);
  const [trimStart, setTrimStart] = useState(initialAnalysis?.trimStart ?? 0);
  const [trimEnd, setTrimEnd] = useState(initialAnalysis?.trimEnd ?? 0);
  const [currentTime, setCurrentTime] = useState(initialAnalysis?.trimStart ?? 0);
  const [layers, setLayers] = useState<SwingDrawingLayer[]>(initialAnalysis?.layers ?? []);
  const [selectedTool, setSelectedTool] = useState<EditorTool>("select");
  const [selectedColor, setSelectedColor] = useState(COLORS[1]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SwingDrawingLayer | null>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [videoAspect, setVideoAspect] = useState(9 / 16);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId) ?? null;
  const visibleLayers = useMemo(
    () => layers.filter((layer) => currentTime >= layer.startTime && currentTime <= layer.endTime),
    [currentTime, layers]
  );
  const videoBounds = getContainedVideoBounds(
    stageSize.width,
    stageSize.height,
    videoAspect
  );

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
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, button")) return;
      if (event.code === "Space") {
        event.preventDefault();
        togglePlayback();
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedLayerId) {
        event.preventDefault();
        deleteSelectedLayer();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function markChanged() {
    setIsDirty(true);
    setSaveState("idle");
    setSaveError(null);
  }

  function handleMetadata() {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    const nextDuration = video.duration;
    const nextStart = clamp(initialAnalysis?.trimStart ?? 0, 0, Math.max(0, nextDuration - 0.25));
    const nextEnd = clamp(initialAnalysis?.trimEnd ?? nextDuration, nextStart + 0.25, nextDuration);
    setDuration(nextDuration);
    setTrimStart(nextStart);
    setTrimEnd(nextEnd);
    setCurrentTime(nextStart);
    video.currentTime = nextStart;
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      setVideoAspect(video.videoWidth / video.videoHeight);
    }
    setLayers((current) => current.map((layer) => ({
      ...layer,
      startTime: clamp(layer.startTime, 0, Math.max(0, nextDuration - 0.1)),
      endTime: clamp(layer.endTime, Math.min(nextDuration, layer.startTime + 0.1), nextDuration),
    })));
  }

  function seekTo(nextTime: number) {
    const next = clamp(nextTime, 0, duration || 0);
    setCurrentTime(next);
    if (videoRef.current) videoRef.current.currentTime = next;
  }

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video || duration <= 0) return;
    if (!video.paused) {
      video.pause();
      return;
    }
    if (video.currentTime < trimStart || video.currentTime >= trimEnd - 0.02) {
      seekTo(trimStart);
    }
    await video.play();
  }

  function handleTimeUpdate() {
    const video = videoRef.current;
    if (!video) return;
    if (!video.paused && video.currentTime >= trimEnd) {
      video.pause();
      video.currentTime = trimEnd;
    }
    setCurrentTime(video.currentTime);
  }

  function updateTrim(start: number, end: number) {
    setTrimStart(start);
    setTrimEnd(end);
    if (currentTime < start) seekTo(start);
    if (currentTime > end) seekTo(end);
    markChanged();
  }

  function pointFromEvent(event: ReactPointerEvent<SVGSVGElement>): SwingPoint {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
    };
  }

  function pointFromCanvas(
    clientX: number,
    clientY: number,
    canvas: SVGSVGElement
  ): SwingPoint {
    const rect = canvas.getBoundingClientRect();
    return {
      x: clamp((clientX - rect.left) / rect.width, 0, 1),
      y: clamp((clientY - rect.top) / rect.height, 0, 1),
    };
  }

  function beginLayerDrag(
    layer: SwingDrawingLayer,
    mode: CanvasDragMode,
    event: ReactPointerEvent<SVGElement>
  ) {
    const canvas = event.currentTarget.ownerSVGElement;
    if (!canvas) return;
    event.preventDefault();
    event.stopPropagation();
    canvas.setPointerCapture(event.pointerId);
    setSelectedLayerId(layer.id);
    setSelectedTool("select");
    layerDragRef.current = {
      pointerId: event.pointerId,
      layerId: layer.id,
      mode,
      origin: pointFromCanvas(event.clientX, event.clientY, canvas),
      points: layer.points.map((point) => ({ ...point })),
      changed: false,
    };
  }

  function continueLayerDrag(event: ReactPointerEvent<SVGSVGElement>) {
    const drag = layerDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return false;

    const point = pointFromEvent(event);
    let nextPoints: SwingPoint[];

    if (drag.mode === "line-start" || drag.mode === "line-end") {
      const pointIndex = drag.mode === "line-start" ? 0 : 1;
      nextPoints = drag.points.map((original, index) => (
        index === pointIndex ? point : { ...original }
      ));
    } else {
      const minX = Math.min(...drag.points.map((item) => item.x));
      const maxX = Math.max(...drag.points.map((item) => item.x));
      const minY = Math.min(...drag.points.map((item) => item.y));
      const maxY = Math.max(...drag.points.map((item) => item.y));
      const deltaX = clamp(point.x - drag.origin.x, -minX, 1 - maxX);
      const deltaY = clamp(point.y - drag.origin.y, -minY, 1 - maxY);
      nextPoints = drag.points.map((original) => ({
        x: original.x + deltaX,
        y: original.y + deltaY,
      }));
    }

    drag.changed = nextPoints.some((nextPoint, index) => (
      Math.abs(nextPoint.x - drag.points[index].x) > 0.00001 ||
      Math.abs(nextPoint.y - drag.points[index].y) > 0.00001
    ));
    setLayers((current) => current.map((layer) => (
      layer.id === drag.layerId ? { ...layer, points: nextPoints } : layer
    )));
    return true;
  }

  function finishLayerDrag(event: ReactPointerEvent<SVGSVGElement>) {
    const drag = layerDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    layerDragRef.current = null;
    if (drag.changed) markChanged();
    return true;
  }

  function drawingRange() {
    const safeEnd = trimEnd || duration;
    let start = clamp(currentTime, trimStart, Math.max(trimStart, safeEnd - 0.1));
    let end = Math.min(safeEnd, start + 2);
    if (end - start < 0.1) {
      start = Math.max(trimStart, safeEnd - 0.1);
      end = safeEnd;
    }
    return { start, end };
  }

  function beginDrawing(event: ReactPointerEvent<SVGSVGElement>) {
    if (selectedTool === "select") {
      setSelectedLayerId(null);
      return;
    }
    if (duration <= 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    const range = drawingRange();
    setSelectedLayerId(null);
    setDraft({
      id: "draft",
      kind: selectedTool,
      color: selectedColor,
      startTime: range.start,
      endTime: range.end,
      points: [point, point],
    });
  }

  function continueDrawing(event: ReactPointerEvent<SVGSVGElement>) {
    if (!draft || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const point = pointFromEvent(event);
    setDraft((current) => {
      if (!current) return null;
      if (current.kind === "pen") {
        const last = current.points[current.points.length - 1];
        if (Math.hypot(point.x - last.x, point.y - last.y) < 0.003) return current;
        return { ...current, points: [...current.points.slice(0, 1_999), point] };
      }
      return { ...current, points: [current.points[0], point] };
    });
  }

  function finishDrawing(event: ReactPointerEvent<SVGSVGElement>) {
    if (!draft) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const first = draft.points[0];
    const last = draft.points[draft.points.length - 1];
    const pixelDistance = Math.hypot(
      (last.x - first.x) * videoBounds.width,
      (last.y - first.y) * videoBounds.height
    );
    if (pixelDistance >= 4) {
      const nextLayer = { ...draft, id: crypto.randomUUID() };
      setLayers((current) => [...current, nextLayer]);
      setSelectedLayerId(nextLayer.id);
      markChanged();
    }
    setDraft(null);
  }

  function handleCanvasPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!continueLayerDrag(event)) continueDrawing(event);
  }

  function handleCanvasPointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    if (!finishLayerDrag(event)) finishDrawing(event);
  }

  function handleCanvasPointerCancel(event: ReactPointerEvent<SVGSVGElement>) {
    if (!finishLayerDrag(event)) setDraft(null);
  }

  function updateLayer(id: string, changes: Partial<SwingDrawingLayer>) {
    setLayers((current) => current.map((layer) => (
      layer.id === id ? { ...layer, ...changes } : layer
    )));
    markChanged();
  }

  function selectLayer(layer: SwingDrawingLayer) {
    setSelectedLayerId(layer.id);
    setSelectedTool("select");
    if (currentTime < layer.startTime || currentTime > layer.endTime) {
      seekTo(layer.startTime);
    }
  }

  function deleteSelectedLayer() {
    if (!selectedLayerId) return;
    setLayers((current) => current.filter((layer) => layer.id !== selectedLayerId));
    setSelectedLayerId(null);
    markChanged();
  }

  function chooseColor(color: string) {
    setSelectedColor(color);
    if (selectedLayerId) updateLayer(selectedLayerId, { color });
  }

  function seekFromTimeline(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = timelineSeekRef.current?.getBoundingClientRect();
    if (!rect || duration <= 0) return;
    seekTo(((event.clientX - rect.left) / rect.width) * duration);
  }

  async function saveAnalysis() {
    if (duration <= 0 || saveState === "saving") return;
    setSaveState("saving");
    setSaveError(null);
    const analysis: SwingAnalysis = {
      version: 1,
      duration,
      trimStart,
      trimEnd,
      layers,
    };
    const result = await saveSwingAnalysis(videoId, analysis);
    if (!result.success) {
      setSaveState("error");
      setSaveError(result.error);
      return;
    }
    setIsDirty(false);
    setSaveState("saved");
  }

  const rulerMarks = Array.from({ length: 9 }, (_, index) => (duration / 8) * index);

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-card-border)] bg-[oklch(0.115_0_0)] shadow-2xl">
      <div className="flex min-h-14 items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">Schwung-Analyse</p>
            <p className="text-xs text-white/45">
              {layers.length} {layers.length === 1 ? "Zeichenebene" : "Zeichenebenen"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saveState === "saved" && <span className="text-xs text-emerald-300">Gespeichert</span>}
          {saveError && <span className="max-w-72 truncate text-xs text-red-300">{saveError}</span>}
          <button
            type="button"
            onClick={saveAnalysis}
            disabled={!isDirty || duration <= 0 || saveState === "saving"}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <EditorIcon name="save" className="h-4 w-4" />
            {saveState === "saving" ? "Speichert …" : "Analyse speichern"}
          </button>
        </div>
      </div>

      <p className="border-b border-amber-400/20 bg-amber-400/10 px-4 py-2 text-xs text-amber-100 xl:hidden">
        Der Editor ist für einen großen Bildschirm optimiert. Auf kleineren Ansichten kann horizontal gescrollt werden.
      </p>

      <div className="grid min-w-[920px] grid-cols-[78px_minmax(480px,1fr)_250px]">
        <aside className="flex flex-col items-center gap-2 border-r border-white/10 bg-white/[0.025] py-4">
          {(Object.keys(TOOL_LABELS) as EditorTool[]).map((tool) => (
            <button
              key={tool}
              type="button"
              onClick={() => setSelectedTool(tool)}
              title={TOOL_LABELS[tool]}
              aria-label={TOOL_LABELS[tool]}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]",
                selectedTool === tool
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                  : "border-transparent text-white/55 hover:border-white/10 hover:bg-white/5 hover:text-white"
              )}
            >
              <EditorIcon name={tool} />
            </button>
          ))}
          <div className="my-2 h-px w-9 bg-white/10" />
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => chooseColor(color)}
              aria-label={`Farbe ${color}`}
              className={cn(
                "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                selectedColor === color ? "border-white" : "border-transparent"
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </aside>

        <main className="flex min-h-[540px] flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_center,rgba(255,255,255,.06),transparent_62%)] p-5">
          <div
            ref={stageRef}
            className="relative max-h-[52vh] w-auto max-w-full overflow-hidden rounded-lg bg-black shadow-[0_18px_55px_rgba(0,0,0,.55)]"
            style={{ aspectRatio: videoAspect, height: "52vh" }}
          >
            <video
              ref={videoRef}
              src={videoUrl}
              playsInline
              preload="metadata"
              className="h-full w-full object-contain"
              onLoadedMetadata={handleMetadata}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
            <svg
              className={cn(
                "absolute touch-none",
                selectedTool === "select" ? "cursor-default" : "cursor-crosshair"
              )}
              style={{
                left: videoBounds.left,
                top: videoBounds.top,
                width: videoBounds.width,
                height: videoBounds.height,
              }}
              viewBox={`0 0 ${Math.max(videoBounds.width, 1)} ${Math.max(videoBounds.height, 1)}`}
              preserveAspectRatio="none"
              onPointerDown={beginDrawing}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              onPointerCancel={handleCanvasPointerCancel}
            >
              {visibleLayers.map((layer) => (
                <SwingDrawingShape
                  key={layer.id}
                  layer={layer}
                  width={videoBounds.width}
                  height={videoBounds.height}
                  selected={layer.id === selectedLayerId}
                />
              ))}
              {draft && (
                <SwingDrawingShape
                  layer={draft}
                  width={videoBounds.width}
                  height={videoBounds.height}
                  selected
                />
              )}
              {selectedTool === "select" && visibleLayers.map((layer) => (
                <EditableLayerControls
                  key={`controls-${layer.id}`}
                  layer={layer}
                  width={videoBounds.width}
                  height={videoBounds.height}
                  selected={layer.id === selectedLayerId}
                  onPointerDown={(mode, event) => beginLayerDrag(layer, mode, event)}
                />
              ))}
            </svg>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-2 py-1.5 backdrop-blur-sm">
            <button type="button" onClick={() => seekTo(currentTime - 1 / 30)} className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white" aria-label="Ein Bild zurück">
              <EditorIcon name="back" className="h-4 w-4" />
            </button>
            <button type="button" onClick={togglePlayback} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black hover:bg-white/85" aria-label={isPlaying ? "Pause" : "Abspielen"}>
              <EditorIcon name={isPlaying ? "pause" : "play"} className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => seekTo(currentTime + 1 / 30)} className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white" aria-label="Ein Bild vor">
              <EditorIcon name="forward" className="h-4 w-4" />
            </button>
            <span className="min-w-28 px-2 text-center text-xs tabular-nums text-white/65">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </main>

        <aside className="border-l border-white/10 bg-white/[0.025] p-4">
          <h2 className="text-sm font-semibold text-white">Eigenschaften</h2>
          {selectedLayer ? (
            <div className="mt-5 flex flex-col gap-5">
              <div>
                <p className="text-xs text-white/40">Ebene</p>
                <p className="mt-1 text-sm font-medium text-white">{LAYER_LABELS[selectedLayer.kind]}</p>
              </div>
              <div>
                <p className="mb-2 text-xs text-white/40">Farbe</p>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => chooseColor(color)}
                      className={cn("h-7 w-7 rounded-full border-2", selectedLayer.color === color ? "border-white" : "border-transparent")}
                      style={{ backgroundColor: color }}
                      aria-label={`Farbe ${color}`}
                    />
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-white/45">
                  Start
                  <input
                    type="number"
                    min={0}
                    max={selectedLayer.endTime - 0.1}
                    step={0.1}
                    value={selectedLayer.startTime.toFixed(1)}
                    onChange={(event) => updateLayer(selectedLayer.id, {
                      startTime: clamp(Number(event.target.value), 0, selectedLayer.endTime - 0.1),
                    })}
                    className="mt-1.5 w-full rounded-md border border-white/10 bg-black/30 px-2 py-2 text-sm tabular-nums text-white outline-none focus:border-[var(--color-primary)]"
                  />
                </label>
                <label className="text-xs text-white/45">
                  Ende
                  <input
                    type="number"
                    min={selectedLayer.startTime + 0.1}
                    max={duration}
                    step={0.1}
                    value={selectedLayer.endTime.toFixed(1)}
                    onChange={(event) => updateLayer(selectedLayer.id, {
                      endTime: clamp(Number(event.target.value), selectedLayer.startTime + 0.1, duration),
                    })}
                    className="mt-1.5 w-full rounded-md border border-white/10 bg-black/30 px-2 py-2 text-sm tabular-nums text-white outline-none focus:border-[var(--color-primary)]"
                  />
                </label>
              </div>
              <button type="button" onClick={deleteSelectedLayer} className="inline-flex items-center justify-center gap-2 rounded-md border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200 hover:bg-red-400/15">
                <EditorIcon name="trash" className="h-4 w-4" />
                Ebene löschen
              </button>
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-dashed border-white/10 p-4 text-sm leading-6 text-white/45">
              Wähle links ein Werkzeug und zeichne direkt auf das Video. Eine neue Ebene erscheint automatisch in der Timeline.
            </div>
          )}
        </aside>
      </div>

      <section className="border-t border-white/10 bg-[oklch(0.13_0_0)]">
        <div className="overflow-x-auto p-4">
          <div className="min-w-[820px]">
            <div className="grid grid-cols-[132px_minmax(640px,1fr)] items-end gap-3">
              <div className="pb-2 text-xs font-medium text-white/40">Timeline</div>
              <div
                ref={timelineSeekRef}
                className="relative h-8 cursor-ew-resize border-b border-white/10"
                onPointerDown={seekFromTimeline}
              >
                {rulerMarks.map((mark, index) => (
                  <span
                    key={index}
                    className="absolute bottom-1 -translate-x-1/2 text-[10px] tabular-nums text-white/35"
                    style={{ left: `${(index / 8) * 100}%` }}
                  >
                    {formatTime(mark)}
                  </span>
                ))}
              </div>

              <div className="flex h-10 items-center gap-2 text-xs font-medium text-white/70">
                <span className="h-2 w-2 rounded-sm bg-[var(--color-primary)]" />
                Video
              </div>
              <RangeTrack
                start={trimStart}
                end={trimEnd || duration}
                duration={duration}
                currentTime={currentTime}
                color="var(--color-primary)"
                videoTrack
                onChange={updateTrim}
              />

              {layers.map((layer, index) => (
                <div key={`${layer.id}-label`} className="contents">
                  <button
                    type="button"
                    onClick={() => selectLayer(layer)}
                    className={cn(
                      "flex h-10 min-w-0 items-center gap-2 rounded px-1 text-left text-xs",
                      selectedLayerId === layer.id ? "text-white" : "text-white/55 hover:text-white"
                    )}
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: layer.color }} />
                    <span className="truncate">{LAYER_LABELS[layer.kind]} {index + 1}</span>
                  </button>
                  <RangeTrack
                    start={layer.startTime}
                    end={layer.endTime}
                    duration={duration}
                    currentTime={currentTime}
                    color={layer.color}
                    selected={selectedLayerId === layer.id}
                    onSelect={() => selectLayer(layer)}
                    onChange={(startTime, endTime) => updateLayer(layer.id, { startTime, endTime })}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
