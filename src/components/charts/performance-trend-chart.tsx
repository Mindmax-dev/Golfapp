"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface TrendDataPoint {
  datum: string;
  uberPar: number;
  stableford: number;
  totalStrokes: number;
}

export function PerformanceTrendChart({ data }: { data: TrendDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.26 0 0)" />
        <XAxis
          dataKey="datum"
          stroke="oklch(0.65 0 0)"
          tick={{ fontSize: 11 }}
          tickLine={false}
        />
        <YAxis
          stroke="oklch(0.65 0 0)"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "oklch(0.18 0 0)",
            border: "1px solid oklch(0.26 0 0)",
            borderRadius: "0.5rem",
            fontSize: "12px",
          }}
          labelStyle={{ color: "oklch(0.985 0 0)", marginBottom: "4px" }}
          formatter={(value: number, name: string) => {
            if (name === "Über Par") return [value > 0 ? `+${value}` : value, name];
            return [value, name];
          }}
        />
        <ReferenceLine y={0} stroke="oklch(0.45 0 0)" strokeDasharray="4 4" />
        <Line
          type="monotone"
          dataKey="uberPar"
          stroke="oklch(0.72 0.17 142)"
          strokeWidth={2}
          dot={{ fill: "oklch(0.72 0.17 142)", r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          name="Über Par"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
