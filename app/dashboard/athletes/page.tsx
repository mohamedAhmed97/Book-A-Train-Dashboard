"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { PageHero } from "@/components/PageHero";

export default function AthletesPage() {
  const t = useTranslations("athletes");
  const tCommon = useTranslations("common");
  const utils = trpc.useUtils();
  const { data: athletes, isLoading } = trpc.athletes.list.useQuery();
  const { data: stats } = trpc.profile.coachStats.useQuery();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const add = trpc.athletes.add.useMutation({
    onSuccess: () => { setEmail(""); utils.athletes.list.invalidate(); utils.profile.coachStats.invalidate(); },
    onError: (e) => setError(e.message),
  });
  const remove = trpc.athletes.remove.useMutation({
    onSuccess: () => { utils.athletes.list.invalidate(); utils.profile.coachStats.invalidate(); },
  });

  return (
    <div className="p-7">
      <PageHero
        tone="primary"
        icon={Users}
        eyebrow={t("rosterCapacity")}
        title={t("title")}
        subtitle={t("slotsUsed", { used: stats?.athleteCount ?? 0, limit: stats?.athleteLimit ?? 5 })}
      />

      {/* Subscription meter */}
      <div className="bg-bg2 border border-bg5 rounded-2xl p-5 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-txt font-bold text-sm">{t("rosterCapacity")}</h2>
          <span className="text-amber text-xs bg-amber/10 border border-amber/25 rounded-full px-3 py-1">
            {stats?.subscriptionTier ?? "FREE"}
          </span>
        </div>
        <div className="h-2 bg-bg4 rounded-full mb-2">
          <div className="h-2 rounded-full bg-gradient-to-r from-primary to-primary-light transition-all"
            style={{ width: `${((stats?.athleteCount ?? 0) / (stats?.athleteLimit ?? 5)) * 100}%` }} />
        </div>
        <div className="flex justify-between text-txt3 text-xs">
          <span>{t("athletesCount", { count: stats?.athleteCount ?? 0 })}</span>
          <span>{stats?.athleteLimit ?? 5} {tCommon("max")}</span>
        </div>
      </div>

      {/* Add athlete */}
      <div className="bg-bg2 border border-bg5 rounded-2xl p-5 mb-6">
        <h2 className="text-txt font-bold text-sm mb-4">{t("addByEmail")}</h2>
        <div className="flex gap-3">
          <input
            className="flex-1 bg-bg3 border border-bg5 rounded-xl px-4 py-2.5 text-txt text-sm outline-none focus:border-primary-light transition-colors placeholder-txt3"
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
          />
          <button
            onClick={() => add.mutate({ email })}
            disabled={add.isPending || !email}
            className="bg-primary text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {add.isPending ? tCommon("adding") : tCommon("add")}
          </button>
        </div>
        {error && <p className="text-coral text-xs mt-2">{error}</p>}
      </div>

      {/* Athletes table */}
      <div className="bg-bg2 border border-bg5 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-5 px-5 py-3 border-b border-bg5 text-txt3 text-[10px] tracking-widest">
          <span className="col-span-2">{t("thAthlete")}</span>
          <span>{t("thSport")}</span>
          <span>{t("thSessions")}</span>
          <span>{t("thActions")}</span>
        </div>

        {isLoading && <p className="text-txt2 text-sm text-center py-10">{tCommon("loading")}</p>}
        {!isLoading && athletes?.length === 0 && (
          <p className="text-txt3 text-sm text-center py-10">{t("empty")}</p>
        )}

        {athletes?.map((ca) => (
          <div key={ca.id} className="grid grid-cols-5 px-5 py-4 border-b border-bg5 items-center hover:bg-bg3 transition-colors last:border-b-0">
            <div className="col-span-2 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {ca.athlete.user.name.charAt(0)}
              </div>
              <div>
                <p className="text-txt text-sm font-medium">{ca.athlete.user.name}</p>
                <p className="text-txt3 text-xs">{ca.athlete.user.email}</p>
              </div>
            </div>
            <span className="text-txt2 text-sm">{ca.athlete.sport ?? "—"}</span>
            <span className="text-txt2 text-sm">{ca.athlete.bookings.length}</span>
            <button
              onClick={() => remove.mutate({ athleteProfileId: ca.athlete.id })}
              className="text-coral text-xs hover:underline w-fit"
            >
              {tCommon("remove")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
