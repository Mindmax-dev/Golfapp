"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  getHoleTrendColor,
  HOLE_TREND_COLORS,
  HoleTrendLegend,
} from "@/components/charts/hole-trend-legend";

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
  payload: {
    fullName: string;
    par: number;
    averageLast20: number;
    currentAverage: number;
  };
}

function HoleTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}) {
  if (!active || !payload?.length) return null;
  const { fullName, par, averageLast20, currentAverage } = payload[0].payload;
  const change = Math.round((currentAverage - averageLast20) * 100) / 100;
  const trendLabel =
    Number.isInteger(currentAverage) && currentAverage === par - 1
      ? "Birdie"
      : currentAverage < par
        ? "Unter Par"
        : change < 0
          ? "Verbessert"
          : change > 0
            ? "Verschlechtert"
            : "Gleich";
  return (
    <div style={{
      backgroundColor: "oklch(0.18 0 0)",
      border: "1px solid oklch(0.26 0 0)",
      borderRadius: "0.5rem",
      padding: "8px 12px",
      fontSize: "12px",
    }}>
      <p style={{ color: "oklch(0.985 0 0)", marginBottom: "6px", fontWeight: 500 }}>{fullName}</p>
      {payload.map((entry) => {
        const diff = Math.round((entry.value - par) * 100) / 100;
        const color =
          entry.name === "Letzte 20"
            ? HOLE_TREND_COLORS.reference
            : getHoleTrendColor(averageLast20, currentAverage, par);
        return (
          <p key={entry.name} style={{ color, margin: "2px 0" }}>
            {entry.name}: {entry.value} ({diff >= 0 ? "+" : ""}{diff} vs Par {par})
          </p>
        );
      })}
      <p style={{ color: getHoleTrendColor(averageLast20, currentAverage, par), marginTop: "6px", fontWeight: 500 }}>
        {trendLabel}: {change > 0 ? "+" : ""}{change} {"Schl\u00e4ge"}
      </p>
    </div>
  );
}

interface HoleAverage {
  holeNumber: number;
  name: string;
  par: number;
  averageLast20: number;
  averageLast5: number;
  averageLast1: number;
}

export function HoleAveragesChart({ data }: { data: HoleAverage[] }) {
  const [comparison, setComparison] = useState<"last5" | "last1">("last5");
  const currentLabel = comparison === "last5" ? "Letzte 5" : "Letzte Runde";
  const chartData = data.map((h) => ({
    name: `L${h.holeNumber}`,
    fullName: h.name,
    par: h.par,
    averageLast20: h.averageLast20,
    currentAverage: comparison === "last5" ? h.averageLast5 : h.averageLast1,
  }));
  const yAxisMax = Math.max(
    6,
    Math.ceil(
      Math.max(...chartData.flatMap((hole) => [hole.averageLast20, hole.currentAverage])) / 3
    ) * 3
  );
  const yAxisTicks = Array.from({ length: yAxisMax / 3 + 1 }, (_, index) => index * 3);

  return (
    <div className="w-full min-w-0">
      <div
        className="mb-3 flex w-fit max-w-full rounded-md border border-[var(--color-card-border)] bg-[var(--color-background)] p-1"
        role="group"
        aria-label="Vergleichszeitraum"
      >
        {([
          ["last5", "Letzte 5"],
          ["last1", "Letzte Runde"],
        ] as const).map(([value, label]) => {
          const selected = comparison === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              onClick={() => setComparison(value)}
              className={`min-h-10 rounded px-3 py-2 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                selected
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                  : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <ResponsiveContainer width="100%" height={280} minWidth={0}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }} barCategoryGap="20%" barGap={3}>
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
            domain={[0, yAxisMax]}
            ticks={yAxisTicks}
            allowDecimals={false}
          />
          <Tooltip content={<HoleTooltip />} />
          <Legend content={() => <HoleTrendLegend currentLabel={currentLabel} showUnderPar />} />
          <Bar dataKey="averageLast20" name="Letzte 20" fill={HOLE_TREND_COLORS.reference} radius={[4, 4, 0, 0]} />
          <Bar
            dataKey="currentAverage"
            name={currentLabel}
            fill={HOLE_TREND_COLORS.unchanged}
            radius={[4, 4, 0, 0]}
          >
            {chartData.map((hole) => (
              <Cell
                key={hole.name}
                fill={getHoleTrendColor(hole.averageLast20, hole.currentAverage, hole.par)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
