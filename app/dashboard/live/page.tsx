"use client";

import { useTranslations } from "next-intl";
import { Activity, HeartPulse } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { PageHero } from "@/components/PageHero";
import { LiveVitalsCard } from "@/components/LiveVitalsCard";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Live board — every athlete with a session today and their watch vitals as
 * they come in. The list itself is polled (sessions change slowly); each card
 * then holds its own SSE stream for the actual readings.
 */
export default function LiveVitalsPage() {
  const t = useTranslations("vitals");

  const { data: board, isLoading } = trpc.vitals.liveBoard.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  const inProgress = board?.filter((b) => !b.completed) ?? [];
  const finished = board?.filter((b) => b.completed) ?? [];
  const streaming = inProgress.filter((b) => !b.stale && b.heartRate !== null).length;

  return (
    <div className="p-7">
      <PageHero
        tone="amber"
        icon={HeartPulse}
        eyebrow={t("today")}
        title={t("liveBoardTitle")}
        subtitle={t("liveBoardSubtitle", { streaming, total: inProgress.length })}
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : (board?.length ?? 0) === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <Activity className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="font-medium">{t("noSessionsToday")}</p>
          <p className="text-muted-foreground text-sm mt-1">{t("noSessionsTodayHint")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {inProgress.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold mb-3">{t("inProgress")}</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {inProgress.map((athlete) => (
                  <LiveVitalsCard key={athlete.bookingId} athlete={athlete} />
                ))}
              </div>
            </section>
          )}

          {finished.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold mb-3">{t("completedToday")}</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {finished.map((athlete) => (
                  <LiveVitalsCard key={athlete.bookingId} athlete={athlete} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
