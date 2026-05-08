"use client";
import Link from "next/link";
import { trpc } from "@/lib/trpc";

const STATUS_STYLE: Record<string, string> = {
  SCHEDULED: "text-accent-light bg-accent/10",
  ONGOING: "text-amber bg-amber/10",
  COMPLETED: "text-txt2 bg-bg4",
  CANCELLED: "text-coral bg-coral/10",
};

export default function SessionsPage() {
  const utils = trpc.useUtils();
  const { data: sessions, isLoading } = trpc.sessions.mySessions.useQuery({});
  const cancel = trpc.sessions.cancel.useMutation({
    onSuccess: () => utils.sessions.mySessions.invalidate(),
  });

  return (
    <div className="p-7">
      <div className="flex items-center justify-between mb-7">
        <h1 className="text-txt font-bold text-2xl">Sessions</h1>
        <Link href="/dashboard/sessions/new"
          className="bg-primary text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-primary-dark transition-colors">
          + New Session
        </Link>
      </div>

      <div className="bg-bg2 border border-bg5 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-6 px-5 py-3 border-b border-bg5 text-txt3 text-[10px] tracking-widest">
          <span className="col-span-2">SESSION</span>
          <span>DATE & TIME</span>
          <span>ATHLETES</span>
          <span>STATUS</span>
          <span>ACTIONS</span>
        </div>

        {isLoading && <p className="text-txt2 text-sm text-center py-10">Loading...</p>}
        {!isLoading && sessions?.length === 0 && (
          <p className="text-txt3 text-sm text-center py-10">No sessions yet. Create your first one!</p>
        )}

        {sessions?.map((s) => (
          <div key={s.id} className="grid grid-cols-6 px-5 py-4 border-b border-bg5 items-center hover:bg-bg3 transition-colors last:border-b-0">
            <div className="col-span-2">
              <p className="text-txt text-sm font-medium mb-0.5">{s.title}</p>
              <p className="text-txt3 text-xs">{s.sport} · {s.exercises.length} exercises</p>
            </div>
            <div>
              <p className="text-txt2 text-xs">
                {new Date(s.scheduledAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </p>
              <p className="text-txt3 text-xs">
                {new Date(s.scheduledAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <span className="text-txt2 text-sm">{s._count.bookings} / {s.maxAthletes}</span>
            <span className={`text-xs rounded-full px-2.5 py-1 w-fit ${STATUS_STYLE[s.status] ?? ""}`}>
              {s.status}
            </span>
            <div className="flex gap-3">
              <Link href={`/dashboard/sessions/${s.id}`} className="text-primary-light text-xs hover:underline">Edit</Link>
              {s.status === "SCHEDULED" && (
                <button onClick={() => cancel.mutate({ id: s.id })} className="text-coral text-xs hover:underline">Cancel</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
