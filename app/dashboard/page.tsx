"use client";
import { trpc } from "@/lib/trpc";
import { useAuthStore } from "@/stores/auth";
import { StatCard } from "@/components/StatCard";

const STATUS_COLOR: Record<string, string> = {
  CONFIRMED: "text-accent-light bg-accent/10",
  CANCELLED: "text-coral bg-coral/10",
  PENDING: "text-amber bg-amber/10",
};

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: stats } = trpc.profile.coachStats.useQuery();
  const { data: sessions } = trpc.sessions.mySessions.useQuery({ status: "SCHEDULED" });
  const { data: athletes } = trpc.athletes.list.useQuery();

  const upcomingSessions = sessions?.slice(0, 5) ?? [];

  return (
    <div className="p-7">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <p className="text-txt2 text-xs mb-1">Welcome back 👋</p>
          <h1 className="text-txt font-bold text-2xl">{user?.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-bg3 border border-bg5 rounded-xl px-3 py-2">
            <span className="text-txt3 text-sm">🔍</span>
            <input className="bg-transparent text-txt text-sm outline-none w-36 placeholder-txt3" placeholder="Search..." />
          </div>
          <div className="relative w-8 h-8 bg-bg3 border border-bg5 rounded-xl flex items-center justify-center cursor-pointer">
            <span className="text-sm">🔔</span>
            <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-coral" />
          </div>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold cursor-pointer">
            {user?.name.charAt(0)}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-4 mb-7">
        <StatCard label="TOTAL ATHLETES" value={stats?.athleteCount ?? 0} change="Active roster" changeUp />
        <StatCard label="TOTAL SESSIONS" value={stats?.sessionCount ?? 0} change="All time" changeUp />
        <StatCard label="UPCOMING" value={stats?.upcomingCount ?? 0} change="Scheduled" changeUp />
        <StatCard label="PLAN" value={stats?.subscriptionTier ?? "FREE"} change={`${stats?.athleteCount ?? 0}/${stats?.athleteLimit ?? 5} athletes`} changeUp />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-3 gap-5">
        {/* Athletes table */}
        <div className="col-span-2 bg-bg2 border border-bg5 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-bg5 flex justify-between items-center">
            <h2 className="text-txt font-bold text-sm">Athletes</h2>
            <a href="/dashboard/athletes" className="text-primary-light text-xs hover:underline">View all →</a>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-5 px-5 py-3 border-b border-bg5 text-txt3 text-[10px] tracking-widest">
            <span className="col-span-2">ATHLETE</span>
            <span>SPORT</span>
            <span>SESSIONS</span>
            <span>PROGRESS</span>
          </div>

          {athletes?.length === 0 && (
            <p className="text-txt3 text-sm text-center py-10">No athletes yet. Add your first athlete!</p>
          )}

          {athletes?.map((ca) => {
            const totalExercises = ca.athlete.bookings.reduce((s, b) => s + b.progress.length, 0);
            const completedExercises = ca.athlete.bookings.reduce((s, b) => s + b.progress.filter((p) => p.completed).length, 0);
            const pct = totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;

            return (
              <div key={ca.id} className="grid grid-cols-5 px-5 py-3.5 border-b border-bg5 text-sm items-center hover:bg-bg3 transition-colors last:border-b-0">
                <div className="col-span-2 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {ca.athlete.user.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-txt text-xs font-medium">{ca.athlete.user.name}</p>
                    <p className="text-txt3 text-[10px]">{ca.athlete.user.email}</p>
                  </div>
                </div>
                <span className="text-txt2 text-xs">{ca.athlete.sport ?? "—"}</span>
                <span className="text-txt2 text-xs">{ca.athlete.bookings.length}</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-bg4 rounded-full">
                    <div className="h-1 rounded-full bg-accent-light" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-accent-light text-[10px] min-w-[28px]">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Today's schedule */}
        <div className="bg-bg2 border border-bg5 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-bg5">
            <h2 className="text-txt font-bold text-sm">Upcoming Sessions</h2>
          </div>
          <div className="divide-y divide-bg5">
            {upcomingSessions.length === 0 && (
              <p className="text-txt3 text-xs text-center py-8">No scheduled sessions</p>
            )}
            {upcomingSessions.map((s) => (
              <div key={s.id} className="px-5 py-3.5 flex items-center gap-3">
                <div className="text-center min-w-[40px]">
                  <p className="text-primary-light font-bold text-xs leading-tight">
                    {new Date(s.scheduledAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                  </p>
                  <p className="text-txt3 text-[9px]">
                    {new Date(s.scheduledAt).toLocaleDateString("en-US", { weekday: "short" })}
                  </p>
                </div>
                <div className="w-px h-8 bg-bg5" />
                <div className="flex-1 min-w-0">
                  <p className="text-txt text-xs font-medium truncate">{s.title}</p>
                  <p className="text-txt3 text-[10px]">{s._count.bookings} athletes</p>
                </div>
                <div className="text-txt2 text-[10px] bg-bg3 rounded-full px-2 py-0.5">
                  {s.sport}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
