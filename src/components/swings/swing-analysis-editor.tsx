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
import { SwingClubPathShape } from "@/components/swings/swing-club-path-shape";
import {
  createClubheadPath,
  estimateTransitionTime,
} from "@/lib/clubhead-path";
import type {
  SwingAnalysis,
  SwingClubPath,
  SwingDrawingKind,
  SwingDrawingLayer,
  SwingPoint,
  SwingTrackAnchor,
} from "@/lib/swing-analysis";
import { cn } from "@/lib/utils";

type EditorTool = "select" | "track" | SwingDrawingKind;
type SaveState = "idle" | "saving" | "saved" | "error";
type DragMode = "start" | "end" | "move";
type CanvasDragMode =
  | "move"
  | "line-start"
  | "line-end"
  | "angle-vertex"
  | "angle-first"
  | "angle-second";

const COLORS = ["#f8fafc", "#facc15", "#38bdf8", "#4ade80", "#fb7185"];

const TOOL_LABELS: Record<EditorTool, string> = {
  select: "Auswahl",
  track: "Schwungspur markieren",
  line: "Linie",
  circle: "Kreis",
  angle: "Winkelmesser",
  pen: "Stift",
};

const LAYER_LABELS: Record<SwingDrawingKind, string> = {
  line: "Linie",
  circle: "Kreis",
  angle: "Winkelmesser",
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
    track: <><circle cx="12" cy="12" r="4" /><path d="M12 3v3m0 12v3M3 12h3m12 0h3" /></>,
    line: <path d="M5 19 19 5" />,
    circle: <circle cx="12" cy="12" r="7" />,
    angle: <><path d="M5 18 10 7l9 11" /><path d="M8.2 14.1a5 5 0 0 1 5.8 0" /></>,
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

  if (layer.kind === "angle" && layer.points.length >= 3) {
    const third = {
      x: layer.points[2].x * width,
      y: layer.points[2].y * height,
    };
    const handles = [
      { point: first, mode: "angle-vertex" as const },
      { point: second, mode: "angle-first" as const },
      { point: third, mode: "angle-second" as const },
    ];
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
        <line
          x1={first.x}
          y1={first.y}
          x2={third.x}
          y2={third.y}
          stroke="transparent"
          strokeWidth={20}
          strokeLinecap="round"
          pointerEvents="stroke"
          className="cursor-move"
          onPointerDown={(event) => onPointerDown("move", event)}
        />
        {selected && handles.map(({ point, mode }) => (
          <circle
            key={mode}
            cx={point.x}
            cy={point.y}
            r={7}
            fill="white"
            stroke={layer.color}
            strokeWidth={3}
            className="cursor-grab active:cursor-grabbing"
            onPointerDown={(event) => onPointerDown(mode, event)}
          />
        ))}
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
  readOnly,
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
  readOnly?: boolean;
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
        className={cn(
          "absolute bottom-1 top-1 rounded",
          readOnly ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
        )}
        style={{ left: `${left}%`, width: `${width}%`, background: color }}
        onPointerDown={readOnly ? undefined : (event) => beginDrag("move", event)}
      >
        {!readOnly && (
          <>
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
          </>
        )}
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
  const [clubPaths, setClubPaths] = useState<SwingClubPath[]>(initialAnalysis?.clubPaths ?? []);
  const [selectedTool, setSelectedTool] = useState<EditorTool>("select");
  const [selectedColor, setSelectedColor] = useState(COLORS[1]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [replacingPathId, setReplacingPathId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SwingDrawingLayer | null>(null);
  const [angleDraft, setAngleDraft] = useState<SwingDrawingLayer | null>(null);
  const [angleHoverPoint, setAngleHoverPoint] = useState<SwingPoint | null>(null);
  const [trackingAnchors, setTrackingAnchors] = useState<SwingTrackAnchor[]>([]);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [videoAspect, setVideoAspect] = useState(9 / 16);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId) ?? null;
  const selectedPath = clubPaths.find((path) => path.id === selectedPathId) ?? null;
  const visibleLayers = useMemo(
    () => layers.filter((layer) => currentTime >= layer.startTime && currentTime <= layer.endTime),
    [currentTime, layers]
  );
  const visiblePaths = useMemo(
    () => clubPaths.filter((path) => (
      path.id !== replacingPathId &&
      currentTime >= path.startTime &&
      currentTime <= path.endTime
    )),
    [clubPaths, currentTime, replacingPathId]
  );
  const anglePreview = useMemo(() => {
    if (!angleDraft || !angleHoverPoint || angleDraft.points.length >= 3) return angleDraft;
    return {
      ...angleDraft,
      points: [...angleDraft.points, angleHoverPoint],
    };
  }, [angleDraft, angleHoverPoint]);
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
      if (event.key === "Escape" && angleDraft) {
        setAngleDraft(null);
        setAngleHoverPoint(null);
      }
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        (selectedLayerId || selectedPathId)
      ) {
        event.preventDefault();
        if (selectedPathId) deleteSelectedPath();
        else deleteSelectedLayer();
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
    setClubPaths((current) => current
      .filter((path) => path.startTime < nextDuration)
      .map((path) => ({
        ...path,
        endTime: Math.min(path.endTime, nextDuration),
        transitionTime: clamp(
          path.transitionTime,
          path.startTime,
          Math.min(path.endTime, nextDuration)
        ),
        anchors: path.anchors.filter((anchor) => anchor.time <= nextDuration),
        points: path.points.filter((point) => point.time <= nextDuration),
      }))
      .filter((path) => path.points.length >= 3 && path.startTime < path.endTime));
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
    setSelectedPathId(null);
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

    const pointIndexes: Partial<Record<CanvasDragMode, number>> = {
      "line-start": 0,
      "line-end": 1,
      "angle-vertex": 0,
      "angle-first": 1,
      "angle-second": 2,
    };
    const pointIndex = pointIndexes[drag.mode];

    if (pointIndex !== undefined) {
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

  function addTrackingAnchor(point: SwingPoint) {
    const video = videoRef.current;
    if (!video || duration <= 0) return;
    video.pause();
    const anchor: SwingTrackAnchor = { ...point, time: currentTime };
    setTrackingAnchors((current) => {
      const matchingIndex = current.findIndex(
        (item) => Math.abs(item.time - anchor.time) < 0.025
      );
      const next = matchingIndex >= 0
        ? current.map((item, index) => (index === matchingIndex ? anchor : item))
        : [...current, anchor];
      return next.sort((first, second) => first.time - second.time).slice(0, 30);
    });
    setTrackingError(null);
  }

  function createPathFromAnchors() {
    const video = videoRef.current;
    const anchors = [...trackingAnchors].sort((first, second) => first.time - second.time);
    if (!video || duration <= 0 || anchors.length < 2) {
      setTrackingError("Markiere den Schlägerkopf in mindestens zwei verschiedenen Bildern.");
      return;
    }
    if (anchors.some((anchor, index) => index > 0 && anchor.time - anchors[index - 1].time < 0.08)) {
      setTrackingError("Zwischen zwei Markierungen müssen mindestens einige Videoframes liegen.");
      return;
    }

    video.pause();
    setSelectedLayerId(null);
    setSelectedPathId(null);
    setTrackingError(null);
    const points = createClubheadPath(anchors);
    if (points.length > 4_000) {
      setTrackingError("Der markierte Videobereich ist für einen einzelnen Pfad zu lang.");
      return;
    }
    const path: SwingClubPath = {
      id: replacingPathId ?? crypto.randomUUID(),
      startTime: anchors[0].time,
      endTime: anchors[anchors.length - 1].time,
      transitionTime: estimateTransitionTime(points),
      anchors,
      interpolatedSegments: [],
      points,
    };
    setClubPaths((current) => replacingPathId
      ? current.map((item) => (item.id === replacingPathId ? path : item))
      : [...current, path]
    );
    setReplacingPathId(null);
    setSelectedPathId(path.id);
    setSelectedTool("select");
    setTrackingAnchors([]);
    markChanged();
  }

  function reusePathAnchors(path: SwingClubPath) {
    if (path.anchors.length < 2) return;
    videoRef.current?.pause();
    setTrackingAnchors(path.anchors.map((anchor) => ({ ...anchor })));
    setReplacingPathId(path.id);
    setSelectedPathId(null);
    setSelectedLayerId(null);
    setSelectedTool("track");
    setTrackingError(null);
    seekTo(path.anchors[0].time);
  }

  function beginDrawing(event: ReactPointerEvent<SVGSVGElement>) {
    if (selectedTool === "select") {
      setSelectedLayerId(null);
      setSelectedPathId(null);
      return;
    }
    if (duration <= 0) return;
    if (selectedTool === "track") {
      addTrackingAnchor(pointFromEvent(event));
      return;
    }
    if (selectedTool === "angle") {
      const point = pointFromEvent(event);
      if (!angleDraft) {
        const range = drawingRange();
        videoRef.current?.pause();
        setSelectedLayerId(null);
        setSelectedPathId(null);
        setAngleDraft({
          id: "angle-draft",
          kind: "angle",
          color: selectedColor,
          startTime: range.start,
          endTime: range.end,
          points: [point],
        });
        setAngleHoverPoint(point);
        return;
      }
      if (angleDraft.points.length === 1) {
        setAngleDraft({ ...angleDraft, points: [...angleDraft.points, point] });
        setAngleHoverPoint(point);
        return;
      }

      const vertex = angleDraft.points[0];
      const firstEnd = angleDraft.points[1];
      const firstLength = Math.hypot(
        (firstEnd.x - vertex.x) * videoBounds.width,
        (firstEnd.y - vertex.y) * videoBounds.height
      );
      const secondLength = Math.hypot(
        (point.x - vertex.x) * videoBounds.width,
        (point.y - vertex.y) * videoBounds.height
      );
      if (firstLength < 4 || secondLength < 4) return;

      const nextLayer: SwingDrawingLayer = {
        ...angleDraft,
        id: crypto.randomUUID(),
        points: [vertex, firstEnd, point],
      };
      setLayers((current) => [...current, nextLayer]);
      setSelectedLayerId(nextLayer.id);
      setAngleDraft(null);
      setAngleHoverPoint(null);
      markChanged();
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    const range = drawingRange();
    setSelectedLayerId(null);
    setSelectedPathId(null);
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
    if (selectedTool === "angle" && angleDraft) {
      setAngleHoverPoint(pointFromEvent(event));
      return;
    }
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
    setSelectedPathId(null);
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

  function selectPath(path: SwingClubPath) {
    setSelectedPathId(path.id);
    setSelectedLayerId(null);
    setSelectedTool("select");
    if (currentTime < path.startTime || currentTime > path.endTime) {
      seekTo(path.startTime);
    }
  }

  function updatePath(id: string, changes: Partial<SwingClubPath>) {
    setClubPaths((current) => current.map((path) => (
      path.id === id ? { ...path, ...changes } : path
    )));
    markChanged();
  }

  function deleteSelectedPath() {
    if (!selectedPathId) return;
    setClubPaths((current) => current.filter((path) => path.id !== selectedPathId));
    setSelectedPathId(null);
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
      clubPaths,
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
              {layers.length + clubPaths.length}{" "}
              {layers.length + clubPaths.length === 1 ? "Analyseebene" : "Analyseebenen"}
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
              onClick={() => {
                setSelectedTool(tool);
                setTrackingError(null);
                if (tool !== "angle") {
                  setAngleDraft(null);
                  setAngleHoverPoint(null);
                }
                if (tool === "track" || tool === "angle") {
                  setSelectedLayerId(null);
                  setSelectedPathId(null);
                } else if (replacingPathId) {
                  setReplacingPathId(null);
                  setTrackingAnchors([]);
                }
              }}
              title={TOOL_LABELS[tool]}
              aria-label={TOOL_LABELS[tool]}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-35",
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
              {visiblePaths.map((path) => (
                <SwingClubPathShape
                  key={path.id}
                  path={path}
                  width={videoBounds.width}
                  height={videoBounds.height}
                  selected={path.id === selectedPathId}
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
              {anglePreview && (
                <SwingDrawingShape
                  layer={anglePreview}
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
              {selectedTool === "track" && trackingAnchors.length > 0 && (
                <g className="pointer-events-none">
                  {trackingAnchors.length > 1 && (
                    <polyline
                      points={trackingAnchors.map((anchor) => (
                        `${anchor.x * videoBounds.width},${anchor.y * videoBounds.height}`
                      )).join(" ")}
                      fill="none"
                      stroke="#facc15"
                      strokeWidth={2}
                      strokeDasharray="5 6"
                      opacity={0.6}
                    />
                  )}
                  {trackingAnchors.map((anchor, index) => (
                    <g key={`${anchor.time}-${index}`}>
                      <circle
                        cx={anchor.x * videoBounds.width}
                        cy={anchor.y * videoBounds.height}
                        r={11}
                        fill="#facc15"
                        stroke="white"
                        strokeWidth={2}
                        opacity={Math.abs(anchor.time - currentTime) < 0.04 ? 1 : 0.82}
                      />
                      <text
                        x={anchor.x * videoBounds.width}
                        y={anchor.y * videoBounds.height + 3.5}
                        fill="#111827"
                        fontSize={10}
                        fontWeight={800}
                        textAnchor="middle"
                      >
                        {index + 1}
                      </text>
                    </g>
                  ))}
                </g>
              )}
            </svg>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-2 py-1.5 backdrop-blur-sm">
            <button type="button" onClick={() => seekTo(currentTime - 1 / 30)} className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white" aria-label="Ein Bild zurück">
              <EditorIcon name="back" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={togglePlayback}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black hover:bg-white/85"
              aria-label={isPlaying ? "Pause" : "Abspielen"}
            >
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
          {selectedPath ? (
            <div className="mt-5 flex flex-col gap-5">
              <div>
                <p className="text-xs text-white/40">Ebene</p>
                <p className="mt-1 text-sm font-medium text-white">Schlägerkopf-Pfad</p>
              </div>
              <div className="space-y-2 text-xs text-white/60">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2"><span className="h-1 w-5 rounded bg-yellow-400" />Rückschwung</span>
                  <span>{formatTime(selectedPath.startTime)}–{formatTime(selectedPath.transitionTime)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2"><span className="h-1 w-5 rounded bg-rose-500" />Abschwung</span>
                  <span>{formatTime(selectedPath.transitionTime)}–{formatTime(selectedPath.endTime)}</span>
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-xs font-medium text-white">Übergang korrigieren</p>
                <p className="mt-1 text-xs leading-5 text-white/45">
                  Fahre zum höchsten Punkt des Rückschwungs und übernimm das aktuelle Bild.
                </p>
                <button
                  type="button"
                  onClick={() => updatePath(selectedPath.id, {
                    transitionTime: clamp(currentTime, selectedPath.startTime, selectedPath.endTime),
                  })}
                  className="mt-3 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-white hover:bg-white/10"
                >
                  Aktuelles Bild übernehmen
                </button>
              </div>
              {selectedPath.interpolatedSegments.length > 0 && (
                <p className="rounded-md border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
                  {selectedPath.interpolatedSegments.length}{" "}
                  {selectedPath.interpolatedSegments.length === 1 ? "Abschnitt wurde" : "Abschnitte wurden"}{" "}
                  direkt zwischen deinen Schlüsselbildern interpoliert, weil dort keine stabilen Bildmerkmale erkennbar waren.
                </p>
              )}
              <p className="text-xs leading-5 text-white/40">
                {selectedPath.anchors.length > 0 && `${selectedPath.anchors.length} Schlüsselbilder · `}
                {selectedPath.points.length} Kurvenpunkte
              </p>
              {selectedPath.anchors.length >= 2 && (
                <button
                  type="button"
                  onClick={() => reusePathAnchors(selectedPath)}
                  className="rounded-md border border-sky-400/20 bg-sky-400/10 px-3 py-2 text-sm font-medium text-sky-100 hover:bg-sky-400/15"
                >
                  Schlüsselbilder bearbeiten
                </button>
              )}
              <button type="button" onClick={deleteSelectedPath} className="inline-flex items-center justify-center gap-2 rounded-md border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200 hover:bg-red-400/15">
                <EditorIcon name="trash" className="h-4 w-4" />
                Pfad löschen
              </button>
            </div>
          ) : selectedLayer ? (
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
            <div className="mt-5 flex flex-col gap-3">
              <div className={cn(
                "rounded-lg border border-dashed p-4 text-sm leading-6",
                selectedTool === "track"
                  ? "border-yellow-400/35 bg-yellow-400/[0.06] text-yellow-50/75"
                  : selectedTool === "angle"
                    ? "border-sky-400/35 bg-sky-400/[0.06] text-sky-50/75"
                    : "border-white/10 text-white/45"
              )}>
                {selectedTool === "track"
                  ? "Pausiere an mehreren Stellen und klicke jeweils mittig auf den Schlägerkopf. Aus diesen exakten Positionen entsteht eine glatte, statische Schwungspur."
                  : selectedTool === "angle"
                    ? `Setze zuerst den Winkelpunkt und danach die beiden Endpunkte der Schenkel. ${angleDraft?.points.length ?? 0}/3 Punkte gesetzt.`
                  : "Wähle links ein Werkzeug und zeichne direkt auf das Video. Eine neue Ebene erscheint automatisch in der Timeline."}
              </div>
              {selectedTool === "track" && trackingAnchors.length > 0 && (
                <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-white">
                      {trackingAnchors.length} {trackingAnchors.length === 1 ? "Schlüsselbild" : "Schlüsselbilder"}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setTrackingAnchors([]);
                        setReplacingPathId(null);
                      }}
                      className="text-xs text-white/40 hover:text-white disabled:opacity-35"
                    >
                      Alle löschen
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {trackingAnchors.map((anchor, index) => (
                      <button
                        key={`${anchor.time}-${index}`}
                        type="button"
                        onClick={() => seekTo(anchor.time)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-yellow-400/25 bg-yellow-400/10 py-1 pl-1 pr-2 text-xs text-yellow-100 hover:bg-yellow-400/15 disabled:opacity-35"
                      >
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-400 font-bold text-black">
                          {index + 1}
                        </span>
                        {formatTime(anchor.time)}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setTrackingAnchors((current) => current.slice(0, -1))}
                    className="mt-3 text-xs text-white/45 hover:text-white disabled:opacity-35"
                  >
                    Letztes Schlüsselbild entfernen
                  </button>
                </div>
              )}
              {selectedTool === "track" && (
                <button
                  type="button"
                  onClick={createPathFromAnchors}
                  disabled={trackingAnchors.length < 2}
                  className="rounded-md bg-yellow-400 px-3 py-2.5 text-sm font-semibold text-black hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Schwungspur aus {trackingAnchors.length} Schlüsselbildern erstellen
                </button>
              )}
              {trackingError && (
                <p role="alert" className="rounded-md border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs leading-5 text-red-200">
                  {trackingError}
                </p>
              )}
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

              {clubPaths.map((path, index) => (
                <div key={`${path.id}-label`} className="contents">
                  <button
                    type="button"
                    onClick={() => selectPath(path)}
                    className={cn(
                      "flex h-10 min-w-0 items-center gap-2 rounded px-1 text-left text-xs",
                      selectedPathId === path.id ? "text-white" : "text-white/55 hover:text-white"
                    )}
                  >
                    <span className="flex shrink-0 gap-0.5">
                      <span className="h-2 w-2 rounded-l-full bg-yellow-400" />
                      <span className="h-2 w-2 rounded-r-full bg-rose-500" />
                    </span>
                    <span className="truncate">Schlägerkopf {index + 1}</span>
                  </button>
                  <RangeTrack
                    start={path.startTime}
                    end={path.endTime}
                    duration={duration}
                    currentTime={currentTime}
                    color="linear-gradient(90deg, #facc15, #f43f5e)"
                    selected={selectedPathId === path.id}
                    readOnly
                    onSelect={() => selectPath(path)}
                    onChange={() => undefined}
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
