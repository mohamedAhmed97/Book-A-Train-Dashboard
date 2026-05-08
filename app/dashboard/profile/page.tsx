"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuthStore } from "@/stores/auth";

export default function ProfilePage() {
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

  const initials = user?.name.split(" ").map((n) => n[0]).join("").slice(0, 2) ?? "C";

  return (
    <div className="p-7 max-w-2xl">
      <h1 className="text-txt font-bold text-2xl mb-7">Profile</h1>

      {/* Hero */}
      <div className="bg-bg2 border border-bg5 rounded-2xl p-6 mb-5 flex flex-col items-center text-center">
        <div className="relative mb-4">
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold">
            {initials}
          </div>
          <button className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary-light flex items-center justify-center text-xs">✏️</button>
        </div>
        <h2 className="text-txt font-bold text-xl mb-0.5">{user?.name}</h2>
        <p className="text-txt2 text-sm mb-1">{user?.email}</p>
        {profile?.coachProfile?.sport && (
          <span className="text-xs text-primary-light bg-primary/20 border border-primary-light/25 rounded-full px-3 py-1">
            {profile.coachProfile.sport}
          </span>
        )}

        {/* Stats */}
        <div className="flex w-full border-t border-bg5 mt-5 pt-4">
          {[
            { val: stats?.athleteCount ?? 0, label: "ATHLETES" },
            { val: stats?.sessionCount ?? 0, label: "SESSIONS" },
            { val: stats?.subscriptionTier ?? "FREE", label: "PLAN" },
          ].map((s, i) => (
            <div key={s.label} className={`flex-1 text-center ${i < 2 ? "border-r border-bg5" : ""}`}>
              <p className="text-txt font-bold text-lg">{s.val}</p>
              <p className="text-txt3 text-[9px] tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Edit form */}
      <div className="bg-bg2 border border-bg5 rounded-2xl p-5">
        <h2 className="text-txt font-bold text-sm mb-4">Edit Profile</h2>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-txt2 text-xs tracking-widest block mb-1.5">NAME</label>
            <input className="w-full bg-bg3 border border-bg5 rounded-xl px-4 py-2.5 text-txt text-sm outline-none focus:border-primary-light transition-colors"
              value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-txt2 text-xs tracking-widest block mb-1.5">SPORT</label>
            <input className="w-full bg-bg3 border border-bg5 rounded-xl px-4 py-2.5 text-txt text-sm outline-none focus:border-primary-light transition-colors placeholder-txt3"
              placeholder={profile?.coachProfile?.sport ?? "Swimming"} value={form.sport}
              onChange={(e) => setForm((f) => ({ ...f, sport: e.target.value }))} />
          </div>
          <div>
            <label className="text-txt2 text-xs tracking-widest block mb-1.5">BIO</label>
            <textarea rows={3} className="w-full bg-bg3 border border-bg5 rounded-xl px-4 py-2.5 text-txt text-sm outline-none focus:border-primary-light transition-colors resize-none placeholder-txt3"
              placeholder={profile?.coachProfile?.bio ?? "Tell athletes about yourself..."}
              value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
          </div>
          <button
            onClick={() => update.mutate({ name: form.name || undefined, sport: form.sport || undefined, bio: form.bio || undefined })}
            disabled={update.isPending}
            className="bg-primary text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-60"
          >
            {saved ? "✓ Saved!" : update.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
