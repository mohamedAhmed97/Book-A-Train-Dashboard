"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { BookOpen, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  SPORTS, SPORT_MAP, WOD_OPTIONS, WOD_FIELD_MAP, STRENGTH_FIELDS,
  getExerciseFields, findSport,
  type FieldConfig,
} from "@/lib/sports";

interface ExerciseDraft {
  name: string;
  sets: string;
  reps: string;
  durationSeconds: string;
  restSeconds: string;
  notes: string;
  wodType: string;
}

const EMPTY_EXERCISE: ExerciseDraft = {
  name: "", sets: "", reps: "", durationSeconds: "", restSeconds: "", notes: "", wodType: "",
};

function LibraryPicker({ onSelect, onClose }: {
  onSelect: (ex: ExerciseDraft) => void;
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
                  onSelect({
                    name: tmpl.name,
                    sets: tmpl.sets != null ? String(tmpl.sets) : "",
                    reps: tmpl.reps != null ? String(tmpl.reps) : "",
                    durationSeconds: tmpl.durationSeconds != null ? String(tmpl.durationSeconds) : "",
                    restSeconds: tmpl.restSeconds != null ? String(tmpl.restSeconds) : "",
                    notes: tmpl.notes ?? "",
                    wodType: "",
                  });
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

export default function NewSessionPage() {
  const t = useTranslations("sessionForm");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: athletes } = trpc.athletes.list.useQuery();
  const { data: profile } = trpc.profile.get.useQuery();

  const coachSports: string[] = (profile?.coachProfile as any)?.sports ?? [];

  const [form, setForm] = useState({
    title: "", sport: "", description: "", location: "",
    scheduledAt: "", durationMinutes: "60", maxAthletes: "10",
  });
  const [exercises, setExercises] = useState<ExerciseDraft[]>([{ ...EMPTY_EXERCISE }]);
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [pickerOpenAt, setPickerOpenAt] = useState<number | null>(null);

  const createSession = trpc.sessions.create.useMutation();
  const addExercises = trpc.exercises.addMany.useMutation();
  const assignAthletes = trpc.sessions.assignAthletes.useMutation();

  const setField = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setExField = (i: number, k: string, v: string) =>
    setExercises((prev) => prev.map((ex, j) => j === i ? { ...ex, [k]: v } : ex));

  const addExercise = () => setExercises((prev) => [...prev, { ...EMPTY_EXERCISE }]);
  const removeExercise = (i: number) => setExercises((prev) => prev.filter((_, j) => j !== i));

  const fillFromLibrary = (i: number, draft: ExerciseDraft) => {
    setExercises((prev) => prev.map((ex, j) => j === i ? { ...draft, wodType: ex.wodType } : ex));
  };

  const toggleAthlete = (id: string) =>
    setSelectedAthletes((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  // Derive sport metadata
  const selectedSportDef = findSport(form.sport) ?? SPORT_MAP[form.sport];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.title || !form.sport || !form.scheduledAt) {
      setError(t("errorRequired"));
      return;
    }

    try {
      const session = await createSession.mutateAsync({
        title: form.title, sport: form.sport,
        description: form.description || undefined,
        location: form.location || undefined,
        scheduledAt: new Date(form.scheduledAt),
        durationMinutes: parseInt(form.durationMinutes),
        maxAthletes: parseInt(form.maxAthletes),
      });

      const validExercises = exercises.filter((ex) => ex.name.trim());
      if (validExercises.length > 0) {
        await addExercises.mutateAsync({
          sessionId: session.id,
          exercises: validExercises.map((ex, i) => ({
            name: ex.name, order: i + 1,
            sets: ex.sets ? parseInt(ex.sets) : undefined,
            reps: ex.reps ? parseInt(ex.reps) : undefined,
            durationSeconds: ex.durationSeconds ? parseInt(ex.durationSeconds) : undefined,
            restSeconds: ex.restSeconds ? parseInt(ex.restSeconds) : undefined,
            notes: ex.notes || undefined,
            wodType: ex.wodType || undefined,
          })),
        });
      }

      if (selectedAthletes.length > 0) {
        await assignAthletes.mutateAsync({ sessionId: session.id, athleteProfileIds: selectedAthletes });
      }

      utils.sessions.mySessions.invalidate();
      router.push("/dashboard/sessions");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("errorCreate"));
    }
  };

  const isLoading = createSession.isPending || addExercises.isPending || assignAthletes.isPending;

  return (
    <div className="p-7 max-w-3xl">
      <div className="flex items-center gap-4 mb-7">
        <button onClick={() => router.back()} aria-label={tCommon("back")}
          className="w-9 h-9 bg-bg3 border border-bg5 rounded-xl flex items-center justify-center text-txt2 hover:text-txt transition-colors">←</button>
        <h1 className="text-txt font-bold text-2xl">{t("newSession")}</h1>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-5">
        {/* Session details */}
        <div className="bg-bg2 border border-bg5 rounded-2xl p-5">
          <h2 className="text-txt font-bold text-sm mb-4">{t("sessionDetails")}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-txt2 text-xs tracking-widest block mb-1.5">{t("titleLabel")}</label>
              <input className="w-full bg-bg3 border border-bg5 rounded-xl px-4 py-2.5 text-txt text-sm outline-none focus:border-primary-light transition-colors placeholder-txt3"
                placeholder={t("titlePlaceholder")} value={form.title} onChange={(e) => setField("title", e.target.value)} required />
            </div>

            {/* Sport — dropdown from coach's sports */}
            <div>
              <label className="text-txt2 text-xs tracking-widest block mb-1.5">{t("sportLabel")}</label>
              {coachSports.length > 0 ? (
                <select
                  className="w-full bg-bg3 border border-bg5 rounded-xl px-4 py-2.5 text-txt text-sm outline-none focus:border-primary-light transition-colors"
                  value={form.sport}
                  onChange={(e) => {
                    setField("sport", e.target.value);
                    // Clear WOD types if new sport is not WOD-compatible
                    const newSport = SPORT_MAP[e.target.value];
                    if (!newSport?.isWodCompatible) {
                      setExercises((prev) => prev.map((ex) => ({ ...ex, wodType: "" })));
                    }
                  }}
                  required
                >
                  <option value="">{t("sportPlaceholder")}</option>
                  {coachSports.map((sid) => {
                    const s = SPORT_MAP[sid];
                    return <option key={sid} value={sid}>{s?.label ?? sid}</option>;
                  })}
                </select>
              ) : (
                <div className="w-full bg-bg3 border border-bg5 rounded-xl px-4 py-2.5 text-txt3 text-sm">
                  {t("noSportsConfigured")}
                </div>
              )}
            </div>

            <div>
              <label className="text-txt2 text-xs tracking-widest block mb-1.5">{t("locationLabel")}</label>
              <input className="w-full bg-bg3 border border-bg5 rounded-xl px-4 py-2.5 text-txt text-sm outline-none focus:border-primary-light transition-colors placeholder-txt3"
                placeholder={t("locationPlaceholder")} value={form.location} onChange={(e) => setField("location", e.target.value)} />
            </div>
            <div>
              <label className="text-txt2 text-xs tracking-widest block mb-1.5">{t("dateTimeLabel")}</label>
              <input type="datetime-local" className="w-full bg-bg3 border border-bg5 rounded-xl px-4 py-2.5 text-txt text-sm outline-none focus:border-primary-light transition-colors"
                value={form.scheduledAt} onChange={(e) => setField("scheduledAt", e.target.value)} required />
            </div>
            <div>
              <label className="text-txt2 text-xs tracking-widest block mb-1.5">{t("durationMinutesLabel")}</label>
              <input type="number" min="15" max="480" className="w-full bg-bg3 border border-bg5 rounded-xl px-4 py-2.5 text-txt text-sm outline-none focus:border-primary-light transition-colors"
                value={form.durationMinutes} onChange={(e) => setField("durationMinutes", e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="text-txt2 text-xs tracking-widest block mb-1.5">{t("descriptionLabel")}</label>
              <textarea rows={2} className="w-full bg-bg3 border border-bg5 rounded-xl px-4 py-2.5 text-txt text-sm outline-none focus:border-primary-light transition-colors resize-none placeholder-txt3"
                placeholder={t("descriptionPlaceholder")} value={form.description} onChange={(e) => setField("description", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Exercises */}
        <div className="bg-bg2 border border-bg5 rounded-2xl p-5">
          <h2 className="text-txt font-bold text-sm mb-1">{t("exercises")}</h2>

          {/* If sport has no exercise structure, show a hint */}
          {form.sport && selectedSportDef && !selectedSportDef.hasExercises ? (
            <p className="text-txt3 text-xs mt-1 mb-3 italic">{t("exercisesHiddenHint")}</p>
          ) : (
            <>
              <div className="flex flex-col gap-3 mb-3 mt-3">
                {exercises.map((ex, i) => {
                  const fields: FieldConfig[] = getExerciseFields(selectedSportDef, ex.wodType);

                  return (
                    <div key={i} className="bg-bg3 border border-bg5 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{i + 1}</div>
                        <input
                          className="flex-1 bg-bg4 border border-bg5 rounded-lg px-3 py-1.5 text-txt text-sm outline-none focus:border-primary-light transition-colors placeholder-txt3"
                          placeholder={t("exerciseNamePlaceholder")} value={ex.name}
                          onChange={(e) => setExField(i, "name", e.target.value)} />
                        <div className="relative">
                          <button type="button"
                            onClick={() => setPickerOpenAt(pickerOpenAt === i ? null : i)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-txt3 hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Pick from library">
                            <BookOpen size={15} />
                          </button>
                          {pickerOpenAt === i && (
                            <LibraryPicker
                              onSelect={(draft) => { fillFromLibrary(i, draft); setPickerOpenAt(null); }}
                              onClose={() => setPickerOpenAt(null)}
                            />
                          )}
                        </div>
                        <button type="button" onClick={() => removeExercise(i)} className="text-txt3 hover:text-coral transition-colors">
                          <X size={16} />
                        </button>
                      </div>

                      {/* WOD type selector — only for WOD-compatible sports */}
                      {selectedSportDef?.isWodCompatible && (
                        <div className="mb-2">
                          <label className="text-txt3 text-[10px] tracking-widest block mb-1">{t("wodTypeLabel")}</label>
                          <div className="flex gap-1.5 flex-wrap">
                            <button type="button"
                              onClick={() => setExField(i, "wodType", "")}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${!ex.wodType ? "bg-primary text-white border-primary" : "border-bg5 text-txt3 hover:border-primary/40"}`}>
                              {t("wodTypeNone")}
                            </button>
                            {WOD_OPTIONS.map((opt) => (
                              <button key={opt} type="button"
                                onClick={() => setExField(i, "wodType", opt)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${ex.wodType === opt ? "bg-primary text-white border-primary" : "border-bg5 text-txt3 hover:border-primary/40"}`}>
                                {opt === "FOR_TIME" ? "FOR TIME" : opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Context-aware exercise fields */}
                      {fields.length > 0 && (
                        <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${Math.min(fields.length, 4)}, 1fr)` }}>
                          {fields.map(({ field, label, placeholder }) => (
                            <div key={field}>
                              <label className="text-txt3 text-[9px] tracking-widest block mb-0.5">{label}</label>
                              <input type="number" min="0"
                                className="w-full bg-bg4 border border-bg5 rounded-lg px-3 py-1.5 text-txt text-xs outline-none focus:border-primary-light transition-colors placeholder-txt3"
                                placeholder={placeholder}
                                value={ex[field as keyof ExerciseDraft]}
                                onChange={(e) => setExField(i, field, e.target.value)} />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Notes */}
                      {(selectedSportDef?.hasExercises ?? true) && (
                        <input
                          className="mt-2 w-full bg-bg4 border border-bg5 rounded-lg px-3 py-1.5 text-txt text-xs outline-none focus:border-primary-light transition-colors placeholder-txt3"
                          placeholder="Notes (optional)"
                          value={ex.notes}
                          onChange={(e) => setExField(i, "notes", e.target.value)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <button type="button" onClick={addExercise}
                className="w-full py-2.5 border border-dashed border-bg4 rounded-xl text-txt2 text-sm hover:border-primary-light hover:text-txt transition-colors">
                {t("addExercise")}
              </button>
            </>
          )}
        </div>

        {/* Assign athletes */}
        {athletes && athletes.length > 0 && (
          <div className="bg-bg2 border border-bg5 rounded-2xl p-5">
            <h2 className="text-txt font-bold text-sm mb-4">{t("assignAthletes")}</h2>
            <div className="flex flex-col gap-2">
              {athletes.map((ca) => (
                <label key={ca.id} className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={selectedAthletes.includes(ca.athlete.id)}
                    onChange={() => toggleAthlete(ca.athlete.id)}
                    className="w-4 h-4 rounded accent-primary" />
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                    {ca.athlete.user.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-txt text-sm group-hover:text-primary-light transition-colors">{ca.athlete.user.name}</p>
                    <p className="text-txt3 text-xs">{ca.athlete.sport ?? t("athleteFallback")}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-coral text-sm">{error}</p>}

        <button type="submit" disabled={isLoading}
          className="bg-primary text-white rounded-2xl py-4 font-bold text-sm tracking-wide hover:bg-primary-dark transition-colors disabled:opacity-60">
          {isLoading ? t("publishing") : t("publish")}
        </button>
      </form>
    </div>
  );
}
