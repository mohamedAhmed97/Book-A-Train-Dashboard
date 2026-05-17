"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";

interface ExerciseDraft {
  id?: string;
  name: string;
  sets: string;
  reps: string;
  durationSeconds: string;
  restSeconds: string;
  notes: string;
  isNew?: boolean;
}

const STATUS_STYLE: Record<string, string> = {
  SCHEDULED: "text-accent bg-accent/10 border border-accent/20",
  ONGOING: "text-amber bg-amber/10 border border-amber/20",
  COMPLETED: "text-txt2 bg-bg3 border border-bg5",
  CANCELLED: "text-coral bg-coral/10 border border-coral/20",
};

export default function SessionEditPage() {
  const t = useTranslations("sessionForm");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("sessions.status");
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const utils = trpc.useUtils();

  const { data: session, isLoading } = trpc.sessions.get.useQuery({ id });
  const { data: athletes } = trpc.athletes.list.useQuery();

  const [form, setForm] = useState({
    title: "", sport: "", description: "", location: "",
    scheduledAt: "", durationMinutes: "60", maxAthletes: "10",
  });
  const [exercises, setExercises] = useState<ExerciseDraft[]>([]);
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) return;
    const dt = new Date(session.scheduledAt);
    const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setForm({
      title: session.title,
      sport: session.sport,
      description: session.description ?? "",
      location: session.location ?? "",
      scheduledAt: local,
      durationMinutes: String(session.durationMinutes),
      maxAthletes: String(session.maxAthletes),
    });
    setExercises(
      session.exercises.map((ex) => ({
        id: ex.id,
        name: ex.name,
        sets: ex.sets != null ? String(ex.sets) : "",
        reps: ex.reps != null ? String(ex.reps) : "",
        durationSeconds: ex.durationSeconds != null ? String(ex.durationSeconds) : "",
        restSeconds: ex.restSeconds != null ? String(ex.restSeconds) : "",
        notes: ex.notes ?? "",
      }))
    );
    setAssignedIds(new Set(session.bookings.map((b) => b.athlete.id)));
  }, [session]);

  const update = trpc.sessions.update.useMutation({
    onSuccess: () => {
      utils.sessions.mySessions.invalidate();
      utils.sessions.get.invalidate({ id });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (e) => setError(e.message),
  });

  const addExercises = trpc.exercises.addMany.useMutation({
    onSuccess: () => utils.sessions.get.invalidate({ id }),
  });

  const deleteExercise = trpc.exercises.delete.useMutation({
    onSuccess: () => utils.sessions.get.invalidate({ id }),
  });

  const assignAthlete = trpc.sessions.assignAthletes.useMutation({
    onSuccess: () => utils.sessions.get.invalidate({ id }),
  });

  const removeAthlete = trpc.sessions.removeAthlete.useMutation({
    onSuccess: () => utils.sessions.get.invalidate({ id }),
  });

  const cancel = trpc.sessions.cancel.useMutation({
    onSuccess: () => { utils.sessions.mySessions.invalidate(); router.push("/dashboard/sessions"); },
  });

  const setField = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setExField = (i: number, k: string, v: string) =>
    setExercises((prev) => prev.map((ex, j) => j === i ? { ...ex, [k]: v } : ex));

  const handleSaveDetails = () => {
    setError("");
    update.mutate({
      id,
      title: form.title,
      sport: form.sport,
      description: form.description || undefined,
      location: form.location || undefined,
      scheduledAt: new Date(form.scheduledAt),
      durationMinutes: parseInt(form.durationMinutes),
      maxAthletes: parseInt(form.maxAthletes),
    });
  };

  const handleAddNewExercises = async () => {
    const newOnes = exercises.filter((ex) => ex.isNew && ex.name.trim());
    if (newOnes.length === 0) return;
    await addExercises.mutateAsync({
      sessionId: id,
      exercises: newOnes.map((ex, i) => ({
        name: ex.name, order: (session?.exercises.length ?? 0) + i + 1,
        sets: ex.sets ? parseInt(ex.sets) : undefined,
        reps: ex.reps ? parseInt(ex.reps) : undefined,
        durationSeconds: ex.durationSeconds ? parseInt(ex.durationSeconds) : undefined,
        restSeconds: ex.restSeconds ? parseInt(ex.restSeconds) : undefined,
        notes: ex.notes || undefined,
      })),
    });
    setExercises((prev) => prev.filter((ex) => !ex.isNew));
  };

  const handleDeleteExercise = (exerciseId: string) => {
    deleteExercise.mutate({ id: exerciseId });
  };

  const toggleAthlete = (athleteProfileId: string) => {
    if (assignedIds.has(athleteProfileId)) {
      removeAthlete.mutate({ sessionId: id, athleteProfileId });
      setAssignedIds((prev) => { const s = new Set(prev); s.delete(athleteProfileId); return s; });
    } else {
      assignAthlete.mutate({ sessionId: id, athleteProfileIds: [athleteProfileId] });
      setAssignedIds((prev) => new Set([...prev, athleteProfileId]));
    }
  };

  if (isLoading) {
    return (
      <div className="p-7 flex items-center justify-center h-64">
        <div className="text-txt2 text-sm">{tCommon("loadingSession")}</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-7">
        <p className="text-coral text-sm">{t("notFound")}</p>
        <Link href="/dashboard/sessions" className="text-primary-light text-sm hover:underline mt-2 inline-block">{t("backToSessions")}</Link>
      </div>
    );
  }

  const isCancelled = session.status === "CANCELLED";

  return (
    <div className="p-7 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-7">
        <button onClick={() => router.back()} aria-label={tCommon("back")}
          className="w-9 h-9 bg-bg2 border border-bg5 rounded-xl flex items-center justify-center text-txt2 hover:text-txt hover:border-primary/30 transition-colors shadow-sm">
          ←
        </button>
        <div className="flex-1">
          <h1 className="text-txt font-bold text-2xl">{session.title}</h1>
          <p className="text-txt3 text-xs mt-0.5">{session.sport}</p>
        </div>
        <span className={`text-xs rounded-full px-3 py-1 font-medium ${STATUS_STYLE[session.status] ?? ""}`}>
          {tStatus(session.status)}
        </span>
        {!isCancelled && (
          <button onClick={() => cancel.mutate({ id })} disabled={cancel.isPending}
            className="text-coral text-xs border border-coral/30 rounded-xl px-3 py-1.5 hover:bg-coral/10 transition-colors">
            {t("cancelSession")}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-5">
        {/* Session details */}
        <div className="bg-bg2 border border-bg5 rounded-2xl p-5 shadow-sm">
          <h2 className="text-txt font-bold text-sm mb-4">{t("sessionDetails")}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-txt2 text-xs tracking-widest block mb-1.5">{t("titleLabelOptional")}</label>
              <input disabled={isCancelled}
                className="w-full bg-bg3 border border-bg5 rounded-xl px-4 py-2.5 text-txt text-sm outline-none focus:border-primary-light transition-colors placeholder-txt3 disabled:opacity-60"
                value={form.title} onChange={(e) => setField("title", e.target.value)} />
            </div>
            <div>
              <label className="text-txt2 text-xs tracking-widest block mb-1.5">{t("sportLabelOptional")}</label>
              <input disabled={isCancelled}
                className="w-full bg-bg3 border border-bg5 rounded-xl px-4 py-2.5 text-txt text-sm outline-none focus:border-primary-light transition-colors placeholder-txt3 disabled:opacity-60"
                value={form.sport} onChange={(e) => setField("sport", e.target.value)} />
            </div>
            <div>
              <label className="text-txt2 text-xs tracking-widest block mb-1.5">{t("locationLabel")}</label>
              <input disabled={isCancelled}
                className="w-full bg-bg3 border border-bg5 rounded-xl px-4 py-2.5 text-txt text-sm outline-none focus:border-primary-light transition-colors placeholder-txt3 disabled:opacity-60"
                placeholder={tCommon("optional")} value={form.location} onChange={(e) => setField("location", e.target.value)} />
            </div>
            <div>
              <label className="text-txt2 text-xs tracking-widest block mb-1.5">{t("dateTimeLabelOptional")}</label>
              <input type="datetime-local" disabled={isCancelled}
                className="w-full bg-bg3 border border-bg5 rounded-xl px-4 py-2.5 text-txt text-sm outline-none focus:border-primary-light transition-colors disabled:opacity-60"
                value={form.scheduledAt} onChange={(e) => setField("scheduledAt", e.target.value)} />
            </div>
            <div>
              <label className="text-txt2 text-xs tracking-widest block mb-1.5">{t("durationMinLabel")}</label>
              <input type="number" min="15" max="480" disabled={isCancelled}
                className="w-full bg-bg3 border border-bg5 rounded-xl px-4 py-2.5 text-txt text-sm outline-none focus:border-primary-light transition-colors disabled:opacity-60"
                value={form.durationMinutes} onChange={(e) => setField("durationMinutes", e.target.value)} />
            </div>
            <div>
              <label className="text-txt2 text-xs tracking-widest block mb-1.5">{t("maxAthletesLabel")}</label>
              <input type="number" min="1" max="100" disabled={isCancelled}
                className="w-full bg-bg3 border border-bg5 rounded-xl px-4 py-2.5 text-txt text-sm outline-none focus:border-primary-light transition-colors disabled:opacity-60"
                value={form.maxAthletes} onChange={(e) => setField("maxAthletes", e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="text-txt2 text-xs tracking-widest block mb-1.5">{t("descriptionLabel")}</label>
              <textarea rows={2} disabled={isCancelled}
                className="w-full bg-bg3 border border-bg5 rounded-xl px-4 py-2.5 text-txt text-sm outline-none focus:border-primary-light transition-colors resize-none placeholder-txt3 disabled:opacity-60"
                placeholder={t("descriptionPlaceholder")} value={form.description} onChange={(e) => setField("description", e.target.value)} />
            </div>
          </div>

          {error && <p className="text-coral text-xs mt-3">{error}</p>}

          {!isCancelled && (
            <button onClick={handleSaveDetails} disabled={update.isPending}
              className="mt-4 bg-primary text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-60">
              {saved ? t("savedBang") : update.isPending ? t("savingDots") : t("saveDetails")}
            </button>
          )}
        </div>

        {/* Exercises */}
        <div className="bg-bg2 border border-bg5 rounded-2xl p-5 shadow-sm">
          <h2 className="text-txt font-bold text-sm mb-4">
            {t("exercises")}
            <span className="ml-2 text-txt3 font-normal text-xs">{t("exercisesSaved", { count: exercises.filter((e) => !e.isNew).length })}</span>
          </h2>

          <div className="flex flex-col gap-3 mb-3">
            {exercises.map((ex, i) => (
              <div key={ex.id ?? `new-${i}`}
                className={`border rounded-xl p-4 ${ex.isNew ? "bg-bg4 border-primary/20" : "bg-bg3 border-bg5"}`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <input
                    className="flex-1 bg-bg2 border border-bg5 rounded-lg px-3 py-1.5 text-txt text-sm outline-none focus:border-primary-light transition-colors placeholder-txt3"
                    placeholder={t("exerciseNamePlaceholder")} value={ex.name}
                    onChange={(e) => setExField(i, "name", e.target.value)}
                    disabled={!ex.isNew && !isCancelled ? false : isCancelled}
                  />
                  {ex.isNew ? (
                    <span className="text-xs text-primary-light bg-bg4 border border-primary/20 rounded-full px-2 py-0.5">{tCommon("new")}</span>
                  ) : !isCancelled && (
                    <button type="button" onClick={() => handleDeleteExercise(ex.id!)}
                      disabled={deleteExercise.isPending}
                      className="text-coral hover:bg-coral/10 rounded-lg p-1 transition-colors text-sm">
                      ×
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { k: "sets", placeholder: t("sets") },
                    { k: "reps", placeholder: t("reps") },
                    { k: "durationSeconds", placeholder: t("durationSeconds") },
                    { k: "restSeconds", placeholder: t("restSeconds") },
                  ].map(({ k, placeholder }) => (
                    <input key={k} type="number" min="0"
                      className="bg-bg2 border border-bg5 rounded-lg px-3 py-1.5 text-txt text-xs outline-none focus:border-primary-light transition-colors placeholder-txt3"
                      placeholder={placeholder} value={ex[k as keyof ExerciseDraft] as string}
                      onChange={(e) => setExField(i, k, e.target.value)}
                      disabled={isCancelled}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {!isCancelled && (
            <div className="flex gap-3">
              <button type="button"
                onClick={() => setExercises((prev) => [...prev, { name: "", sets: "", reps: "", durationSeconds: "", restSeconds: "", notes: "", isNew: true }])}
                className="flex-1 py-2.5 border border-dashed border-bg5 rounded-xl text-txt2 text-sm hover:border-primary-light hover:text-primary-light transition-colors">
                {t("addExercise")}
              </button>
              {exercises.some((e) => e.isNew) && (
                <button type="button" onClick={handleAddNewExercises} disabled={addExercises.isPending}
                  className="bg-accent text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60">
                  {addExercises.isPending ? t("savingDots") : t("saveNew")}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Athletes */}
        {athletes && athletes.length > 0 && (
          <div className="bg-bg2 border border-bg5 rounded-2xl p-5 shadow-sm">
            <h2 className="text-txt font-bold text-sm mb-1">{t("assignedAthletes")}</h2>
            <p className="text-txt3 text-xs mb-4">{t("slotsFilled", { filled: session._count.bookings, total: session.maxAthletes })}</p>
            <div className="flex flex-col gap-2">
              {athletes.map((ca) => {
                const isAssigned = assignedIds.has(ca.athlete.id);
                return (
                  <div key={ca.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${isAssigned ? "bg-accent/5 border-accent/20" : "bg-bg3 border-bg5"}`}>
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {ca.athlete.user.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-txt text-sm font-medium">{ca.athlete.user.name}</p>
                      <p className="text-txt3 text-xs">{ca.athlete.sport ?? t("athleteFallback")}</p>
                    </div>
                    {!isCancelled && (
                      <button onClick={() => toggleAthlete(ca.athlete.id)}
                        disabled={assignAthlete.isPending || removeAthlete.isPending}
                        className={`text-xs rounded-full px-3 py-1 font-medium transition-colors ${isAssigned ? "bg-accent text-white hover:opacity-80" : "bg-bg4 text-txt2 hover:bg-primary/10 hover:text-primary"}`}>
                        {isAssigned ? t("assigned") : t("assign")}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
