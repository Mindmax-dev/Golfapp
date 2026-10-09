import type { SwingDrawingLayer } from "@/lib/swing-analysis";

export function getContainedVideoBounds(
  stageWidth: number,
  stageHeight: number,
  videoAspect: number
) {
  if (stageWidth <= 0 || stageHeight <= 0 || videoAspect <= 0) {
    return { left: 0, top: 0, width: 0, height: 0 };
  }

  const stageAspect = stageWidth / stageHeight;
  if (stageAspect > videoAspect) {
    const width = stageHeight * videoAspect;
    return {
      left: (stageWidth - width) / 2,
      top: 0,
      width,
      height: stageHeight,
    };
  }

  const height = stageWidth / videoAspect;
  return {
    left: 0,
    top: (stageHeight - height) / 2,
    width: stageWidth,
    height,
  };
}

export function SwingDrawingShape({
  layer,
  width,
  height,
  selected,
}: {
  layer: SwingDrawingLayer;
  width: number;
  height: number;
  selected?: boolean;
}) {
  const coordinates = layer.points.map((point) => ({
    x: point.x * width,
    y: point.y * height,
  }));
  if (coordinates.length < 2) return null;

  const common = {
    fill: "none",
    stroke: layer.color,
    strokeWidth: 3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    style: selected
      ? { filter: "drop-shadow(0 0 3px rgba(255,255,255,.9))" }
      : { filter: "drop-shadow(0 1px 2px rgba(0,0,0,.65))" },
  };

  if (layer.kind === "line") {
    return (
      <line
        x1={coordinates[0].x}
        y1={coordinates[0].y}
        x2={coordinates[1].x}
        y2={coordinates[1].y}
        {...common}
      />
    );
  }

  if (layer.kind === "circle") {
    const radius = Math.hypot(
      coordinates[1].x - coordinates[0].x,
      coordinates[1].y - coordinates[0].y
    );
    return (
      <circle
        cx={coordinates[0].x}
        cy={coordinates[0].y}
        r={radius}
        {...common}
      />
    );
  }

  return (
    <polyline
      points={coordinates.map((point) => `${point.x},${point.y}`).join(" ")}
      {...common}
    />
  );
}
