import { z } from "zod";

export const SWING_DRAWING_KINDS = ["line", "circle", "angle", "pen"] as const;
export type SwingDrawingKind = (typeof SWING_DRAWING_KINDS)[number];

export type SwingPoint = {
  x: number;
  y: number;
};

export type SwingDrawingLayer = {
  id: string;
  kind: SwingDrawingKind;
  color: string;
  startTime: number;
  endTime: number;
  points: SwingPoint[];
};

export type SwingTrackPoint = SwingPoint & {
  time: number;
  confidence: number;
};

export type SwingTrackAnchor = SwingPoint & {
  time: number;
};

export type SwingClubPath = {
  id: string;
  startTime: number;
  endTime: number;
  transitionTime: number;
  anchors: SwingTrackAnchor[];
  interpolatedSegments: number[];
  points: SwingTrackPoint[];
};

export type SwingAnalysis = {
  version: 1;
  duration: number;
  trimStart: number;
  trimEnd: number;
  layers: SwingDrawingLayer[];
  clubPaths: SwingClubPath[];
};

const PointSchema = z.object({
  x: z.number().finite().min(0).max(1),
  y: z.number().finite().min(0).max(1),
});

const DrawingLayerSchema = z.object({
  id: z.string().min(1).max(100),
  kind: z.enum(SWING_DRAWING_KINDS),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  startTime: z.number().finite().min(0).max(21_600),
  endTime: z.number().finite().min(0).max(21_600),
  points: z.array(PointSchema).min(2).max(2_000),
});

const TrackPointSchema = PointSchema.extend({
  time: z.number().finite().min(0).max(21_600),
  confidence: z.number().finite().min(0).max(1),
});

const TrackAnchorSchema = PointSchema.extend({
  time: z.number().finite().min(0).max(21_600),
});

const ClubPathSchema = z
  .object({
    id: z.string().min(1).max(100),
    startTime: z.number().finite().min(0).max(21_600),
    endTime: z.number().finite().min(0).max(21_600),
    transitionTime: z.number().finite().min(0).max(21_600),
    anchors: z.array(TrackAnchorSchema).max(30).default([]),
    interpolatedSegments: z.array(z.number().int().min(0).max(29)).max(29).default([]),
    points: z.array(TrackPointSchema).min(3).max(4_000),
  })
  .superRefine((path, context) => {
    if (
      path.startTime >= path.endTime ||
      path.transitionTime < path.startTime ||
      path.transitionTime > path.endTime
    ) {
      context.addIssue({
        code: "custom",
        message: "Der Zeitraum des Schlägerkopf-Pfads ist ungültig.",
      });
    }
    path.points.forEach((point, index) => {
      if (
        point.time < path.startTime ||
        point.time > path.endTime ||
        (index > 0 && point.time <= path.points[index - 1].time)
      ) {
        context.addIssue({
          code: "custom",
          path: ["points", index, "time"],
          message: "Die Zeitpunkte des Schlägerkopf-Pfads sind ungültig.",
        });
      }
    });
    path.anchors.forEach((anchor, index) => {
      if (
        anchor.time < path.startTime ||
        anchor.time > path.endTime ||
        (index > 0 && anchor.time <= path.anchors[index - 1].time)
      ) {
        context.addIssue({
          code: "custom",
          path: ["anchors", index, "time"],
          message: "Die Schlüsselbilder des Schlägerkopf-Pfads sind ungültig.",
        });
      }
    });
    path.interpolatedSegments.forEach((segment, index) => {
      if (segment >= path.anchors.length - 1) {
        context.addIssue({
          code: "custom",
          path: ["interpolatedSegments", index],
          message: "Der interpolierte Tracking-Abschnitt ist ungültig.",
        });
      }
    });
  });

export const SwingAnalysisSchema = z
  .object({
    version: z.literal(1),
    duration: z.number().finite().positive().max(21_600),
    trimStart: z.number().finite().min(0).max(21_600),
    trimEnd: z.number().finite().positive().max(21_600),
    layers: z.array(DrawingLayerSchema).max(100),
    clubPaths: z.array(ClubPathSchema).max(10).default([]),
  })
  .superRefine((analysis, context) => {
    if (analysis.trimStart >= analysis.trimEnd || analysis.trimEnd > analysis.duration) {
      context.addIssue({ code: "custom", message: "Der Videoschnitt ist ungültig." });
    }

    analysis.layers.forEach((layer, index) => {
      if (layer.startTime >= layer.endTime || layer.endTime > analysis.duration) {
        context.addIssue({
          code: "custom",
          path: ["layers", index],
          message: "Der Zeitraum der Ebene ist ungültig.",
        });
      }
      const expectedPointCount = layer.kind === "angle" ? 3 : 2;
      if (layer.kind !== "pen" && layer.points.length !== expectedPointCount) {
        context.addIssue({
          code: "custom",
          path: ["layers", index, "points"],
          message: layer.kind === "angle"
            ? "Winkel benötigen genau drei Punkte."
            : "Linien und Kreise benötigen genau zwei Punkte.",
        });
      }
    });

    const totalPoints = analysis.layers.reduce(
      (sum, layer) => sum + layer.points.length,
      0
    ) + analysis.clubPaths.reduce(
      (sum, path) => sum + path.points.length + path.anchors.length,
      0
    );
    if (totalPoints > 20_000) {
      context.addIssue({
        code: "custom",
        path: ["layers"],
        message: "Die Analyse enthält zu viele Zeichenpunkte.",
      });
    }
  });

export function parseSwingAnalysis(value: unknown): SwingAnalysis | null {
  const result = SwingAnalysisSchema.safeParse(value);
  return result.success ? result.data : null;
}
