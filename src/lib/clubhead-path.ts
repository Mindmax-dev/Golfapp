import type { SwingTrackAnchor, SwingTrackPoint } from "@/lib/swing-analysis";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function catmullRom(
  previous: number,
  start: number,
  end: number,
  next: number,
  progress: number
) {
  const squared = progress * progress;
  const cubed = squared * progress;
  return 0.5 * (
    2 * start +
    (-previous + end) * progress +
    (2 * previous - 5 * start + 4 * end - next) * squared +
    (-previous + 3 * start - 3 * end + next) * cubed
  );
}

export function createClubheadPath(
  anchors: SwingTrackAnchor[],
  samplesPerSecond = 60
) {
  const sorted = [...anchors].sort((first, second) => first.time - second.time);
  const points: SwingTrackPoint[] = [];

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const previous = sorted[Math.max(0, index - 1)];
    const start = sorted[index];
    const end = sorted[index + 1];
    const next = sorted[Math.min(sorted.length - 1, index + 2)];
    const steps = Math.max(2, Math.ceil((end.time - start.time) * samplesPerSecond));

    for (let step = index === 0 ? 0 : 1; step <= steps; step += 1) {
      const progress = step / steps;
      points.push({
        x: clamp(catmullRom(previous.x, start.x, end.x, next.x, progress), 0, 1),
        y: clamp(catmullRom(previous.y, start.y, end.y, next.y, progress), 0, 1),
        time: start.time + (end.time - start.time) * progress,
        confidence: 1,
      });
    }
  }

  return points;
}

export function estimateTransitionTime(points: SwingTrackPoint[]) {
  if (points.length === 0) return 0;
  const margin = Math.min(Math.floor(points.length * 0.08), 8);
  const candidates = points.slice(margin, Math.max(margin + 1, points.length - margin));
  return candidates.reduce(
    (highest, point) => (point.y < highest.y ? point : highest),
    candidates[0]
  ).time;
}
