export const HOLE_TREND_COLORS = {
  reference: "oklch(0.48 0.025 145)",
  underPar: "oklch(0.68 0.16 245)",
  improved: "oklch(0.72 0.17 142)",
  unchanged: "oklch(0.78 0.16 85)",
  worsened: "oklch(0.65 0.2 27)",
} as const;

export function getHoleTrendColor(
  averageLast20: number | null,
  currentAverage: number | null,
  par?: number
) {
  if (averageLast20 == null || currentAverage == null) {
    return HOLE_TREND_COLORS.reference;
  }
  if (par != null && currentAverage < par) return HOLE_TREND_COLORS.underPar;
  if (currentAverage < averageLast20) return HOLE_TREND_COLORS.improved;
  if (currentAverage > averageLast20) return HOLE_TREND_COLORS.worsened;
  return HOLE_TREND_COLORS.unchanged;
}

export function HoleTrendLegend({
  currentLabel = "Letzte 5",
  showUnderPar = false,
}: {
  currentLabel?: string;
  showUnderPar?: boolean;
}) {
  const items: Array<readonly [string, string]> = [
    [HOLE_TREND_COLORS.reference, "Letzte 20"],
    [HOLE_TREND_COLORS.improved, `${currentLabel}: verbessert`],
    [HOLE_TREND_COLORS.unchanged, `${currentLabel}: gleich`],
    [HOLE_TREND_COLORS.worsened, `${currentLabel}: verschlechtert`],
  ];
  if (showUnderPar) {
    items.splice(1, 0, [HOLE_TREND_COLORS.underPar, `${currentLabel}: unter Par`]);
  }

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
