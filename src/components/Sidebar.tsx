"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/lib/trpc";

const NAV = [
  { href: "/dashboard", icon: "⊞", label: "Dashboard" },
  { href: "/dashboard/athletes", icon: "👥", label: "Athletes" },
  { href: "/dashboard/sessions", icon: "📅", label: "Sessions" },
  { href: "/dashboard/sessions/new", icon: "＋", label: "New Session" },
  { href: "/dashboard/notifications", icon: "🔔", label: "Notifications" },
  { href: "/dashboard/profile", icon: "👤", label: "Profile" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();
  const initials = user?.name.split(" ").map((n) => n[0]).join("").slice(0, 2) ?? "C";
  const { data: unread } = trpc.notifications.unreadCount.useQuery(undefined, { refetchInterval: 30_000 });

  return (
    <aside className="w-52 bg-bg2 border-r border-bg5 flex flex-col h-screen sticky top-0 flex-shrink-0 shadow-sm">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-bg5">
        <svg width="32" height="32" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
          <circle cx="200" cy="200" r="195" fill="#185FA5" />
          <text x="200" y="182" textAnchor="middle" fontFamily="system-ui,sans-serif" fontSize="100" fontWeight="500" fill="white" letterSpacing="-2">Ba</text>
          <text x="200" y="268" textAnchor="middle" fontFamily="system-ui,sans-serif" fontSize="100" fontWeight="500" fill="white" letterSpacing="-2">T</text>
          <rect x="135" y="278" width="130" height="6" rx="3" fill="#1D9E75" />
        </svg>
        <div>
          <p className="text-primary-dark font-bold text-sm leading-tight">Book a Train</p>
          <p className="text-txt3 text-[9px] tracking-wide">Coach Portal</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const isNotifications = item.href === "/dashboard/notifications";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                active
                  ? "bg-bg4 text-primary-dark font-semibold border border-primary/20"
                  : "text-txt2 hover:bg-bg3 hover:text-txt"
              }`}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {isNotifications && (unread?.count ?? 0) > 0 && (
                <span className="bg-coral text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                  {unread!.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User + sign out */}
      <div className="p-3 border-t border-bg5">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl mb-1">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-txt text-xs font-semibold truncate">{user?.name}</p>
            <p className="text-txt3 text-[10px] truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={clearAuth}
          className="w-full text-left px-3 py-2 rounded-xl text-coral text-xs hover:bg-coral/10 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
