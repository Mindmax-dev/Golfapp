"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
  payload: { fullName: string; par: number };
}

function HoleTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) {
  if (!active || !payload?.length) return null;
  const { fullName, par } = payload[0].payload;
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
    </div>
  );
}

interface HoleAverage {
  holeNumber: number;
  name: string;
  par: number;
  average: number;
  averageLast5: number;
}

export function HoleAveragesChart({ data }: { data: HoleAverage[] }) {
  const chartData = data.map((h) => ({
    name: `L${h.holeNumber}`,
    fullName: h.name,
    par: h.par,
    average: h.average,
    averageLast5: h.averageLast5,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
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
        <Legend
          wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
          formatter={(value) => (
            <span style={{ color: "oklch(0.75 0 0)" }}>{value}</span>
          )}
        />
        <Bar dataKey="average" name="Alle Runden" fill="oklch(0.72 0.17 142)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="averageLast5" name="Letzte 5" fill="oklch(0.75 0.18 50)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
