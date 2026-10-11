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

  if (layer.kind === "angle") {
    const vertex = coordinates[0];
    const firstEnd = coordinates[1];
    const secondEnd = coordinates[2];

    if (!secondEnd) {
      return (
        <line
          x1={vertex.x}
          y1={vertex.y}
          x2={firstEnd.x}
          y2={firstEnd.y}
          {...common}
        />
      );
    }

    const firstAngle = Math.atan2(firstEnd.y - vertex.y, firstEnd.x - vertex.x);
    const secondAngle = Math.atan2(secondEnd.y - vertex.y, secondEnd.x - vertex.x);
    let angleDelta = secondAngle - firstAngle;
    while (angleDelta <= -Math.PI) angleDelta += Math.PI * 2;
    while (angleDelta > Math.PI) angleDelta -= Math.PI * 2;

    const firstLength = Math.hypot(firstEnd.x - vertex.x, firstEnd.y - vertex.y);
    const secondLength = Math.hypot(secondEnd.x - vertex.x, secondEnd.y - vertex.y);
    const arcRadius = Math.min(Math.max(Math.min(firstLength, secondLength) * 0.28, 18), 48);
    const arcStart = {
      x: vertex.x + Math.cos(firstAngle) * arcRadius,
      y: vertex.y + Math.sin(firstAngle) * arcRadius,
    };
    const arcEnd = {
      x: vertex.x + Math.cos(firstAngle + angleDelta) * arcRadius,
      y: vertex.y + Math.sin(firstAngle + angleDelta) * arcRadius,
    };
    const labelAngle = firstAngle + angleDelta / 2;
    const labelRadius = arcRadius + 15;
    const label = {
      x: vertex.x + Math.cos(labelAngle) * labelRadius,
      y: vertex.y + Math.sin(labelAngle) * labelRadius,
    };
    const degrees = Math.round(Math.abs(angleDelta) * 180 / Math.PI);

    return (
      <g {...common}>
        <line x1={vertex.x} y1={vertex.y} x2={firstEnd.x} y2={firstEnd.y} />
        <line x1={vertex.x} y1={vertex.y} x2={secondEnd.x} y2={secondEnd.y} />
        <path
          d={`M ${arcStart.x} ${arcStart.y} A ${arcRadius} ${arcRadius} 0 0 ${angleDelta >= 0 ? 1 : 0} ${arcEnd.x} ${arcEnd.y}`}
        />
        <text
          x={label.x}
          y={label.y}
          fill={layer.color}
          stroke="rgba(0,0,0,.8)"
          strokeWidth={3}
          paintOrder="stroke"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={14}
          fontWeight={700}
        >
          {degrees}°
        </text>
      </g>
    );
  }

  return (
    <polyline
      points={coordinates.map((point) => `${point.x},${point.y}`).join(" ")}
      {...common}
    />
  );
}
