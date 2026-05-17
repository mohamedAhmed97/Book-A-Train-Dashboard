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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const LOCALE_OPTIONS: { value: Locale; flag: string; nativeName: string; direction: "LTR" | "RTL" }[] = [
  { value: "en", flag: "🇬🇧", nativeName: "English",  direction: "LTR" },
  { value: "ar", flag: "🇸🇦", nativeName: "العربية", direction: "RTL" },
];

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

  const [form, setForm] = useState({ name: user?.name ?? "", phone: "", sport: "", bio: "" });
  const [saved, setSaved] = useState(false);

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
          {profile?.coachProfile?.sport && (
            <Badge variant="secondary" className="mt-3">{profile.coachProfile.sport}</Badge>
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
                  {/* Decorative glow */}
                  <span
                    aria-hidden
                    className={`pointer-events-none absolute -top-8 -end-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl transition-opacity duration-300 ${
                      active ? "opacity-100" : "opacity-0 group-hover:opacity-70"
                    }`}
                  />

                  {/* Check badge */}
                  <span
                    aria-hidden
                    className={`absolute top-2.5 end-2.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-all duration-200 ${
                      active ? "scale-100 opacity-100" : "scale-50 opacity-0"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </span>

                  <div className="relative flex flex-col gap-2">
                    <span
                      className={`text-3xl leading-none transition-transform duration-300 ${
                        active ? "scale-110" : "group-hover:scale-105"
                      }`}
                    >
                      {opt.flag}
                    </span>
                    <div>
                      <p
                        className={`text-base font-semibold leading-tight ${active ? "text-foreground" : "text-foreground/90"}`}
                        dir={opt.direction === "RTL" ? "rtl" : "ltr"}
                      >
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
          <div className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">{t("name")}</Label>
              <Input id="p-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-sport">{t("sport")}</Label>
              <Input id="p-sport" placeholder={profile?.coachProfile?.sport ?? t("sportPlaceholder")} value={form.sport}
                onChange={(e) => setForm((f) => ({ ...f, sport: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-bio">{t("bio")}</Label>
              <textarea
                id="p-bio"
                rows={3}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                placeholder={profile?.coachProfile?.bio ?? t("bioPlaceholder")}
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              />
            </div>
            <Button
              onClick={() => update.mutate({ name: form.name || undefined, sport: form.sport || undefined, bio: form.bio || undefined })}
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
