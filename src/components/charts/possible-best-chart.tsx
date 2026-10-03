"use client";

import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const POSSIBLE_BEST_COLORS = {
  holeInOne: "oklch(0.76 0.17 205)",
  underPar: "oklch(0.68 0.16 245)",
  par: "oklch(0.72 0.17 142)",
  overPar: "oklch(0.55 0.03 145)",
} as const;

interface PossibleBest {
  holeNumber: number;
  name: string;
  par: number;
  bestStrokes: number | null;
  firstAchievedAt: string | null;
  firstAchievedAtShort: string | null;
}

interface TooltipEntry {
  payload: PossibleBest & { label: string };
}

function getResultLabel(strokes: number, par: number) {
  if (strokes === 1) return "Hole-in-one";
  const difference = strokes - par;
  if (difference === -2) return "Eagle";
  if (difference === -1) return "Birdie";
  if (difference === 0) return "Par";
  return difference > 0 ? `+${difference}` : `${difference}`;
}

function getBarColor(strokes: number | null, par: number) {
  if (strokes === 1) return POSSIBLE_BEST_COLORS.holeInOne;
  if (strokes != null && strokes < par) return POSSIBLE_BEST_COLORS.underPar;
  if (strokes === par) return POSSIBLE_BEST_COLORS.par;
  return POSSIBLE_BEST_COLORS.overPar;
}

function PossibleBestTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
}) {
  if (!active || !payload?.length) return null;
  const hole = payload[0].payload;
  if (hole.bestStrokes == null) return null;

  return (
    <div className="rounded-lg border border-[var(--color-card-border)] bg-[var(--color-card)] px-3 py-2 text-xs shadow-xl">
      <p className="font-medium text-[var(--color-foreground)]">
        L{hole.holeNumber} · {hole.name}
      </p>
      <p className="mt-1" style={{ color: getBarColor(hole.bestStrokes, hole.par) }}>
        {hole.bestStrokes} {hole.bestStrokes === 1 ? "Schlag" : "Schl\u00e4ge"} ·{" "}
        {getResultLabel(hole.bestStrokes, hole.par)}
      </p>
      <p className="mt-1 text-[var(--color-muted-foreground)]">
        Erstmals am {hole.firstAchievedAt}
      </p>
    </div>
  );
}

function PossibleBestLegend() {
  const items = [
    [POSSIBLE_BEST_COLORS.holeInOne, "Hole-in-one"],
    [POSSIBLE_BEST_COLORS.underPar, "Unter Par"],
    [POSSIBLE_BEST_COLORS.par, "Par"],
    [POSSIBLE_BEST_COLORS.overPar, "\u00dcber Par"],
  ] as const;

  return (
    <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-[var(--color-muted-foreground)]">
      {items.map(([color, label]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: color }} aria-hidden="true" />
          {label}
        </span>
      ))}
    </div>
  );
}

export function PossibleBestChart({ data }: { data: PossibleBest[] }) {
  const chartData = data
    .filter((hole) => hole.bestStrokes != null)
    .map((hole) => ({ ...hole, label: `L${hole.holeNumber}` }));
  const highestScore = Math.max(...chartData.map((hole) => hole.bestStrokes ?? 0), 1);

  return (
    <div className="min-w-0">
      <ResponsiveContainer width="100%" height={410} minWidth={0}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 62, left: -18, bottom: 0 }}
          barCategoryGap="26%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.26 0 0)" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, highestScore + 1.5]}
            allowDecimals={false}
            stroke="oklch(0.65 0 0)"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={42}
            stroke="oklch(0.65 0 0)"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<PossibleBestTooltip />} cursor={{ fill: "oklch(0.2 0 0 / 0.35)" }} />
          <Bar dataKey="bestStrokes" name="Bestwert" radius={[0, 5, 5, 0]} minPointSize={12}>
            {chartData.map((hole) => (
              <Cell
                key={hole.label}
                fill={getBarColor(hole.bestStrokes, hole.par)}
              />
            ))}
            <LabelList
              dataKey="bestStrokes"
              position="insideRight"
              fill="oklch(0.98 0 0)"
              fontSize={11}
              fontWeight={700}
            />
            <LabelList
              dataKey="firstAchievedAtShort"
              position="right"
              fill="oklch(0.68 0 0)"
              fontSize={10}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <PossibleBestLegend />
    </div>
  );
}
