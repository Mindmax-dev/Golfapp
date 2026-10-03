export const HOLE_TREND_COLORS = {
  reference: "oklch(0.48 0.025 145)",
  improved: "oklch(0.72 0.17 142)",
  unchanged: "oklch(0.78 0.16 85)",
  worsened: "oklch(0.65 0.2 27)",
} as const;

export function getHoleTrendColor(
  averageLast20: number | null,
  averageLast5: number | null
) {
  if (averageLast20 == null || averageLast5 == null) {
    return HOLE_TREND_COLORS.reference;
  }
  if (averageLast5 < averageLast20) return HOLE_TREND_COLORS.improved;
  if (averageLast5 > averageLast20) return HOLE_TREND_COLORS.worsened;
  return HOLE_TREND_COLORS.unchanged;
}

export function HoleTrendLegend() {
  const items = [
    [HOLE_TREND_COLORS.reference, "Letzte 20"],
    [HOLE_TREND_COLORS.improved, "Letzte 5: verbessert"],
    [HOLE_TREND_COLORS.unchanged, "Letzte 5: gleich"],
    [HOLE_TREND_COLORS.worsened, "Letzte 5: verschlechtert"],
  ] as const;

  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-3 text-xs text-[var(--color-muted-foreground)]">
      {items.map(([color, label]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: color }} aria-hidden="true" />
          {label}
        </span>
      ))}
    </div>
  );
}
