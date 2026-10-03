"use client";

import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getHoleTrendColor,
  HOLE_TREND_COLORS,
  HoleTrendLegend,
} from "@/components/charts/hole-trend-legend";

interface PuttAverage {
  holeNumber: number;
  name: string;
  averageLast20: number | null;
  averageLast5: number | null;
}

interface TooltipEntry {
  name: string;
  value: number;
  color: string;
  payload: {
    fullName: string;
    averageLast20: number | null;
    averageLast5: number | null;
  };
}

function formatPutts(value: number) {
  return value.toFixed(2).replace(".", ",");
}

function PuttsTooltip({ active, payload }: { active?: boolean; payload?: TooltipEntry[] }) {
  if (!active || !payload?.length) return null;
  const { fullName, averageLast20, averageLast5 } = payload[0].payload;
  const delta =
    averageLast20 != null && averageLast5 != null
      ? Math.round((averageLast5 - averageLast20) * 100) / 100
      : null;

  return (
    <div className="rounded-lg border border-[var(--color-card-border)] bg-[var(--color-card)] px-3 py-2 text-xs shadow-xl">
      <p className="mb-1.5 font-medium text-[var(--color-foreground)]">{fullName}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="my-0.5" style={{ color: entry.color }}>
          {entry.name}: {formatPutts(entry.value)} Putts
        </p>
      ))}
      {delta != null && (
        <p
          className="mt-1.5 font-medium"
          style={{ color: getHoleTrendColor(averageLast20, averageLast5) }}
        >
          {delta < 0 ? "Verbessert" : delta > 0 ? "Verschlechtert" : "Unver\u00e4ndert"}: {delta > 0 ? "+" : ""}
          {formatPutts(delta)}
        </p>
      )}
    </div>
  );
}

export function HolePuttsChart({ data }: { data: PuttAverage[] }) {
  const chartData = data.map((hole) => ({
    name: `L${hole.holeNumber}`,
    fullName: hole.name,
    averageLast20: hole.averageLast20,
    averageLast5: hole.averageLast5,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={chartData}
        margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
        barCategoryGap="20%"
        barGap={3}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.26 0 0)" vertical={false} />
        <XAxis
          dataKey="name"
          stroke="oklch(0.65 0 0)"
          tick={{ fontSize: 11 }}
          tickLine={false}
        />
        <YAxis
          stroke="oklch(0.65 0 0)"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          domain={[0, "dataMax + 0.5"]}
          tickFormatter={(value: number) => value.toFixed(1)}
        />
        <Tooltip content={<PuttsTooltip />} />
        <Legend content={() => <HoleTrendLegend />} />
        <Bar
          dataKey="averageLast20"
          name="Letzte 20"
          fill={HOLE_TREND_COLORS.reference}
          radius={[4, 4, 0, 0]}
        />
        <Bar dataKey="averageLast5" name="Letzte 5" radius={[4, 4, 0, 0]}>
          {chartData.map((hole) => (
            <Cell
              key={hole.name}
              fill={getHoleTrendColor(hole.averageLast20, hole.averageLast5)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
