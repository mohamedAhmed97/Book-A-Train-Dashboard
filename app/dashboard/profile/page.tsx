"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, Languages } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuthStore } from "@/stores/auth";
import { setLocale } from "@/i18n/actions";
import { type Locale } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SPORTS, CATEGORY_LABELS, type SportCategory } from "@/lib/sports";

const LOCALE_OPTIONS: { value: Locale; flag: string; nativeName: string; direction: "LTR" | "RTL" }[] = [
  { value: "en", flag: "🇬🇧", nativeName: "English",  direction: "LTR" },
  { value: "ar", flag: "🇸🇦", nativeName: "العربية", direction: "RTL" },
];

const CATEGORIES = Array.from(new Set(SPORTS.map((s) => s.category))) as SportCategory[];

export default function ProfilePage() {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [isSwitching, startSwitch] = useTransition();
  const { user, setAuth, token } = useAuthStore();
  const utils = trpc.useUtils();
  const { data: profile } = trpc.profile.get.useQuery();
  const { data: stats } = trpc.profile.coachStats.useQuery();

  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState("");
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  // Hydrate form from profile once loaded
  const [hydrated, setHydrated] = useState(false);
  if (profile && !hydrated) {
    setHydrated(true);
    setSelectedSports((profile.coachProfile as any)?.sports ?? []);
    setBio((profile.coachProfile as any)?.bio ?? "");
    setName(profile.name);
  }

  const update = trpc.profile.update.useMutation({
    onSuccess: (data) => {
      if (data && token) setAuth({ id: data.id, name: data.name, email: data.email, role: data.role as "COACH", avatar: data.avatar }, token);
      utils.profile.get.invalidate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const switchLocale = (next: Locale) => {
    if (next === locale) return;
    startSwitch(async () => {
      await setLocale(next);
      router.refresh();
    });
  };

  const toggleSport = (sportId: string) => {
    setSelectedSports((prev) =>
      prev.includes(sportId) ? prev.filter((s) => s !== sportId) : [...prev, sportId],
    );
  };

  const initials = user?.name.split(" ").map((n) => n[0]).join("").slice(0, 2) ?? "C";

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-7">{t("title")}</h1>

      {/* Hero */}
      <Card className="mb-5">
        <CardContent className="pt-6 flex flex-col items-center text-center">
          <div className="h-20 w-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-semibold mb-4">
            {initials}
          </div>
          <h2 className="text-xl font-semibold">{user?.name}</h2>
          <p className="text-sm text-muted-foreground">{user?.email}</p>

          {/* Display selected sports as badges */}
          {selectedSports.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 justify-center mt-3">
              {selectedSports.map((id) => {
                const sport = SPORTS.find((s) => s.id === id);
                return (
                  <span key={id} className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors bg-secondary text-secondary-foreground">
                    {sport?.label ?? id}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-3">{t("noSportsSelected")}</p>
          )}

          <Separator className="my-5" />

          <div className="grid grid-cols-3 w-full">
            {[
              { val: stats?.athleteCount ?? 0, label: t("statAthletes") },
              { val: stats?.sessionCount ?? 0, label: t("statSessions") },
              { val: stats?.subscriptionTier ?? "FREE", label: t("statPlan") },
            ].map((s, i) => (
              <div key={s.label} className={`text-center ${i < 2 ? "border-e" : ""}`}>
                <p className="text-lg font-semibold tabular-nums">{s.val}</p>
                <p className="text-[10px] text-muted-foreground tracking-wide uppercase">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Locale toggle */}
      <Card className="mb-5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Languages className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">{t("languageDirection")}</CardTitle>
              <CardDescription>{t("languageDescription")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {LOCALE_OPTIONS.map((opt) => {
              const active = locale === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => switchLocale(opt.value)}
                  disabled={isSwitching}
                  aria-pressed={active}
                  className={`group relative overflow-hidden rounded-xl border p-4 text-start transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-wait ${
                    active
                      ? "border-primary/40 bg-primary/[0.06] shadow-sm"
                      : "border-border bg-card hover:-translate-y-0.5 hover:shadow-md hover:border-primary/20"
                  }`}
                >
                  <span aria-hidden className={`pointer-events-none absolute -top-8 -end-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl transition-opacity duration-300 ${active ? "opacity-100" : "opacity-0 group-hover:opacity-70"}`} />
                  <span aria-hidden className={`absolute top-2.5 end-2.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-all duration-200 ${active ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}>
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <div className="relative flex flex-col gap-2">
                    <span className={`text-3xl leading-none transition-transform duration-300 ${active ? "scale-110" : "group-hover:scale-105"}`}>
                      {opt.flag}
                    </span>
                    <div>
                      <p className={`text-base font-semibold leading-tight ${active ? "text-foreground" : "text-foreground/90"}`} dir={opt.direction === "RTL" ? "rtl" : "ltr"}>
                        {opt.nativeName}
                      </p>
                      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                        {opt.direction}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("editProfile")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-5">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="p-name">{t("name")}</Label>
              <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            {/* Multi-select sports */}
            <div className="space-y-2">
              <div>
                <Label>{t("sports")}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">{t("sportsHint")}</p>
              </div>
              <div className="space-y-3">
                {CATEGORIES.map((cat) => {
                  const catSports = SPORTS.filter((s) => s.category === cat);
                  return (
                    <div key={cat}>
                      <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-1.5">
                        {CATEGORY_LABELS[cat]}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {catSports.map((sport) => {
                          const active = selectedSports.includes(sport.id);
                          return (
                            <button
                              key={sport.id}
                              type="button"
                              onClick={() => toggleSport(sport.id)}
                              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                                active
                                  ? "border-primary/50 bg-primary/10 text-primary"
                                  : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                              }`}
                            >
                              {active && <Check className="h-3 w-3" />}
                              {sport.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <Label htmlFor="p-bio">{t("bio")}</Label>
              <textarea
                id="p-bio"
                rows={3}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                placeholder={t("bioPlaceholder")}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            <Button
              onClick={() => update.mutate({
                name: name || undefined,
                sports: selectedSports,
                bio: bio || undefined,
              })}
              disabled={update.isPending}
            >
              {saved && <Check className="h-4 w-4" />}
              {saved ? tCommon("saved") : update.isPending ? tCommon("saving") : tCommon("saveChanges")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
