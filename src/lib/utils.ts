import { format } from "date-fns";
import { de } from "date-fns/locale";

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDatum(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd.MM.yyyy", { locale: de });
}

export function formatDatumKurz(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd.MM.yy", { locale: de });
}

export function signDisplay(n: number): string {
  if (n > 0) return `+${n}`;
  return `${n}`;
}
