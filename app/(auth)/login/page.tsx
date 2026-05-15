"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Dumbbell, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuthStore } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginPage() {
  const t = useTranslations("login");
  const tCommon = useTranslations("common");
  const tApp = useTranslations("app");
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", sport: "" });
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const login = trpc.auth.login.useMutation({
    onSuccess: (d) => { setAuth(d.user, d.token); router.push("/dashboard"); },
    onError: (e) => setError(e.message),
  });
  const register = trpc.auth.register.useMutation({
    onSuccess: (d) => { setAuth(d.user, d.token); router.push("/dashboard"); },
    onError: (e) => setError(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (mode === "login") login.mutate({ email: form.email, password: form.password });
    else register.mutate({ name: form.name, email: form.email, password: form.password, role: "COACH", sport: form.sport || undefined });
  };

  const loading = login.isPending || register.isPending;

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      {/* Subtle ambient gradients */}
      <div className="pointer-events-none absolute -top-32 -end-32 h-80 w-80 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -start-32 h-80 w-80 rounded-full bg-accent/15 blur-3xl" />

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="items-center text-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Dumbbell className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-2xl">{t("coachPortal")}</CardTitle>
            <CardDescription>{tApp("title")}</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          {/* Tab switch */}
          <div className="flex rounded-lg border bg-muted p-1">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                  mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "login" ? t("signIn") : t("register")}
              </button>
            ))}
          </div>

          <div className="text-center">
            <h2 className="text-xl font-semibold">
              {mode === "login" ? t("welcomeBack") : t("createAccount")}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "login" ? t("signInSubtitle") : t("registerSubtitle")}
            </p>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-4">
            {mode === "register" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="name">{t("name")}</Label>
                  <Input id="name" placeholder={t("namePlaceholder")} value={form.name} onChange={(e) => set("name", e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sport">{t("sport")}</Label>
                  <Input id="sport" placeholder={t("sportPlaceholder")} value={form.sport} onChange={(e) => set("sport", e.target.value)} />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">{t("email")}</Label>
              <Input id="email" type="email" autoComplete="email" placeholder={t("emailPlaceholder")}
                value={form.email} onChange={(e) => set("email", e.target.value)} required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">{t("password")}</Label>
              <Input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder={t("passwordPlaceholder")} value={form.password} onChange={(e) => set("password", e.target.value)} required />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? tCommon("pleaseWait") : mode === "login" ? t("signIn") : t("createAccountBtn")}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            {t("demo")} <span className="font-mono">demo-coach@bat.dev</span> / <span className="font-mono">password123</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
