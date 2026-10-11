import type { SwingClubPath, SwingTrackPoint } from "@/lib/swing-analysis";

function splinePath(points: SwingTrackPoint[], width: number, height: number) {
  if (points.length < 2) return "";
  const scaled = points.map((point) => ({ x: point.x * width, y: point.y * height }));
  return scaled.reduce(
    (path, point, index) => `${path}${index === 0 ? "M" : " L"} ${point.x} ${point.y}`,
    ""
  );
}

function phasePoints(path: SwingClubPath) {
  const transitionIndex = path.points.reduce((closest, point, index) =>
    Math.abs(point.time - path.transitionTime) <
    Math.abs(path.points[closest].time - path.transitionTime)
      ? index
      : closest
  , 0);

  return {
    backswing: path.points.slice(0, transitionIndex + 1),
    downswing: path.points.slice(transitionIndex),
  };
}

export function SwingClubPathShape({
  path,
  width,
  height,
  selected,
}: {
  path: SwingClubPath;
  width: number;
  height: number;
  selected?: boolean;
}) {
  const { backswing, downswing } = phasePoints(path);
  const shadow = selected
    ? "drop-shadow(0 0 4px rgba(255,255,255,.85))"
    : "drop-shadow(0 1px 3px rgba(0,0,0,.8))";

  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path
        d={splinePath(backswing, width, height)}
        stroke="#facc15"
        strokeWidth={2.5}
        style={{ filter: shadow }}
      />
      <path
        d={splinePath(downswing, width, height)}
        stroke="#f43f5e"
        strokeWidth={2.5}
        style={{ filter: shadow }}
      />
    </g>
  );
}
