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

function computeLinearTrend(values: number[]): number[] {
  const n = values.length;
  if (n < 2) return values;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((s, v) => s + v, 0) / n;
  const ssxx = values.reduce((s, _, i) => s + (i - xMean) ** 2, 0);
  const ssxy = values.reduce((s, v, i) => s + (i - xMean) * (v - yMean), 0);
  const slope = ssxy / ssxx;
  const intercept = yMean - slope * xMean;
  return values.map((_, i) => Math.round((slope * i + intercept) * 10) / 10);
}

export function RollingAverageChart({ data }: { data: RollingDataPoint[] }) {
  const trendValues = computeLinearTrend(data.map((d) => d.rolling5Avg));
  const enriched = data.map((d, i) => ({ ...d, trend: trendValues[i] }));

  return (
    <ResponsiveContainer width="100%" height={380}>
      <LineChart data={enriched} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
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
          type="linear"
          dataKey="trend"
          stroke="oklch(0.72 0.17 142)"
          strokeWidth={1.5}
          strokeDasharray="6 4"
          strokeOpacity={0.45}
          dot={false}
          activeDot={false}
          name="Trend"
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
