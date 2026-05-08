"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { useAuthStore } from "@/stores/auth";

export default function LoginPage() {
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
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      {/* Glow */}
      <div className="absolute top-[-120px] right-[-100px] w-80 h-80 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(21,101,192,0.2) 0%, transparent 70%)" }} />

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex flex-col items-center justify-center">
            <span className="text-white font-bold text-[9px] leading-tight">Book a</span>
            <span className="text-white font-bold text-xs leading-tight">Train</span>
          </div>
          <span className="text-txt font-bold text-lg">Coach Portal</span>
        </div>

        {/* Tab switch */}
        <div className="flex bg-bg3 rounded-xl p-1 mb-6">
          {(["login", "register"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${mode === m ? "bg-bg5 text-txt" : "text-txt2"}`}>
              {m === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        <h1 className="text-txt font-bold text-2xl mb-1">{mode === "login" ? "Welcome back 👋" : "Join as Coach 🎽"}</h1>
        <p className="text-txt2 text-sm mb-6">{mode === "login" ? "Sign in to manage your athletes" : "Start coaching your team"}</p>

        <form onSubmit={submit} className="flex flex-col gap-4">
          {mode === "register" && (
            <>
              <div>
                <label className="text-txt2 text-xs tracking-widest block mb-1.5">NAME</label>
                <input className="w-full bg-bg3 border border-bg5 rounded-xl px-4 py-3 text-txt text-sm outline-none focus:border-primary-light transition-colors"
                  placeholder="Sara Khalil" value={form.name} onChange={(e) => set("name", e.target.value)} required />
              </div>
              <div>
                <label className="text-txt2 text-xs tracking-widest block mb-1.5">SPORT / SPECIALIZATION</label>
                <input className="w-full bg-bg3 border border-bg5 rounded-xl px-4 py-3 text-txt text-sm outline-none focus:border-primary-light transition-colors"
                  placeholder="Swimming, Running..." value={form.sport} onChange={(e) => set("sport", e.target.value)} />
              </div>
            </>
          )}
          <div>
            <label className="text-txt2 text-xs tracking-widest block mb-1.5">EMAIL</label>
            <input type="email" className="w-full bg-bg3 border border-primary-light/30 rounded-xl px-4 py-3 text-txt text-sm outline-none focus:border-primary-light transition-colors"
              placeholder="coach@example.com" value={form.email} onChange={(e) => set("email", e.target.value)} required />
          </div>
          <div>
            <label className="text-txt2 text-xs tracking-widest block mb-1.5">PASSWORD</label>
            <input type="password" className="w-full bg-bg3 border border-bg5 rounded-xl px-4 py-3 text-txt text-sm outline-none focus:border-primary-light transition-colors"
              placeholder="••••••••" value={form.password} onChange={(e) => set("password", e.target.value)} required />
          </div>

          {error && <p className="text-coral text-sm">{error}</p>}

          <button type="submit" disabled={loading}
            className="bg-primary text-white rounded-2xl py-3.5 font-bold text-sm tracking-wide hover:bg-primary-dark transition-colors disabled:opacity-60">
            {loading ? "..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <p className="text-txt3 text-xs text-center mt-6">Demo: sara@bat.dev / password123</p>
      </div>
    </div>
  );
}
