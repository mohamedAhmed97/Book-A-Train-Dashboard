"use client";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { dateLocaleTag, type Locale } from "@/i18n/routing";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/button";

const STATUS_STYLE: Record<string, string> = {
  SCHEDULED: "text-accent-light bg-accent/10",
  ONGOING: "text-amber bg-amber/10",
  COMPLETED: "text-txt2 bg-bg4",
  CANCELLED: "text-coral bg-coral/10",
};

export default function SessionsPage() {
  const t = useTranslations("sessions");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("sessions.status");
  const locale = useLocale() as Locale;
  const dateLocale = dateLocaleTag[locale];
  const utils = trpc.useUtils();
  const { data: sessions, isLoading } = trpc.sessions.mySessions.useQuery({});
  const cancel = trpc.sessions.cancel.useMutation({
    onSuccess: () => utils.sessions.mySessions.invalidate(),
  });

  const totalCount = sessions?.length ?? 0;
  const scheduledCount = sessions?.filter((s) => s.status === "SCHEDULED").length ?? 0;

  return (
    <div className="p-7">
      <PageHero
        tone="emerald"
        icon={CalendarDays}
        eyebrow={tStatus("SCHEDULED")}
        title={t("title")}
        subtitle={
          isLoading
            ? tCommon("loading")
            : `${scheduledCount} ${tStatus("SCHEDULED")} · ${totalCount} ${t("title")}`
        }
        action={
          <Button
            asChild
            size="lg"
            className="bg-white text-emerald-700 hover:bg-white/90 hover:text-emerald-700 shadow-sm border border-white/20"
          >
            <Link href="/dashboard/sessions/new">
              <Plus className="h-4 w-4" />
              {t("newSession")}
            </Link>
          </Button>
        }
      />

      <div className="bg-bg2 border border-bg5 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-6 px-5 py-3 border-b border-bg5 text-txt3 text-[10px] tracking-widest">
          <span className="col-span-2">{t("thSession")}</span>
          <span>{t("thDateTime")}</span>
          <span>{t("thAthletes")}</span>
          <span>{t("thStatus")}</span>
          <span>{t("thActions")}</span>
        </div>

        {isLoading && <p className="text-txt2 text-sm text-center py-10">{tCommon("loading")}</p>}
        {!isLoading && sessions?.length === 0 && (
          <p className="text-txt3 text-sm text-center py-10">{t("empty")}</p>
        )}

        {sessions?.map((s) => (
          <div key={s.id} className="grid grid-cols-6 px-5 py-4 border-b border-bg5 items-center hover:bg-bg3 transition-colors last:border-b-0">
            <div className="col-span-2">
              <p className="text-txt text-sm font-medium mb-0.5">{s.title}</p>
              <p className="text-txt3 text-xs">{s.sport} · {t("exercises", { count: s.exercises.length })}</p>
            </div>
            <div>
              <p className="text-txt2 text-xs">
                {new Date(s.scheduledAt).toLocaleDateString(dateLocale, { weekday: "short", month: "short", day: "numeric" })}
              </p>
              <p className="text-txt3 text-xs">
                {new Date(s.scheduledAt).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <span className="text-txt2 text-sm">{s._count.bookings} / {s.maxAthletes}</span>
            <span className={`text-xs rounded-full px-2.5 py-1 w-fit ${STATUS_STYLE[s.status] ?? ""}`}>
              {tStatus(s.status)}
            </span>
            <div className="flex gap-3">
              <Link href={`/dashboard/sessions/${s.id}`} className="text-primary-light text-xs hover:underline">{t("edit")}</Link>
              {s.status === "SCHEDULED" && (
                <button onClick={() => cancel.mutate({ id: s.id })} className="text-coral text-xs hover:underline">{t("cancel")}</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
