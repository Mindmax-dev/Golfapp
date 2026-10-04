"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const BIRDIE_COLOR = "oklch(0.76 0.17 205)";
const BIRDIE_GLOW = "oklch(0.76 0.17 205 / 0.16)";

interface TimelinePoint {
  roundNumber: number;
  datum: string;
  birdiesInRound: number;
  windowRoundsWithBirdie: number;
  windowRounds: number;
  chancePercent: number;
}

interface HoleChance {
  holeNumber: number;
  name: string;
  birdies: number;
  roundsPlayed: number;
  chancePercent: number;
}

interface RoundChance {
  roundsWithBirdie: number;
  roundsPlayed: number;
  chancePercent: number;
}

function formatPercent(value: number) {
  return `${value.toFixed(1).replace(".", ",")} %`;
}

function TimelineTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: TimelinePoint }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-lg border border-[var(--color-card-border)] bg-[var(--color-card)] px-3 py-2 text-xs shadow-xl">
      <p className="font-medium text-[var(--color-foreground)]">
        Runde {point.roundNumber} · {point.datum}
      </p>
      <p className="mt-1" style={{ color: BIRDIE_COLOR }}>
        {formatPercent(point.chancePercent)} Birdie-Chance
      </p>
      <p className="mt-1 text-[var(--color-muted-foreground)]">
        {point.windowRoundsWithBirdie} von {point.windowRounds} Runden mit Birdie
      </p>
      <p className="mt-0.5 text-[var(--color-muted-foreground)]">
        Diese Runde: {point.birdiesInRound === 0 ? "kein Birdie" : `${point.birdiesInRound} Birdie${point.birdiesInRound === 1 ? "" : "s"}`}
      </p>
    </div>
  );
}

function HoleTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: HoleChance & { label: string } }>;
}) {
  if (!active || !payload?.length) return null;
  const hole = payload[0].payload;

  return (
    <div className="rounded-lg border border-[var(--color-card-border)] bg-[var(--color-card)] px-3 py-2 text-xs shadow-xl">
      <p className="font-medium text-[var(--color-foreground)]">
        L{hole.holeNumber} · {hole.name}
      </p>
      <p className="mt-1" style={{ color: BIRDIE_COLOR }}>
        {formatPercent(hole.chancePercent)} Birdie-Chance
      </p>
      <p className="mt-1 text-[var(--color-muted-foreground)]">
        {hole.birdies} Birdies aus {hole.roundsPlayed} Runden
      </p>
    </div>
  );
}

export function BirdieChanceChart({
  timeline,
  byHole,
  last20RoundChance,
}: {
  timeline: TimelinePoint[];
  byHole: HoleChance[];
  last20RoundChance: RoundChance;
}) {
  const [view, setView] = useState<"timeline" | "holes">("timeline");
  const latestChance = timeline.at(-1)?.chancePercent ?? 0;
  const holeData = byHole.map((hole) => ({ ...hole, label: `L${hole.holeNumber}` }));
  const activeData = view === "timeline" ? timeline : holeData;
  const maxChance = Math.max(...activeData.map((point) => point.chancePercent), 0);
  const yAxisMax = Math.max(10, Math.ceil(maxChance / 10) * 10);

  return (
    <div className="min-w-0">
      <div className="mb-5 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-stretch">
        <div
          className="flex w-fit max-w-full rounded-md border border-[var(--color-card-border)] bg-[var(--color-background)] p-1"
          role="group"
          aria-label="Ansicht der Birdie-Chance"
        >
          {([
            ["timeline", "Zeitverlauf"],
            ["holes", "Pro Loch · letzte 20"],
          ] as const).map(([value, label]) => {
            const selected = view === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => setView(value)}
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

        <div
          className="flex min-w-0 items-center justify-between gap-4 rounded-md border px-3 py-2 sm:justify-end"
          style={{ borderColor: BIRDIE_COLOR, backgroundColor: BIRDIE_GLOW }}
        >
          <div className="min-w-0 sm:text-right">
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Mindestens ein Birdie pro Runde
            </p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Letzte {last20RoundChance.roundsPlayed} Runden · {last20RoundChance.roundsWithBirdie} mit Birdie
            </p>
          </div>
          <p className="shrink-0 text-2xl font-bold tabular-nums" style={{ color: BIRDIE_COLOR }}>
            {formatPercent(last20RoundChance.chancePercent)}
          </p>
        </div>
      </div>

      <div className="mb-2 flex items-baseline justify-between gap-4 px-1 text-xs text-[var(--color-muted-foreground)]">
        <span>{view === "timeline" ? "Runden mit mindestens einem Birdie · rollierend letzte 20" : "Je Loch aus bis zu 20 Runden"}</span>
        {view === "timeline" && (
          <span className="font-medium tabular-nums" style={{ color: BIRDIE_COLOR }}>
            Aktuell {formatPercent(latestChance)}
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={300} minWidth={0}>
        {view === "timeline" ? (
          <LineChart data={timeline} margin={{ top: 8, right: 20, left: -8, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.26 0 0)" vertical={false} />
            <XAxis
              dataKey="roundNumber"
              stroke="oklch(0.65 0 0)"
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => `R${value}`}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, yAxisMax]}
              ticks={Array.from({ length: yAxisMax / 10 + 1 }, (_, index) => index * 10)}
              stroke="oklch(0.65 0 0)"
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => `${value} %`}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip content={<TimelineTooltip />} />
            <Line
              type="monotone"
              dataKey="chancePercent"
              stroke={BIRDIE_COLOR}
              strokeWidth={2.5}
              dot={{ fill: BIRDIE_COLOR, r: 3, strokeWidth: 0 }}
              activeDot={{
                r: 5,
                fill: BIRDIE_COLOR,
                stroke: "oklch(0.985 0 0)",
                strokeWidth: 2,
              }}
            />
          </LineChart>
        ) : (
          <BarChart data={holeData} margin={{ top: 8, right: 20, left: -8, bottom: 5 }} barCategoryGap="28%">
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.26 0 0)" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="oklch(0.65 0 0)"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, yAxisMax]}
              ticks={Array.from({ length: yAxisMax / 10 + 1 }, (_, index) => index * 10)}
              stroke="oklch(0.65 0 0)"
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => `${value} %`}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip content={<HoleTooltip />} cursor={{ fill: "oklch(0.2 0 0 / 0.35)" }} />
            <Bar dataKey="chancePercent" fill={BIRDIE_COLOR} radius={[5, 5, 0, 0]} minPointSize={2} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
