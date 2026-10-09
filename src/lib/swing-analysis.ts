import { z } from "zod";

export const SWING_DRAWING_KINDS = ["line", "circle", "pen"] as const;
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

export type SwingAnalysis = {
  version: 1;
  duration: number;
  trimStart: number;
  trimEnd: number;
  layers: SwingDrawingLayer[];
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

export const SwingAnalysisSchema = z
  .object({
    version: z.literal(1),
    duration: z.number().finite().positive().max(21_600),
    trimStart: z.number().finite().min(0).max(21_600),
    trimEnd: z.number().finite().positive().max(21_600),
    layers: z.array(DrawingLayerSchema).max(100),
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
      if (layer.kind !== "pen" && layer.points.length !== 2) {
        context.addIssue({
          code: "custom",
          path: ["layers", index, "points"],
          message: "Linien und Kreise benötigen genau zwei Punkte.",
        });
      }
    });

    const totalPoints = analysis.layers.reduce(
      (sum, layer) => sum + layer.points.length,
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
