"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { useAuthStore } from "@/stores/auth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  useEffect(() => {
    if (hasHydrated && !token) router.replace("/login");
  }, [hasHydrated, token, router]);

  if (!hasHydrated || !token) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      <Sidebar />
      <main className="relative flex-1 overflow-y-auto">
        {/* Ambient gradient orbs — decorative, behind content */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -start-32 h-[480px] w-[480px] rounded-full bg-primary/20 blur-3xl opacity-60 dark:opacity-40" />
          <div className="absolute -top-20 end-1/4 h-[320px] w-[320px] rounded-full bg-accent/20 blur-3xl opacity-50 dark:opacity-30" />
          <div className="absolute top-1/3 -end-24 h-[400px] w-[400px] rounded-full bg-fuchsia-500/15 blur-3xl opacity-50 dark:opacity-25" />
        </div>
        <div className="relative min-h-full">{children}</div>
      </main>
    </div>
  );
}
