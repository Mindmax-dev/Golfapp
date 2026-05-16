"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface RollingDataPoint {
  datum: string;
  rolling5Avg: number;
  rekord: number;
}

export function RollingAverageChart({ data }: { data: RollingDataPoint[] }) {
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
          formatter={(value: number, name: string) => [
            value > 0 ? `+${value}` : value,
            name,
          ]}
        />
        <Legend
          wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
          formatter={(value) => (
            <span style={{ color: "oklch(0.75 0 0)" }}>{value}</span>
          )}
        />
        <ReferenceLine y={0} stroke="oklch(0.45 0 0)" strokeDasharray="4 4" />
        <Line
          type="monotone"
          dataKey="rolling5Avg"
          stroke="oklch(0.72 0.17 142)"
          strokeWidth={2}
          dot={{ fill: "oklch(0.72 0.17 142)", r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          name="Ø letzte 5"
        />
        <Line
          type="stepAfter"
          dataKey="rekord"
          stroke="oklch(0.75 0.18 50)"
          strokeWidth={2}
          strokeDasharray="5 3"
          dot={false}
          activeDot={{ r: 4 }}
          name="Rekord"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
