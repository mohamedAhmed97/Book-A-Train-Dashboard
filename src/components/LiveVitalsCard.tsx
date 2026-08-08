"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Activity, HeartPulse, WifiOff } from "lucide-react";
import { useLiveVitals } from "@/hooks/useLiveVitals";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ZONE_COLORS, ZONE_TEXT, formatAgo } from "@/lib/vitals";
import { formatMetricValue, metricMeta } from "@/lib/metricCatalog";
import { metricStyle, metricLabel } from "@/lib/metricDisplay";
import { cn } from "@/lib/utils";

export interface LiveAthlete {
  bookingId: string;
  athleteName: string;
  sessionTitle: string;
  sport: string;
  completed: boolean;
}

/**
 * Live HR sparkline drawn as an inline SVG polyline. Deliberately dependency
 * free — the dashboard has no charting library and this needs to stay cheap
 * when a dozen of them re-render every few seconds.
 */
function Sparkline({
  points,
  color,
  width = 120,
  height = 32,
}: {
  points: Array<{ value: number; at: number }>;
  color: string;
  width?: number;
  height?: number;
}) {
  if (points.length < 2) return <div style={{ width, height }} />;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // A flat line would divide by zero; give it a nominal band so it renders
  // centred instead of collapsing to the top edge.
  const span = max - min || 1;

  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((p.value - min) / span) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} aria-hidden className="overflow-visible">
      <path d={path} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** A reading older than this is shown as aged rather than current. */
const STALE_METRIC_MS = 2 * 60_000;

/**
 * Re-render on a slow tick so ages keep counting up between SSE events.
 * Without this a card whose watch went quiet would freeze at "1m" forever —
 * exactly the case the freshness indicator exists to catch.
 */
function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function LiveVitalsCard({ athlete }: { athlete: LiveAthlete }) {
  const t = useTranslations("vitals");
  const now = useNow();
  const { connection, latest, heartRate, zone, series, lastEventAt } = useLiveVitals(
    athlete.bookingId,
    // Once the workout is saved there's nothing more coming — don't hold a
    // socket open for every finished session on the board.
    !athlete.completed,
  );

  const tMetric = useTranslations("vitals.metric");
  const zoneColor = zone ? ZONE_COLORS[zone] : "#64748B";
  const ago = formatAgo(lastEventAt);

  // Every metric the watch is reporting except heart rate, which is the
  // headline above. The set is open, so this can't be a fixed list — a watch
  // that reports power and cadence shows power and cadence.
  const secondary = Object.entries(latest)
    .filter(([metric]) => metric !== "HEART_RATE")
    .sort(([a], [b]) => metricMeta(a).group.localeCompare(metricMeta(b).group) || a.localeCompare(b));

  const isLive = connection === "open" && heartRate !== null;

  return (
    <Card
      className="p-4 transition-colors"
      style={isLive ? { borderColor: `${zoneColor}55`, backgroundColor: `${zoneColor}0A` } : undefined}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{athlete.athleteName}</p>
          <p className="text-muted-foreground text-xs truncate">
            {athlete.sessionTitle} · {athlete.sport}
          </p>
        </div>

        {athlete.completed ? (
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            {t("finished")}
          </Badge>
        ) : isLive ? (
          <span className="flex items-center gap-1.5 shrink-0">
            <span
              className="h-2 w-2 rounded-full animate-pulse"
              style={{ backgroundColor: zoneColor }}
            />
            <span className="text-[10px] font-semibold tracking-wide" style={{ color: zoneColor }}>
              {t("live")}
            </span>
          </span>
        ) : (
          <Badge variant="outline" className="shrink-0 text-[10px] gap-1">
            <WifiOff className="h-3 w-3" />
            {t("waiting")}
          </Badge>
        )}
      </div>

      {heartRate === null ? (
        <div className="flex items-center gap-2 py-3 text-muted-foreground">
          <Activity className="h-4 w-4" />
          <span className="text-xs">{t("noWatchData")}</span>
        </div>
      ) : (
        <>
          <div className="flex items-end justify-between gap-3">
            <div className="flex items-end gap-2">
              <HeartPulse className={cn("h-5 w-5 mb-1", zone && ZONE_TEXT[zone])} />
              <span className="text-3xl font-semibold leading-none tabular-nums" style={{ color: zoneColor }}>
                {Math.round(heartRate)}
              </span>
              <span className="text-muted-foreground text-xs mb-1">bpm</span>
            </div>
            <Sparkline points={series} color={zoneColor} />
          </div>

          <div className="flex items-center gap-2 mt-2">
            <Badge
              variant="outline"
              className="text-[10px]"
              style={{ borderColor: `${zoneColor}66`, color: zoneColor }}
            >
              {t("zone", { zone: zone ?? 1 })}
            </Badge>
            {ago && (
              <span className="text-muted-foreground text-[10px]">{t("updatedAgo", { ago })}</span>
            )}
          </div>

          {secondary.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 pt-3 border-t">
              {secondary.map(([metric, reading]) => {
                const { icon: Icon, color } = metricStyle(metric);
                // Metrics arrive on wildly different cadences — a watch may
                // push HR every few seconds but SpO₂ once an hour. Without a
                // per-metric age the coach reads a stale number as current.
                const stale = now - reading.recordedAt > STALE_METRIC_MS;
                const age = formatAgo(reading.recordedAt);
                return (
                  <span key={metric} className="flex items-center gap-1.5 text-xs">
                    <Icon className={cn("h-3.5 w-3.5", stale ? "text-muted-foreground" : color)} />
                    <span
                      className={cn(
                        "font-medium tabular-nums",
                        stale && "text-muted-foreground",
                      )}
                    >
                      {formatMetricValue(metric, reading.value, reading.unit)}
                    </span>
                    <span className="text-muted-foreground text-[10px]">
                      {metricLabel(tMetric, metric)}
                    </span>
                    {stale && age && (
                      <span
                        className="text-amber-600 dark:text-amber-500 text-[10px] tabular-nums"
                        title={new Date(reading.recordedAt).toLocaleString()}
                      >
                        {t("updatedAgo", { ago: age })}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
