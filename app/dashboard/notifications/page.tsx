"use client";
import { trpc } from "@/lib/trpc";

const TYPE_META: Record<string, { icon: string; color: string }> = {
  SESSION_REMINDER:  { icon: "📅", color: "text-primary bg-bg4" },
  SESSION_ASSIGNED:  { icon: "✅", color: "text-accent bg-accent/10" },
  SESSION_CANCELLED: { icon: "❌", color: "text-coral bg-coral/10" },
  FRIEND_REQUEST:    { icon: "🤝", color: "text-amber bg-amber/10" },
  FRIEND_ACCEPTED:   { icon: "👥", color: "text-primary-light bg-bg4" },
  WORKOUT_COMPLETED: { icon: "💪", color: "text-accent bg-accent/10" },
  COACH_MESSAGE:     { icon: "💬", color: "text-primary-dark bg-bg4" },
};

function timeAgo(date: Date | string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsPage() {
  const utils = trpc.useUtils();
  const { data: notifications, isLoading } = trpc.notifications.list.useQuery();
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => { utils.notifications.list.invalidate(); utils.notifications.unreadCount.invalidate(); },
  });
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => { utils.notifications.list.invalidate(); utils.notifications.unreadCount.invalidate(); },
  });

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  return (
    <div className="p-7 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-txt font-bold text-2xl">Notifications</h1>
          {unreadCount > 0 && <p className="text-txt3 text-xs mt-0.5">{unreadCount} unread</p>}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="text-primary-light text-sm hover:underline disabled:opacity-50"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* List */}
      <div className="bg-bg2 border border-bg5 rounded-2xl overflow-hidden shadow-sm">
        {isLoading && (
          <div className="flex items-center justify-center py-16 text-txt2 text-sm">Loading...</div>
        )}

        {!isLoading && (!notifications || notifications.length === 0) && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-4xl">🔔</span>
            <p className="text-txt2 text-sm font-medium">No notifications yet</p>
            <p className="text-txt3 text-xs">Activity from sessions and athletes will appear here</p>
          </div>
        )}

        {notifications?.map((n, idx) => {
          const meta = TYPE_META[n.type] ?? { icon: "📣", color: "text-txt2 bg-bg3" };
          return (
            <div
              key={n.id}
              onClick={() => { if (!n.read) markRead.mutate({ id: n.id }); }}
              className={`flex items-start gap-4 px-5 py-4 border-b border-bg5 last:border-b-0 cursor-pointer transition-colors hover:bg-bg3 ${!n.read ? "bg-bg4/50" : ""}`}
            >
              {/* Unread dot */}
              <div className="flex-shrink-0 mt-0.5 relative">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base ${meta.color}`}>
                  {meta.icon}
                </div>
                {!n.read && (
                  <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-bg2" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <p className={`text-sm font-medium leading-snug ${n.read ? "text-txt2" : "text-txt"}`}>
                    {n.title}
                  </p>
                  <span className="text-txt3 text-[10px] flex-shrink-0 mt-0.5">{timeAgo(n.createdAt)}</span>
                </div>
                <p className="text-txt3 text-xs mt-0.5 leading-relaxed">{n.body}</p>
                <div className="mt-1.5">
                  <span className={`text-[9px] font-medium tracking-widest uppercase px-1.5 py-0.5 rounded ${meta.color} opacity-75`}>
                    {n.type.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
