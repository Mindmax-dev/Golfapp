"use client";

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
    averageLast5: number;
  };
}

function HoleTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) {
  if (!active || !payload?.length) return null;
  const { fullName, par, averageLast20, averageLast5 } = payload[0].payload;
  const change = Math.round((averageLast5 - averageLast20) * 100) / 100;
  const trendLabel = change < 0 ? "Verbessert" : change > 0 ? "Verschlechtert" : "Gleich";
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
        return (
          <p key={entry.name} style={{ color: entry.color, margin: "2px 0" }}>
            {entry.name}: {entry.value} ({diff >= 0 ? "+" : ""}{diff} vs Par {par})
          </p>
        );
      })}
      <p style={{ color: getHoleTrendColor(averageLast20, averageLast5), marginTop: "6px", fontWeight: 500 }}>
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
}

export function HoleAveragesChart({ data }: { data: HoleAverage[] }) {
  const chartData = data.map((h) => ({
    name: `L${h.holeNumber}`,
    fullName: h.name,
    par: h.par,
    averageLast20: h.averageLast20,
    averageLast5: h.averageLast5,
  }));

  return (
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
          domain={["auto", "auto"]}
        />
        <Tooltip content={<HoleTooltip />} />
        <Legend content={() => <HoleTrendLegend />} />
        <Bar dataKey="averageLast20" name="Letzte 20" fill={HOLE_TREND_COLORS.reference} radius={[4, 4, 0, 0]} />
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
