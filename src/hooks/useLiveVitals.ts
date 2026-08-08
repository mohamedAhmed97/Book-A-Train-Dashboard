"use client";

import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { zoneForHeartRate, type VitalMetric, type Zone } from "@/lib/vitals";

/**
 * Subscribes to one booking's live watch vitals over server-sent events.
 *
 * The API pushes a snapshot on connect and then an event per uploaded batch.
 * EventSource can't send an Authorization header, so the connection is
 * authenticated with a short-lived, booking-scoped token fetched over tRPC.
 */

export interface LiveReading {
  value: number;
  unit: string;
  recordedAt: number;
}

export type ConnectionState = "connecting" | "open" | "closed" | "error";

interface LiveVitalsResult {
  connection: ConnectionState;
  latest: Record<string, LiveReading>;
  heartRate: number | null;
  zone: Zone | null;
  maxHeartRate: number;
  /** Rolling HR history for the sparkline, oldest first. */
  series: Array<{ value: number; at: number }>;
  lastEventAt: number | null;
}

/** Keeps the sparkline bounded — roughly the last few hundred readings. */
const MAX_SERIES = 300;

/** Base API origin, derived from the tRPC URL (…/trpc → …). */
function apiOrigin(): string {
  const url = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/trpc";
  return url.replace(/\/trpc\/?$/, "");
}

export function useLiveVitals(bookingId: string | null, enabled = true): LiveVitalsResult {
  const [connection, setConnection] = useState<ConnectionState>("closed");
  const [latest, setLatest] = useState<Record<string, LiveReading>>({});
  const [series, setSeries] = useState<Array<{ value: number; at: number }>>([]);
  const [maxHeartRate, setMaxHeartRate] = useState(190);
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  const active = enabled && !!bookingId;

  const { data: tokenData } = trpc.vitals.liveStreamToken.useQuery(
    { bookingId: bookingId ?? "" },
    {
      enabled: active,
      // The token is good for 10 minutes; refresh comfortably inside that so a
      // long-running board never drops on expiry.
      refetchInterval: 8 * 60_000,
      refetchOnWindowFocus: false,
      retry: false,
    },
  );

  useEffect(() => {
    if (!active || !tokenData?.token || !bookingId) return;

    const url = `${apiOrigin()}/api/vitals/live/${encodeURIComponent(bookingId)}?token=${encodeURIComponent(tokenData.token)}`;
    const source = new EventSource(url);
    sourceRef.current = source;
    setConnection("connecting");

    const applySamples = (
      samples: Array<{ metric: VitalMetric; value: number; unit: string; recordedAt: string }>,
    ) => {
      if (samples.length === 0) return;

      setLatest((prev) => {
        const next = { ...prev };
        for (const s of samples) {
          const at = new Date(s.recordedAt).getTime();
          const current = next[s.metric];
          // Batches can arrive out of order — only ever move forward in time.
          if (!current || at >= current.recordedAt) {
            next[s.metric] = { value: s.value, unit: s.unit, recordedAt: at };
          }
        }
        return next;
      });

      const hrPoints = samples
        .filter((s) => s.metric === "HEART_RATE")
        .map((s) => ({ value: s.value, at: new Date(s.recordedAt).getTime() }));
      if (hrPoints.length > 0) {
        setSeries((prev) =>
          [...prev, ...hrPoints].sort((a, b) => a.at - b.at).slice(-MAX_SERIES),
        );
      }
      setLastEventAt(Date.now());
    };

    source.addEventListener("open", () => setConnection("open"));

    source.addEventListener("snapshot", (event) => {
      setConnection("open");
      try {
        const data = JSON.parse((event as MessageEvent).data);
        if (typeof data.maxHeartRate === "number") setMaxHeartRate(data.maxHeartRate);
        applySamples(data.samples ?? []);
      } catch {
        // Malformed frame — skip it rather than tearing down the stream.
      }
    });

    source.addEventListener("vitals", (event) => {
      setConnection("open");
      try {
        applySamples(JSON.parse((event as MessageEvent).data).samples ?? []);
      } catch {
        // As above.
      }
    });

    // EventSource reconnects on its own; surface the gap without closing.
    source.onerror = () => setConnection("error");

    return () => {
      source.close();
      sourceRef.current = null;
      setConnection("closed");
    };
  }, [active, bookingId, tokenData?.token]);

  const hr = latest.HEART_RATE?.value ?? null;

  return {
    connection,
    latest,
    heartRate: hr,
    zone: hr !== null ? zoneForHeartRate(hr, maxHeartRate) : null,
    maxHeartRate,
    series,
    lastEventAt,
  };
}
