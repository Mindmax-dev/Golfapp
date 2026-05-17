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
} from "recharts";

interface HandicapPoint {
  datum: string;
  internal: number | null;
  official: number;
  turnier: boolean;
}

export function HandicapHistoryChart({ data }: { data: HandicapPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={380}>
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
          domain={["dataMin - 1", "dataMax + 1"]}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "oklch(0.18 0 0)",
            border: "1px solid oklch(0.26 0 0)",
            borderRadius: "0.5rem",
            fontSize: "12px",
          }}
          labelStyle={{ color: "oklch(0.985 0 0)", marginBottom: "4px" }}
          formatter={(value, name) => [
            typeof value === "number" ? value.toFixed(1) : "–",
            String(name),
          ]}
        />
        <Legend
          wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
          formatter={(value) => (
            <span style={{ color: "oklch(0.75 0 0)" }}>{value}</span>
          )}
        />
        <Line
          type="monotone"
          dataKey="internal"
          stroke="oklch(0.72 0.17 142)"
          strokeWidth={2}
          dot={{ fill: "oklch(0.72 0.17 142)", r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          name="Intern (jede Runde)"
          connectNulls
        />
        <Line
          type="stepAfter"
          dataKey="official"
          stroke="oklch(0.75 0.18 50)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5 }}
          name="Offiziell (manuell)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
