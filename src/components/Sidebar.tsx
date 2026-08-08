"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutDashboard, Users, CalendarDays, Plus, Bell, User, LogOut, Dumbbell, BookOpen, ClipboardList, HeartPulse } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", icon: LayoutDashboard, key: "dashboard" },
  { href: "/dashboard/athletes", icon: Users, key: "athletes" },
  { href: "/dashboard/live", icon: HeartPulse, key: "live" },
  { href: "/dashboard/sessions", icon: CalendarDays, key: "sessions" },
  { href: "/dashboard/sessions/new", icon: Plus, key: "newSession" },
  { href: "/dashboard/workouts", icon: BookOpen, key: "workouts" },
  { href: "/dashboard/tests", icon: ClipboardList, key: "tests" },
  { href: "/dashboard/notifications", icon: Bell, key: "notifications" },
  { href: "/dashboard/profile", icon: User, key: "profile" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const tApp = useTranslations("app");
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const { user, clearAuth } = useAuthStore();
  const queryClient = useQueryClient();

  function handleSignOut() {
    clearAuth();
    queryClient.clear();
  }
  const initials = user?.name.split(" ").map((n) => n[0]).join("").slice(0, 2) ?? "C";
  const { data: unread } = trpc.notifications.unreadCount.useQuery(undefined, { refetchInterval: 30_000 });

  return (
    <aside className="w-60 bg-card/80 backdrop-blur border-e flex flex-col h-screen sticky top-0 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20">
          <Dumbbell className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm leading-tight truncate">{tApp("title")}</p>
          <p className="text-muted-foreground text-[10px] tracking-wide truncate">{tApp("subtitle")}</p>
        </div>
        <ThemeToggle className="relative shrink-0" />
      </div>

      <Separator />

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const isNotifications = item.href === "/dashboard/notifications";
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 ps-4 pe-3 py-2 rounded-md text-sm transition-all duration-200",
                active
                  ? "bg-primary/[0.08] text-foreground font-medium"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground hover:ps-[1.125rem]",
              )}
            >
              <span
                className={cn(
                  "absolute start-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-e-full bg-primary transition-opacity duration-200",
                  active ? "opacity-100" : "opacity-0",
                )}
                aria-hidden
              />
              <Icon className={cn("h-4 w-4 shrink-0 transition-colors", active && "text-primary")} />
              <span className="flex-1">{tNav(item.key)}</span>
              {isNotifications && (unread?.count ?? 0) > 0 && (
                <Badge variant="destructive" className="h-5 px-1.5 text-[10px] shadow-sm">{unread!.count}</Badge>
              )}
            </Link>
          );
        })}
      </nav>

      <Separator />

      {/* User + sign out */}
      <div className="p-3 flex flex-col gap-2">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2 bg-muted/40 ring-1 ring-border/60">
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold shrink-0 ring-2 ring-primary/15">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{user?.name}</p>
            <p className="text-muted-foreground text-[10px] truncate">{user?.email}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          {tCommon("signOut")}
        </Button>
      </div>
    </aside>
  );
}
