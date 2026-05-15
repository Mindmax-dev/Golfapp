"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";

interface HoleAverage {
  holeNumber: number;
  name: string;
  par: number;
  average: number;
}

export function HoleAveragesChart({ data }: { data: HoleAverage[] }) {
  const chartData = data.map((h) => ({
    name: `L${h.holeNumber}`,
    fullName: h.name,
    average: h.average,
    par: h.par,
    diff: Math.round((h.average - h.par) * 100) / 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
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
        <Tooltip
          contentStyle={{
            backgroundColor: "oklch(0.18 0 0)",
            border: "1px solid oklch(0.26 0 0)",
            borderRadius: "0.5rem",
            fontSize: "12px",
          }}
          labelStyle={{ color: "oklch(0.985 0 0)", marginBottom: "4px" }}
          formatter={(value: number, name: string, props) => {
            if (name === "Durchschnitt") {
              const diff = props.payload.diff;
              return [
                `${value} (${diff >= 0 ? "+" : ""}${diff} vs Par ${props.payload.par})`,
                props.payload.fullName,
              ];
            }
            return [value, name];
          }}
        />
        <Bar dataKey="average" name="Durchschnitt" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell
              key={index}
              fill={
                entry.diff <= 0
                  ? "oklch(0.72 0.17 142)"
                  : entry.diff <= 1
                  ? "oklch(0.75 0.15 75)"
                  : "oklch(0.6 0.22 27)"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
