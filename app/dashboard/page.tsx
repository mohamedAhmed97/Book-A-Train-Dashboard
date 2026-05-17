"use client";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Bell, ChevronRight, Plus, Search, Users, CalendarDays, TrendingUp, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuthStore } from "@/stores/auth";
import { dateLocaleTag, type Locale } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

function greetingKey(): "goodMorning" | "goodAfternoon" | "goodEvening" {
  const h = new Date().getHours();
  if (h < 12) return "goodMorning";
  if (h < 18) return "goodAfternoon";
  return "goodEvening";
}

type StatTone = "primary" | "emerald" | "amber" | "violet";

const STAT_TONES: Record<StatTone, { iconBg: string; iconText: string; ring: string; glow: string }> = {
  primary: {
    iconBg: "bg-gradient-to-br from-primary to-[hsl(var(--primary)/0.7)]",
    iconText: "text-primary-foreground",
    ring: "hover:ring-primary/30",
    glow: "bg-primary/15",
  },
  emerald: {
    iconBg: "bg-gradient-to-br from-emerald-500 to-emerald-600",
    iconText: "text-white",
    ring: "hover:ring-emerald-500/30",
    glow: "bg-emerald-500/15",
  },
  amber: {
    iconBg: "bg-gradient-to-br from-amber-500 to-orange-500",
    iconText: "text-white",
    ring: "hover:ring-amber-500/30",
    glow: "bg-amber-500/15",
  },
  violet: {
    iconBg: "bg-gradient-to-br from-violet-500 to-fuchsia-500",
    iconText: "text-white",
    ring: "hover:ring-violet-500/30",
    glow: "bg-violet-500/15",
  },
};

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  loading,
  tone = "primary",
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  hint?: string;
  loading?: boolean;
  tone?: StatTone;
}) {
  const t = STAT_TONES[tone];
  return (
    <Card className={`group relative overflow-hidden ring-1 ring-transparent transition-all ${t.ring}`}>
      {/* Decorative gradient glow */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -top-12 -end-12 h-32 w-32 rounded-full blur-2xl opacity-50 transition-opacity duration-300 group-hover:opacity-100 ${t.glow}`}
      />
      <CardContent className="relative pt-6">
        <div className="flex items-center justify-between mb-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ${t.iconBg} ${t.iconText}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {loading ? (
          <>
            <Skeleton className="h-7 w-16" />
            <Skeleton className="mt-2 h-3 w-24" />
            {hint !== undefined && <Skeleton className="mt-2 h-3 w-20" />}
          </>
        ) : (
          <>
            <p className="text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
            <p className="text-xs text-muted-foreground tracking-wide mt-1">{label}</p>
            {hint && <p className="text-[11px] text-muted-foreground mt-2">{hint}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AthleteRowSkeleton() {
  return (
    <div className="grid grid-cols-5 px-5 py-3 text-sm items-center">
      <div className="col-span-2 flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
      <Skeleton className="h-3 w-14" />
      <Skeleton className="h-3 w-6" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-1.5 flex-1 rounded-full" />
        <Skeleton className="h-3 w-8" />
      </div>
    </div>
  );
}

function SessionRowSkeleton() {
  return (
    <div className="px-5 py-3.5 flex items-center gap-3">
      <div className="min-w-[46px] space-y-1">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-2.5 w-8" />
      </div>
      <Separator orientation="vertical" className="h-8" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-2.5 w-1/2" />
      </div>
      <Skeleton className="h-5 w-14 rounded-full" />
    </div>
  );
}

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const tNav = useTranslations("nav");
  const locale = useLocale() as Locale;
  const user = useAuthStore((s) => s.user);
  const { data: stats } = trpc.profile.coachStats.useQuery();
  const { data: sessions } = trpc.sessions.mySessions.useQuery({ status: "SCHEDULED" });
  const { data: athletes } = trpc.athletes.list.useQuery();

  const upcomingSessions = sessions?.slice(0, 5) ?? [];
  const dateLocale = dateLocaleTag[locale];

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      {/* Top toolbar — search + notifications */}
      <div className="flex flex-wrap items-center justify-end gap-3 mb-4">
        <div className="relative">
          <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={tCommon("search")} className="ps-9 w-48 bg-card/70 backdrop-blur" />
        </div>
        <Button variant="ghost" size="icon" className="relative bg-card/70 backdrop-blur" aria-label={tNav("notifications")} asChild>
          <Link href="/dashboard/notifications">
            <Bell className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Hero banner */}
      <div className="relative mb-7 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary via-primary to-[hsl(var(--accent))] p-6 md:p-8 text-primary-foreground shadow-lg">
        {/* Decorative blobs */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-16 -end-16 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
          <div className="absolute -bottom-20 start-1/3 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <Sparkles className="absolute end-6 top-6 h-5 w-5 opacity-50" />
        </div>

        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary-foreground/80 mb-2">
              {t(greetingKey())}
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              {user?.name?.split(" ")[0] ?? "Coach"}
              <span className="text-primary-foreground/70">.</span>
            </h1>
            <p className="mt-3 text-sm md:text-base text-primary-foreground/85 max-w-md">
              {t("heroSubtitle", { sessions: stats?.upcomingCount ?? 0 })}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              asChild
              size="lg"
              className="bg-white text-primary hover:bg-white/90 hover:text-primary shadow-sm border border-white/20"
            >
              <Link href="/dashboard/sessions/new">
                <Plus className="h-4 w-4" />
                {t("newSession")}
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="bg-white/10 text-primary-foreground hover:bg-white/20 hover:text-primary-foreground border border-white/20"
            >
              <Link href="/dashboard/athletes">
                <Users className="h-4 w-4" />
                {tNav("athletes")}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
        <StatTile tone="primary" loading={stats === undefined} icon={Users} label={t("totalAthletes")} value={stats?.athleteCount ?? 0} hint={t("activeRoster")} />
        <StatTile tone="emerald" loading={stats === undefined} icon={CalendarDays} label={t("totalSessions")} value={stats?.sessionCount ?? 0} hint={t("allTime")} />
        <StatTile tone="amber" loading={stats === undefined} icon={TrendingUp} label={t("upcoming")} value={stats?.upcomingCount ?? 0} hint={t("scheduled")} />
        <StatTile tone="violet" loading={stats === undefined} icon={Sparkles} label={t("plan")} value={stats?.subscriptionTier ?? "FREE"} hint={t("athletesUsage", { used: stats?.athleteCount ?? 0, limit: stats?.athleteLimit ?? 5 })} />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Athletes table */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">{t("athletes")}</CardTitle>
            <Button variant="link" size="sm" asChild className="text-primary">
              <Link href="/dashboard/athletes">
                {t("viewAll")}
                <ChevronRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
            </Button>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            {/* Header row */}
            <div className="grid grid-cols-5 px-5 py-3 text-muted-foreground text-[11px] tracking-wider uppercase">
              <span className="col-span-2">{t("thAthlete")}</span>
              <span>{t("thSport")}</span>
              <span>{t("thSessions")}</span>
              <span>{t("thProgress")}</span>
            </div>
            <Separator />

            {athletes === undefined && (
              <>
                <AthleteRowSkeleton />
                <Separator />
                <AthleteRowSkeleton />
                <Separator />
                <AthleteRowSkeleton />
              </>
            )}

            {athletes?.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-10">{t("emptyAthletes")}</p>
            )}

            {athletes?.map((ca, idx, arr) => {
              const totalExercises = ca.athlete.bookings.reduce((s, b) => s + b.progress.length, 0);
              const completedExercises = ca.athlete.bookings.reduce(
                (s, b) => s + b.progress.filter((p) => p.completed).length,
                0,
              );
              const pct = totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;

              return (
                <div key={ca.id}>
                  <div className="grid grid-cols-5 px-5 py-3 text-sm items-center hover:bg-muted/40 transition-colors">
                    <div className="col-span-2 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold shrink-0">
                        {ca.athlete.user.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{ca.athlete.user.name}</p>
                        <p className="text-muted-foreground text-xs truncate">{ca.athlete.user.email}</p>
                      </div>
                    </div>
                    <span className="text-muted-foreground text-xs">{ca.athlete.sport ?? "—"}</span>
                    <span className="text-muted-foreground text-xs">{ca.athlete.bookings.length}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums min-w-[34px] text-end">{pct}%</span>
                    </div>
                  </div>
                  {idx < arr.length - 1 && <Separator />}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Upcoming sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("upcomingSessions")}</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            {sessions === undefined && (
              <>
                <SessionRowSkeleton />
                <Separator />
                <SessionRowSkeleton />
                <Separator />
                <SessionRowSkeleton />
              </>
            )}
            {sessions !== undefined && upcomingSessions.length === 0 && (
              <p className="text-muted-foreground text-xs text-center py-8">{t("noScheduled")}</p>
            )}
            {upcomingSessions.map((s, idx, arr) => (
              <div key={s.id}>
                <div className="px-5 py-3.5 flex items-center gap-3">
                  <div className="text-center min-w-[46px]">
                    <p className="text-primary font-semibold text-xs leading-tight tabular-nums">
                      {new Date(s.scheduledAt).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit", hour12: true })}
                    </p>
                    <p className="text-muted-foreground text-[10px]">
                      {new Date(s.scheduledAt).toLocaleDateString(dateLocale, { weekday: "short" })}
                    </p>
                  </div>
                  <Separator orientation="vertical" className="h-8" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{s.title}</p>
                    <p className="text-muted-foreground text-[10px]">{t("athletesCount", { count: s._count.bookings })}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{s.sport}</Badge>
                </div>
                {idx < arr.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
