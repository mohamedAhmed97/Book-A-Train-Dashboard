"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BookOpen, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  SPORTS, SPORT_MAP, WOD_OPTIONS, getExerciseFields, findSport,
  type FieldConfig,
} from "@/lib/sports";

interface ExerciseDraft {
  id?: string;
  name: string;
  sets: string;
  reps: string;
  durationSeconds: string;
  restSeconds: string;
  notes: string;
  wodType: string;
  isNew?: boolean;
}

const EMPTY_EXERCISE: ExerciseDraft = {
  name: "", sets: "", reps: "", durationSeconds: "", restSeconds: "", notes: "", wodType: "",
};

function LibraryPicker({ onSelect, onClose }: {
  onSelect: (name: string, sets: string, reps: string, durationSeconds: string, restSeconds: string, notes: string) => void;
  onClose: () => void;
}) {
  const { data: templates = [] } = trpc.workoutTemplates.list.useQuery();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute z-20 top-full mt-1 start-0 w-64 bg-bg2 border border-bg5 rounded-xl shadow-lg overflow-hidden">
      {templates.length === 0 ? (
        <p className="text-txt3 text-xs px-4 py-3">No saved workouts yet. Add them in the Workouts page.</p>
      ) : (
        <div className="max-h-56 overflow-y-auto">
          {templates.map((tmpl) => {
            const detail = [
              tmpl.sets ? `${tmpl.sets} sets` : null,
              tmpl.reps ? `${tmpl.reps} reps` : null,
              tmpl.durationSeconds ? `${tmpl.durationSeconds}s` : null,
              tmpl.restSeconds ? `${tmpl.restSeconds}s rest` : null,
            ].filter(Boolean).join(" · ");
            return (
              <button key={tmpl.id}
                className="w-full text-start px-4 py-2.5 hover:bg-bg3 transition-colors border-b border-bg5 last:border-b-0"
                onClick={() => {
                  onSelect(
                    tmpl.name,
                    tmpl.sets != null ? String(tmpl.sets) : "",
                    tmpl.reps != null ? String(tmpl.reps) : "",
                    tmpl.durationSeconds != null ? String(tmpl.durationSeconds) : "",
                    tmpl.restSeconds != null ? String(tmpl.restSeconds) : "",
                    tmpl.notes ?? "",
                  );
                  onClose();
                }}>
                <p className="text-txt text-sm font-medium">{tmpl.name}</p>
                {detail && <p className="text-txt3 text-[10px] mt-0.5">{detail}</p>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
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
  const { data: profile } = trpc.profile.get.useQuery();

  const coachSports: string[] = (profile?.coachProfile as any)?.sports ?? [];

  const [form, setForm] = useState({
    title: "", sport: "", description: "", location: "",
    scheduledAt: "", durationMinutes: "60", maxAthletes: "10",
  });
  const [exercises, setExercises] = useState<ExerciseDraft[]>([]);
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [pickerOpenAt, setPickerOpenAt] = useState<number | null>(null);

  useEffect(() => {
    if (!session) return;
    const dt = new Date(session.scheduledAt);
    const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    // Resolve sport to a canonical ID for the dropdown
    const sportDef = findSport(session.sport);
    setForm({
      title: session.title,
      sport: sportDef?.id ?? session.sport,
      description: session.description ?? "",
      location: session.location ?? "",
      scheduledAt: local,
      durationMinutes: String(session.durationMinutes),
      maxAthletes: String(session.maxAthletes),
    });
    setExercises(
      session.exercises.map((ex: any) => ({
        id: ex.id,
        name: ex.name,
        sets: ex.sets != null ? String(ex.sets) : "",
        reps: ex.reps != null ? String(ex.reps) : "",
        durationSeconds: ex.durationSeconds != null ? String(ex.durationSeconds) : "",
        restSeconds: ex.restSeconds != null ? String(ex.restSeconds) : "",
        notes: ex.notes ?? "",
        wodType: ex.wodType ?? "",
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

  // Derive sport metadata from the current dropdown selection
  const selectedSportDef = SPORT_MAP[form.sport] ?? findSport(form.sport);

  // Build the sport options: coach's configured sports + current session sport if not in list
  const sportOptions = (() => {
    const ids = new Set(coachSports);
    const opts = coachSports.map((sid) => ({ id: sid, label: SPORT_MAP[sid]?.label ?? sid }));
    // Add session's current sport as a fallback option if it's not in the coach's list
    if (form.sport && !ids.has(form.sport)) {
      const def = SPORT_MAP[form.sport] ?? findSport(form.sport);
      opts.unshift({ id: form.sport, label: def?.label ?? form.sport });
    }
    return opts;
  })();

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
        wodType: ex.wodType || undefined,
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
          <p className="text-txt3 text-xs mt-0.5">{selectedSportDef?.label ?? session.sport}</p>
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

            {/* Sport — dropdown from coach's sports */}
            <div>
              <label className="text-txt2 text-xs tracking-widest block mb-1.5">{t("sportLabelOptional")}</label>
              {sportOptions.length > 0 ? (
                <select disabled={isCancelled}
                  className="w-full bg-bg3 border border-bg5 rounded-xl px-4 py-2.5 text-txt text-sm outline-none focus:border-primary-light transition-colors disabled:opacity-60"
                  value={form.sport}
                  onChange={(e) => {
                    setField("sport", e.target.value);
                    const newSport = SPORT_MAP[e.target.value];
                    if (!newSport?.isWodCompatible) {
                      setExercises((prev) => prev.map((ex) => ({ ...ex, wodType: "" })));
                    }
                  }}>
                  <option value="">{t("sportPlaceholder")}</option>
                  {sportOptions.map(({ id: sid, label }) => (
                    <option key={sid} value={sid}>{label}</option>
                  ))}
                </select>
              ) : (
                <input disabled={isCancelled}
                  className="w-full bg-bg3 border border-bg5 rounded-xl px-4 py-2.5 text-txt text-sm outline-none focus:border-primary-light transition-colors placeholder-txt3 disabled:opacity-60"
                  value={form.sport} onChange={(e) => setField("sport", e.target.value)} />
              )}
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
          <h2 className="text-txt font-bold text-sm mb-1">
            {t("exercises")}
            <span className="ml-2 text-txt3 font-normal text-xs">{t("exercisesSaved", { count: exercises.filter((e) => !e.isNew).length })}</span>
          </h2>

          {/* If sport has no exercise structure, show a hint */}
          {form.sport && selectedSportDef && !selectedSportDef.hasExercises ? (
            <p className="text-txt3 text-xs mt-1 mb-3 italic">{t("exercisesHiddenHint")}</p>
          ) : (
            <>
              <div className="flex flex-col gap-3 mb-3 mt-3">
                {exercises.map((ex, i) => {
                  const fields: FieldConfig[] = getExerciseFields(selectedSportDef, ex.wodType);

                  return (
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
                          disabled={isCancelled}
                        />
                        {!isCancelled && (
                          <div className="relative">
                            <button type="button"
                              onClick={() => setPickerOpenAt(pickerOpenAt === i ? null : i)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-txt3 hover:text-primary hover:bg-primary/10 transition-colors"
                              title="Pick from library">
                              <BookOpen size={15} />
                            </button>
                            {pickerOpenAt === i && (
                              <LibraryPicker
                                onSelect={(name, sets, reps, durationSeconds, restSeconds, notes) => {
                                  setExField(i, "name", name);
                                  setExField(i, "sets", sets);
                                  setExField(i, "reps", reps);
                                  setExField(i, "durationSeconds", durationSeconds);
                                  setExField(i, "restSeconds", restSeconds);
                                  setExField(i, "notes", notes);
                                  setPickerOpenAt(null);
                                }}
                                onClose={() => setPickerOpenAt(null)}
                              />
                            )}
                          </div>
                        )}
                        {ex.isNew ? (
                          <span className="text-xs text-primary-light bg-bg4 border border-primary/20 rounded-full px-2 py-0.5">{tCommon("new")}</span>
                        ) : !isCancelled && (
                          <button type="button" onClick={() => handleDeleteExercise(ex.id!)}
                            disabled={deleteExercise.isPending}
                            className="text-txt3 hover:text-coral transition-colors">
                            <X size={16} />
                          </button>
                        )}
                      </div>

                      {/* WOD type selector — only for WOD-compatible sports */}
                      {selectedSportDef?.isWodCompatible && (
                        <div className="mb-2">
                          <label className="text-txt3 text-[10px] tracking-widest block mb-1">{t("wodTypeLabel")}</label>
                          <div className="flex gap-1.5 flex-wrap">
                            <button type="button"
                              onClick={() => !isCancelled && setExField(i, "wodType", "")}
                              disabled={isCancelled}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-colors disabled:opacity-60 ${!ex.wodType ? "bg-primary text-white border-primary" : "border-bg5 text-txt3 hover:border-primary/40"}`}>
                              {t("wodTypeNone")}
                            </button>
                            {WOD_OPTIONS.map((opt) => (
                              <button key={opt} type="button"
                                onClick={() => !isCancelled && setExField(i, "wodType", opt)}
                                disabled={isCancelled}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-colors disabled:opacity-60 ${ex.wodType === opt ? "bg-primary text-white border-primary" : "border-bg5 text-txt3 hover:border-primary/40"}`}>
                                {opt === "FOR_TIME" ? "FOR TIME" : opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Context-aware exercise fields */}
                      {fields.length > 0 && (
                        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(fields.length, 4)}, 1fr)` }}>
                          {fields.map(({ field, label, placeholder }) => (
                            <div key={field}>
                              <label className="text-txt3 text-[9px] tracking-widest block mb-0.5">{label}</label>
                              <input type="number" min="0" disabled={isCancelled}
                                className="w-full bg-bg2 border border-bg5 rounded-lg px-3 py-1.5 text-txt text-xs outline-none focus:border-primary-light transition-colors placeholder-txt3 disabled:opacity-60"
                                placeholder={placeholder}
                                value={ex[field as keyof ExerciseDraft] as string}
                                onChange={(e) => setExField(i, field, e.target.value)} />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Notes */}
                      {(selectedSportDef?.hasExercises ?? true) && (
                        <input disabled={isCancelled}
                          className="mt-2 w-full bg-bg2 border border-bg5 rounded-lg px-3 py-1.5 text-txt text-xs outline-none focus:border-primary-light transition-colors placeholder-txt3 disabled:opacity-60"
                          placeholder="Notes (optional)"
                          value={ex.notes}
                          onChange={(e) => setExField(i, "notes", e.target.value)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {!isCancelled && (
                <div className="flex gap-3">
                  <button type="button"
                    onClick={() => setExercises((prev) => [...prev, { ...EMPTY_EXERCISE, isNew: true }])}
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
            </>
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
