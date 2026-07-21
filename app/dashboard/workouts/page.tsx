"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dumbbell, Plus, Pencil, Trash2, Check, X, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface TemplateDraft {
  name: string;
  sport: string;
  sets: string;
  reps: string;
  durationSeconds: string;
  restSeconds: string;
  notes: string;
}

const EMPTY: TemplateDraft = { name: "", sport: "", sets: "", reps: "", durationSeconds: "", restSeconds: "", notes: "" };

function specLabel(t: { sets?: number | null; reps?: number | null; durationSeconds?: number | null; restSeconds?: number | null }) {
  return [
    t.sets ? `${t.sets} sets` : null,
    t.reps ? `${t.reps} reps` : null,
    t.durationSeconds ? `${t.durationSeconds}s` : null,
    t.restSeconds ? `${t.restSeconds}s rest` : null,
  ].filter(Boolean).join(" · ");
}

export default function WorkoutsPage() {
  const t = useTranslations("workouts");
  const tCommon = useTranslations("common");
  const utils = trpc.useUtils();

  // Get coach profile to read their sport
  const { data: profile } = trpc.profile.get.useQuery();
  const coachSport = (profile as { coachProfile?: { sport?: string | null } } | undefined)?.coachProfile?.sport ?? null;

  // Available sports list
  const { data: availableSports = [] } = trpc.workoutTemplates.availableSports.useQuery();

  // Active sport filter — defaults to coach's sport if set
  const [activeSport, setActiveSport] = useState<string | null>(null);
  const displaySport = activeSport ?? coachSport ?? null;

  const { data: templates = [], isLoading } = trpc.workoutTemplates.list.useQuery(
    displaySport ? { sport: displaySport } : undefined,
  );

  const createMut = trpc.workoutTemplates.create.useMutation({
    onSuccess: () => { utils.workoutTemplates.list.invalidate(); setAdding(false); setDraft({ ...EMPTY }); },
  });
  const updateMut = trpc.workoutTemplates.update.useMutation({
    onSuccess: () => { utils.workoutTemplates.list.invalidate(); setEditingId(null); },
  });
  const deleteMut = trpc.workoutTemplates.delete.useMutation({
    onSuccess: () => utils.workoutTemplates.list.invalidate(),
  });
  const seedMut = trpc.workoutTemplates.seedDefaults.useMutation({
    onSuccess: () => utils.workoutTemplates.list.invalidate(),
  });

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<TemplateDraft>({ ...EMPTY });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<TemplateDraft>({ ...EMPTY });

  const setD = (k: keyof TemplateDraft, v: string) => setDraft((p) => ({ ...p, [k]: v }));
  const setE = (k: keyof TemplateDraft, v: string) => setEditDraft((p) => ({ ...p, [k]: v }));

  const startEdit = (tmpl: typeof templates[number]) => {
    setEditingId(tmpl.id);
    setEditDraft({
      name: tmpl.name,
      sport: tmpl.sport ?? "",
      sets: tmpl.sets != null ? String(tmpl.sets) : "",
      reps: tmpl.reps != null ? String(tmpl.reps) : "",
      durationSeconds: tmpl.durationSeconds != null ? String(tmpl.durationSeconds) : "",
      restSeconds: tmpl.restSeconds != null ? String(tmpl.restSeconds) : "",
      notes: tmpl.notes ?? "",
    });
  };

  const handleCreate = () => {
    if (!draft.name.trim()) return;
    createMut.mutate({
      name: draft.name.trim(),
      sport: draft.sport || displaySport || undefined,
      sets: draft.sets ? parseInt(draft.sets) : undefined,
      reps: draft.reps ? parseInt(draft.reps) : undefined,
      durationSeconds: draft.durationSeconds ? parseInt(draft.durationSeconds) : undefined,
      restSeconds: draft.restSeconds ? parseInt(draft.restSeconds) : undefined,
      notes: draft.notes || undefined,
    });
  };

  const handleUpdate = () => {
    if (!editingId || !editDraft.name.trim()) return;
    updateMut.mutate({
      id: editingId,
      name: editDraft.name.trim(),
      sport: editDraft.sport || undefined,
      sets: editDraft.sets ? parseInt(editDraft.sets) : undefined,
      reps: editDraft.reps ? parseInt(editDraft.reps) : undefined,
      durationSeconds: editDraft.durationSeconds ? parseInt(editDraft.durationSeconds) : undefined,
      restSeconds: editDraft.restSeconds ? parseInt(editDraft.restSeconds) : undefined,
      notes: editDraft.notes || undefined,
    });
  };

  const handleSeed = (sport: string) => {
    seedMut.mutate({ sport });
    if (!activeSport) setActiveSport(sport);
  };

  return (
    <div className="p-7 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Dumbbell size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-txt font-bold text-xl">{t("title")}</h1>
            <p className="text-txt3 text-xs">{t("subtitle")}</p>
          </div>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-2 bg-primary text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-primary-dark transition-colors">
            <Plus size={15} />
            {t("addWorkout")}
          </button>
        )}
      </div>

      {/* Sport filter tabs */}
      <div className="flex gap-2 flex-wrap mb-5">
        <button
          onClick={() => setActiveSport(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            displaySport === null
              ? "bg-primary text-white"
              : "bg-bg3 border border-bg5 text-txt2 hover:text-txt"
          }`}>
          {t("allSports")}
        </button>
        {availableSports.map((sport) => (
          <button key={sport}
            onClick={() => setActiveSport(sport === activeSport ? null : sport)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              displaySport === sport
                ? "bg-primary text-white"
                : coachSport && sport.toLowerCase() === coachSport.toLowerCase()
                  ? "bg-primary/10 border border-primary/30 text-primary"
                  : "bg-bg3 border border-bg5 text-txt2 hover:text-txt"
            }`}>
            {sport}
            {coachSport && sport.toLowerCase() === coachSport.toLowerCase() && (
              <span className="ml-1 text-[9px] align-middle">★</span>
            )}
          </button>
        ))}
      </div>

      {/* Seed defaults banner — shown when sport is selected but library is empty for that sport */}
      {displaySport && !isLoading && templates.length === 0 && (
        <div className="flex items-center gap-4 bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-5">
          <Sparkles size={20} className="text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-txt font-semibold text-sm">{t("seedTitle", { sport: displaySport })}</p>
            <p className="text-txt3 text-xs mt-0.5">{t("seedDesc")}</p>
          </div>
          <button
            onClick={() => handleSeed(displaySport)}
            disabled={seedMut.isPending}
            className="flex-shrink-0 bg-primary text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-60">
            {seedMut.isPending ? tCommon("loading") : t("loadDefaults")}
          </button>
        </div>
      )}

      {/* Load more defaults button — shown when sport is selected and templates exist */}
      {displaySport && !isLoading && templates.length > 0 && (
        <div className="flex justify-end mb-3">
          <button
            onClick={() => handleSeed(displaySport)}
            disabled={seedMut.isPending}
            className="flex items-center gap-1.5 text-primary text-xs font-semibold hover:underline disabled:opacity-60">
            <Sparkles size={12} />
            {seedMut.isPending ? tCommon("loading") : t("loadDefaults")}
          </button>
        </div>
      )}

      {/* Add form */}
      {adding && (
        <div className="bg-bg2 border border-primary/20 rounded-2xl p-5 mb-5 shadow-sm">
          <h2 className="text-txt font-bold text-sm mb-4">{t("newWorkout")}</h2>
          <DraftForm draft={draft} setField={setD} availableSports={availableSports} />
          <div className="flex gap-3 mt-4">
            <button onClick={handleCreate} disabled={createMut.isPending || !draft.name.trim()}
              className="flex items-center gap-1.5 bg-primary text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-60">
              <Check size={14} />
              {createMut.isPending ? tCommon("saving") : tCommon("save")}
            </button>
            <button onClick={() => { setAdding(false); setDraft({ ...EMPTY }); }}
              className="flex items-center gap-1.5 bg-bg3 border border-bg5 text-txt2 rounded-xl px-4 py-2 text-sm hover:text-txt transition-colors">
              <X size={14} />
              {tCommon("cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Template list */}
      <div className="bg-bg2 border border-bg5 rounded-2xl overflow-hidden">
        {isLoading && (
          <p className="text-txt3 text-sm text-center py-10">{tCommon("loading")}</p>
        )}
        {!isLoading && templates.length === 0 && !displaySport && (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <Dumbbell size={32} className="text-txt3 opacity-40" />
            <p className="text-txt3 text-sm">{t("empty")}</p>
            {!adding && (
              <button onClick={() => setAdding(true)} className="text-primary text-sm font-semibold hover:underline">
                {t("addFirst")}
              </button>
            )}
          </div>
        )}
        {templates.map((tmpl, i) => (
          <div key={tmpl.id} className={`px-5 py-4 ${i < templates.length - 1 ? "border-b border-bg5" : ""}`}>
            {editingId === tmpl.id ? (
              <div>
                <DraftForm draft={editDraft} setField={setE} availableSports={availableSports} />
                <div className="flex gap-3 mt-3">
                  <button onClick={handleUpdate} disabled={updateMut.isPending || !editDraft.name.trim()}
                    className="flex items-center gap-1.5 bg-primary text-white rounded-xl px-3 py-1.5 text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-60">
                    <Check size={13} />
                    {updateMut.isPending ? tCommon("saving") : tCommon("save")}
                  </button>
                  <button onClick={() => setEditingId(null)}
                    className="flex items-center gap-1.5 bg-bg3 border border-bg5 text-txt2 rounded-xl px-3 py-1.5 text-sm hover:text-txt transition-colors">
                    <X size={13} />
                    {tCommon("cancel")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Dumbbell size={15} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-txt font-semibold text-sm">{tmpl.name}</p>
                    {tmpl.sport && !displaySport && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {tmpl.sport}
                      </span>
                    )}
                  </div>
                  {specLabel(tmpl) && <p className="text-txt3 text-xs mt-0.5">{specLabel(tmpl)}</p>}
                  {tmpl.notes && <p className="text-txt3 text-xs mt-0.5 italic">{tmpl.notes}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => startEdit(tmpl)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-txt3 hover:text-primary hover:bg-primary/10 transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => deleteMut.mutate({ id: tmpl.id })} disabled={deleteMut.isPending}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-txt3 hover:text-coral hover:bg-coral/10 transition-colors disabled:opacity-50">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DraftForm({ draft, setField, availableSports }: {
  draft: TemplateDraft;
  setField: (k: keyof TemplateDraft, v: string) => void;
  availableSports: string[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <input
          className="col-span-2 bg-bg3 border border-bg5 rounded-xl px-4 py-2.5 text-txt text-sm outline-none focus:border-primary-light transition-colors placeholder-txt3"
          placeholder="Exercise name *"
          value={draft.name}
          onChange={(e) => setField("name", e.target.value)}
        />
        <select
          className="bg-bg3 border border-bg5 rounded-xl px-4 py-2.5 text-txt text-sm outline-none focus:border-primary-light transition-colors"
          value={draft.sport}
          onChange={(e) => setField("sport", e.target.value)}>
          <option value="">Sport (optional)</option>
          {availableSports.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          className="bg-bg3 border border-bg5 rounded-xl px-4 py-2 text-txt text-sm outline-none focus:border-primary-light transition-colors placeholder-txt3"
          placeholder="Notes (optional)"
          value={draft.notes}
          onChange={(e) => setField("notes", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {([
          ["sets", "Sets"],
          ["reps", "Reps"],
          ["durationSeconds", "Duration (s)"],
          ["restSeconds", "Rest (s)"],
        ] as const).map(([k, label]) => (
          <input key={k} type="number" min="0"
            className="bg-bg3 border border-bg5 rounded-lg px-3 py-1.5 text-txt text-xs outline-none focus:border-primary-light transition-colors placeholder-txt3"
            placeholder={label}
            value={draft[k]}
            onChange={(e) => setField(k, e.target.value)}
          />
        ))}
      </div>
    </div>
  );
}
