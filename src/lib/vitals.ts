/**
 * Metric keys are open strings — see lib/metricCatalog.ts. Kept as a named
 * alias so call sites read as intent rather than a bare `string`.
 */
export type VitalMetric = string;

export type Zone = 1 | 2 | 3 | 4 | 5;

/** Fallback when the athlete hasn't recorded a max HR. Matches the API. */
export const DEFAULT_MAX_HR = 190;

/** Must stay in step with `zoneForHeartRate` in the API's services/vitals.ts. */
export function zoneForHeartRate(bpm: number, maxHr: number): Zone {
  const pct = bpm / (maxHr > 0 ? maxHr : DEFAULT_MAX_HR);
  if (pct < 0.6) return 1;
  if (pct < 0.7) return 2;
  if (pct < 0.8) return 3;
  if (pct < 0.9) return 4;
  return 5;
}

export const ZONE_COLORS: Record<Zone, string> = {
  1: "#38BDF8",
  2: "#10B981",
  3: "#F59E0B",
  4: "#F97316",
  5: "#EF4444",
};

/** Tailwind text colour per zone, for badges and numerals. */
export const ZONE_TEXT: Record<Zone, string> = {
  1: "text-sky-500",
  2: "text-emerald-500",
  3: "text-amber-500",
  4: "text-orange-500",
  5: "text-red-500",
};


export function formatSeconds(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** "12s ago" / "4m ago" — freshness of the last watch reading. */
export function formatAgo(at: string | Date | number | null | undefined): string | null {
  if (at === null || at === undefined) return null;
  const then = typeof at === "number" ? at : new Date(at).getTime();
  if (!Number.isFinite(then)) return null;
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.round(minutes / 60)}h`;
}
