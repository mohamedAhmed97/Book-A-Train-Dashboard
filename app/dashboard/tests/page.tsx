"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ClipboardList, Plus, CheckCircle2, Clock, X, ChevronDown, ChevronUp,
  Trash2, GripVertical, Pencil, Check,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ── Helpers ────────────────────────────────────────────────────────────────────

const EMPTY_RESULT = { value: "", notes: "" };

function formatMovement(m: any) {
  const parts = [
    m.sets ? `${m.sets} sets` : null,
    m.reps ? `× ${m.reps} reps` : null,
    m.distanceMeters
      ? m.distanceMeters >= 1000 ? `${m.distanceMeters / 1000}km` : `${m.distanceMeters}m`
      : null,
    m.durationSeconds ? `${m.durationSeconds}s` : null,
  ].filter(Boolean);
  return parts.join(" ");
}

function getMovementInputLabel(m: any): string {
  if (m.durationSeconds) return `seconds (target ${m.durationSeconds}s)`;
  if (m.reps && m.sets) return `reps (target ${m.sets}×${m.reps}=${m.reps * m.sets})`;
  if (m.reps) return `reps (target ${m.reps})`;
  if (m.distanceMeters) return `meters (target ${m.distanceMeters}m)`;
  if (m.sets) return `sets (target ${m.sets})`;
  return "value";
}

function calcMovementPct(m: any, actual: number): number | null {
  if (actual <= 0) return null;
  if (m.durationSeconds != null && m.durationSeconds > 0) return (m.durationSeconds / actual) * 100;
  if (m.reps != null && m.sets != null) return (actual / (m.reps * m.sets)) * 100;
  if (m.reps != null) return (actual / m.reps) * 100;
  if (m.distanceMeters != null) return (actual / m.distanceMeters) * 100;
  if (m.sets != null) return (actual / m.sets) * 100;
  return null;
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = "standard" | "custom";

export default function TestsPage() {
  const t = useTranslations("tests");
  const tCommon = useTranslations("common");
  const [activeTab, setActiveTab] = useState<Tab>("standard");

  return (
    <div className="p-7 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <ClipboardList className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-txt font-bold text-xl">{t("title")}</h1>
          <p className="text-txt3 text-xs mt-0.5">Assign fitness tests to athletes and track their results</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-bg3 border border-bg5 rounded-xl p-1 w-fit mb-6">
        {(["standard", "custom"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === tab ? "bg-primary text-white shadow-sm" : "text-txt3 hover:text-txt"
            }`}
          >
            {tab === "standard" ? "Standard Tests" : "Custom Tests"}
          </button>
        ))}
      </div>

      {activeTab === "standard"
        ? <StandardTestsTab t={t} tCommon={tCommon} />
        : <CustomTestsTab t={t} tCommon={tCommon} />}
    </div>
  );
}

// ── Standard Tests Tab ─────────────────────────────────────────────────────────

function StandardTestsTab({ t, tCommon }: { t: any; tCommon: any }) {
  const utils = trpc.useUtils();
  const { data: athletes = [] } = trpc.athletes.list.useQuery();
  const { data: catalog = [] } = trpc.tests.catalog.useQuery();

  const [filterAthleteId, setFilterAthleteId] = useState("");
  const { data: assignments = [], isLoading: assignLoading } = trpc.tests.athleteTests.useQuery(
    { athleteProfileId: filterAthleteId },
    { enabled: !!filterAthleteId },
  );

  const [assign, setAssign] = useState({ athleteProfileId: "", testId: "", scheduledAt: "", notes: "" });
  const [assignError, setAssignError] = useState("");
  const setA = (k: string, v: string) => setAssign((p) => ({ ...p, [k]: v }));

  const assignMut = trpc.tests.assign.useMutation({
    onSuccess: () => {
      setAssign({ athleteProfileId: "", testId: "", scheduledAt: "", notes: "" });
      setAssignError("");
      utils.tests.athleteTests.invalidate();
    },
    onError: (e) => setAssignError(e.message),
  });

  const [showNewTest, setShowNewTest] = useState(false);
  const [newTest, setNewTest] = useState({ name: "", sport: "", unit: "", description: "" });
  const [newTestError, setNewTestError] = useState("");
  const setNT = (k: string, v: string) => setNewTest((p) => ({ ...p, [k]: v }));

  const createTestMut = trpc.tests.createTest.useMutation({
    onSuccess: () => {
      setNewTest({ name: "", sport: "", unit: "", description: "" });
      setNewTestError("");
      setShowNewTest(false);
      utils.tests.catalog.invalidate();
    },
    onError: (e) => setNewTestError(e.message),
  });

  const [resultForms, setResultForms] = useState<Record<string, { value: string; notes: string }>>({});
  const [openResultId, setOpenResultId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForms, setEditForms] = useState<Record<string, { scheduledAt: string; notes: string }>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const addResultMut = trpc.tests.addResult.useMutation({
    onSuccess: () => { setOpenResultId(null); setResultForms({}); utils.tests.athleteTests.invalidate(); },
  });

  const updateAssignmentMut = trpc.tests.updateAssignment.useMutation({
    onSuccess: () => { setEditId(null); utils.tests.athleteTests.invalidate(); },
  });

  const deleteAssignmentMut = trpc.tests.deleteAssignment.useMutation({
    onSuccess: () => { setDeletingId(null); utils.tests.athleteTests.invalidate(); },
  });

  const [catalogFilter, setCatalogFilter] = useState("all");
  const sports = Array.from(new Set(catalog.map((t: any) => t.sport).filter(Boolean))) as string[];
  const filteredCatalog = catalogFilter === "all" ? catalog : catalog.filter((t: any) => t.sport === catalogFilter);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 flex flex-col gap-6">

        {/* Assign form */}
        <section className="bg-bg2 border border-bg5 rounded-2xl p-5">
          <h2 className="text-txt font-bold text-sm mb-4">{t("assignTest")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <Label className="text-txt3 text-[10px] tracking-widest font-bold mb-1.5 block">{t("selectAthlete").toUpperCase()} *</Label>
              <select
                value={assign.athleteProfileId}
                onChange={(e) => { setA("athleteProfileId", e.target.value); setFilterAthleteId(e.target.value); }}
                className="w-full rounded-lg border border-bg5 bg-bg3 text-txt text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">{t("selectAthlete")}</option>
                {athletes.map((ca: any) => <option key={ca.athlete.id} value={ca.athlete.id}>{ca.athlete.user.name}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-txt3 text-[10px] tracking-widest font-bold mb-1.5 block">{t("selectTest").toUpperCase()} *</Label>
              <select
                value={assign.testId}
                onChange={(e) => setA("testId", e.target.value)}
                className="w-full rounded-lg border border-bg5 bg-bg3 text-txt text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">{t("selectTest")}</option>
                {catalog.map((test: any) => (
                  <option key={test.id} value={test.id}>{test.name} ({test.unit}){test.isGlobal ? "" : " ★"}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-txt3 text-[10px] tracking-widest font-bold mb-1.5 block">{t("scheduledDate").toUpperCase()}</Label>
              <Input type="date" value={assign.scheduledAt} onChange={(e) => setA("scheduledAt", e.target.value)} className="bg-bg3 border-bg5 text-txt text-sm" />
            </div>
            <div>
              <Label className="text-txt3 text-[10px] tracking-widest font-bold mb-1.5 block">{t("notes").toUpperCase()}</Label>
              <Input value={assign.notes} onChange={(e) => setA("notes", e.target.value)} placeholder={t("notesPlaceholder")} className="bg-bg3 border-bg5 text-txt text-sm" />
            </div>
          </div>
          {assignError && <p className="text-coral text-xs mb-3">{assignError}</p>}
          <Button
            onClick={() => {
              if (!assign.athleteProfileId || !assign.testId) { setAssignError(t("errorRequired")); return; }
              assignMut.mutate({
                athleteProfileId: assign.athleteProfileId,
                testId: assign.testId,
                scheduledAt: assign.scheduledAt ? new Date(assign.scheduledAt) : undefined,
                notes: assign.notes || undefined,
              });
              if (!filterAthleteId) setFilterAthleteId(assign.athleteProfileId);
            }}
            disabled={assignMut.isPending}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-white"
          >
            {assignMut.isPending ? t("assigning") : t("assign")}
          </Button>
        </section>

        {/* Assignments list */}
        <section className="bg-bg2 border border-bg5 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-bg5 flex items-center justify-between">
            <h2 className="text-txt font-bold text-sm">Assignments</h2>
            <select
              value={filterAthleteId}
              onChange={(e) => setFilterAthleteId(e.target.value)}
              className="text-xs rounded-lg border border-bg5 bg-bg3 text-txt px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">All athletes</option>
              {athletes.map((ca: any) => <option key={ca.athlete.id} value={ca.athlete.id}>{ca.athlete.user.name}</option>)}
            </select>
          </div>

          {!filterAthleteId
            ? <p className="text-txt3 text-sm text-center py-10">Select an athlete to view their test assignments.</p>
            : assignLoading
              ? <p className="text-txt3 text-sm text-center py-10">{tCommon("loading")}</p>
              : assignments.length === 0
                ? <p className="text-txt3 text-sm text-center py-10">{t("noAssignments")}</p>
                : (
                  <div className="divide-y divide-bg5">
                    {assignments.map((item: any) => {
                      const isDone = item.status === "COMPLETED";
                      const isOpenResult = openResultId === item.id;
                      const isEditing = editId === item.id;
                      const resultForm = resultForms[item.id] ?? EMPTY_RESULT;
                      const editForm = editForms[item.id] ?? {
                        scheduledAt: item.scheduledAt ? new Date(item.scheduledAt).toISOString().split("T")[0] : "",
                        notes: item.notes ?? "",
                      };
                      const isDeleting = deletingId === item.id;

                      return (
                        <div key={item.id} className="px-5 py-4">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                              {isDone
                                ? <CheckCircle2 size={16} className="text-accent" />
                                : <Clock size={16} className="text-amber" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                <span className="text-txt font-semibold text-sm">{item.test.name}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDone ? "text-accent bg-accent/10 border border-accent/20" : "text-amber bg-amber/10 border border-amber/20"}`}>
                                  {isDone ? t("completed").toUpperCase() : t("pending").toUpperCase()}
                                </span>
                                <span className="text-txt3 text-xs">{item.test.unit}</span>
                              </div>

                              {!isEditing && (
                                <>
                                  {item.scheduledAt && <p className="text-txt3 text-xs mb-1">{t("scheduledFor", { date: new Date(item.scheduledAt).toLocaleDateString() })}</p>}
                                  {item.notes && <p className="text-txt2 text-xs italic mb-1">{item.notes}</p>}
                                </>
                              )}

                              {/* Inline edit form */}
                              {isEditing && (
                                <div className="mt-2 p-3 bg-bg3 rounded-xl border border-bg5 flex flex-col gap-2">
                                  <div className="flex gap-2">
                                    <div className="flex-1">
                                      <Label className="text-txt3 text-[10px] tracking-widest font-bold mb-1 block">DATE</Label>
                                      <Input
                                        type="date"
                                        value={editForm.scheduledAt}
                                        onChange={(e) => setEditForms((p) => ({ ...p, [item.id]: { ...editForm, scheduledAt: e.target.value } }))}
                                        className="bg-bg2 border-bg5 text-txt text-xs h-8"
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <Label className="text-txt3 text-[10px] tracking-widest font-bold mb-1 block">NOTES</Label>
                                      <Input
                                        value={editForm.notes}
                                        onChange={(e) => setEditForms((p) => ({ ...p, [item.id]: { ...editForm, notes: e.target.value } }))}
                                        placeholder="Optional..."
                                        className="bg-bg2 border-bg5 text-txt text-xs h-8"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => updateAssignmentMut.mutate({
                                        athleteTestId: item.id,
                                        scheduledAt: editForm.scheduledAt ? new Date(editForm.scheduledAt) : null,
                                        notes: editForm.notes || null,
                                      })}
                                      disabled={updateAssignmentMut.isPending}
                                      className="bg-primary text-white text-xs h-7 px-3"
                                    >
                                      <Check size={12} className="mr-1" />Save
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditId(null)} className="text-txt3 h-7"><X size={12} /></Button>
                                  </div>
                                </div>
                              )}

                              {/* Result */}
                              {isDone && item.result && (
                                <div className="inline-flex items-center gap-1.5 bg-accent/8 border border-accent/20 rounded-xl px-3 py-1.5 mt-1">
                                  <span className="text-accent font-bold text-base">{item.result.value}</span>
                                  <span className="text-txt3 text-xs">{item.result.unit}</span>
                                  {item.result.notes && <span className="text-txt3 text-xs ml-1">— {item.result.notes}</span>}
                                </div>
                              )}

                              {/* Add result */}
                              {!isDone && (
                                <div className="mt-2">
                                  <button
                                    onClick={() => setOpenResultId(isOpenResult ? null : item.id)}
                                    className="flex items-center gap-1.5 text-primary text-xs font-semibold hover:opacity-80 transition-opacity"
                                  >
                                    {isOpenResult ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                    {t("addResult")}
                                  </button>
                                  {isOpenResult && (
                                    <div className="mt-2.5 p-3 bg-bg3 rounded-xl border border-bg5 flex flex-col gap-2">
                                      <div className="flex gap-2">
                                        <div className="flex-1">
                                          <Label className="text-txt3 text-[10px] tracking-widest font-bold mb-1 block">{t("value").toUpperCase()} ({item.test.unit}) *</Label>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={resultForm.value}
                                            onChange={(e) => setResultForms((p) => ({ ...p, [item.id]: { ...resultForm, value: e.target.value } }))}
                                            placeholder="0"
                                            className="bg-bg2 border-bg5 text-txt text-sm"
                                          />
                                        </div>
                                        <div className="flex-1">
                                          <Label className="text-txt3 text-[10px] tracking-widest font-bold mb-1 block">{t("notes").toUpperCase()}</Label>
                                          <Input
                                            value={resultForm.notes}
                                            onChange={(e) => setResultForms((p) => ({ ...p, [item.id]: { ...resultForm, notes: e.target.value } }))}
                                            placeholder="Optional..."
                                            className="bg-bg2 border-bg5 text-txt text-sm"
                                          />
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            if (!resultForm.value) return;
                                            addResultMut.mutate({ athleteTestId: item.id, value: parseFloat(resultForm.value), notes: resultForm.notes || undefined });
                                          }}
                                          disabled={!resultForm.value || addResultMut.isPending}
                                          className="bg-accent hover:bg-accent/90 text-white text-xs"
                                        >
                                          {addResultMut.isPending ? t("recording") : t("recordResult")}
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => setOpenResultId(null)} className="text-txt3"><X size={13} /></Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                              {!isDone && (
                                <button
                                  onClick={() => {
                                    setEditId(isEditing ? null : item.id);
                                    setEditForms((p) => ({
                                      ...p,
                                      [item.id]: {
                                        scheduledAt: item.scheduledAt ? new Date(item.scheduledAt).toISOString().split("T")[0] : "",
                                        notes: item.notes ?? "",
                                      },
                                    }));
                                  }}
                                  className="w-7 h-7 rounded-lg bg-bg3 hover:bg-bg4 flex items-center justify-center transition-colors"
                                  title="Edit"
                                >
                                  <Pencil size={12} className="text-txt3" />
                                </button>
                              )}
                              {isDeleting ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => deleteAssignmentMut.mutate({ athleteTestId: item.id })}
                                    disabled={deleteAssignmentMut.isPending}
                                    className="text-[10px] font-bold text-coral hover:opacity-80 px-2 py-1 bg-coral/10 border border-coral/20 rounded-lg"
                                  >
                                    Confirm
                                  </button>
                                  <button onClick={() => setDeletingId(null)} className="text-[10px] text-txt3 hover:opacity-80 px-2 py-1">
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeletingId(item.id)}
                                  className="w-7 h-7 rounded-lg bg-bg3 hover:bg-coral/10 flex items-center justify-center transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 size={12} className="text-txt3 hover:text-coral" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
        </section>
      </div>

      {/* Catalog */}
      <div className="flex flex-col gap-4">
        <section className="bg-bg2 border border-bg5 rounded-2xl p-4">
          <button
            onClick={() => setShowNewTest(!showNewTest)}
            className="w-full flex items-center justify-between text-txt font-bold text-sm"
          >
            <span className="flex items-center gap-2"><Plus size={15} className="text-primary" />{t("newTest")}</span>
            {showNewTest ? <ChevronUp size={15} className="text-txt3" /> : <ChevronDown size={15} className="text-txt3" />}
          </button>
          {showNewTest && (
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <Label className="text-txt3 text-[10px] tracking-widest font-bold mb-1 block">{t("testName").toUpperCase()}</Label>
                <Input value={newTest.name} onChange={(e) => setNT("name", e.target.value)} placeholder={t("testNamePlaceholder")} className="bg-bg3 border-bg5 text-txt text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-txt3 text-[10px] tracking-widest font-bold mb-1 block">{t("sport").toUpperCase()}</Label>
                  <Input value={newTest.sport} onChange={(e) => setNT("sport", e.target.value)} placeholder="Running" className="bg-bg3 border-bg5 text-txt text-sm" />
                </div>
                <div>
                  <Label className="text-txt3 text-[10px] tracking-widest font-bold mb-1 block">{t("unit").toUpperCase()}</Label>
                  <Input value={newTest.unit} onChange={(e) => setNT("unit", e.target.value)} placeholder={t("unitPlaceholder")} className="bg-bg3 border-bg5 text-txt text-sm" />
                </div>
              </div>
              <div>
                <Label className="text-txt3 text-[10px] tracking-widest font-bold mb-1 block">{t("description").toUpperCase()}</Label>
                <textarea
                  value={newTest.description}
                  onChange={(e) => setNT("description", e.target.value)}
                  placeholder={t("descriptionPlaceholder")}
                  rows={2}
                  className="w-full rounded-lg border border-bg5 bg-bg3 text-txt text-sm px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              {newTestError && <p className="text-coral text-xs">{newTestError}</p>}
              <Button
                size="sm"
                onClick={() => {
                  if (!newTest.name || !newTest.unit) { setNewTestError(t("errorRequired")); return; }
                  createTestMut.mutate({ name: newTest.name, sport: newTest.sport || undefined, unit: newTest.unit, description: newTest.description || undefined });
                }}
                disabled={createTestMut.isPending}
                className="bg-primary hover:bg-primary/90 text-white w-full"
              >
                {createTestMut.isPending ? t("creating") : t("createTest")}
              </Button>
            </div>
          )}
        </section>

        <section className="bg-bg2 border border-bg5 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-bg5">
            <p className="text-txt font-bold text-sm mb-2">{t("catalog")}</p>
            {sports.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {["all", ...sports].map((s) => (
                  <button
                    key={s}
                    onClick={() => setCatalogFilter(s)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-colors ${catalogFilter === s ? "bg-primary text-white border-primary" : "text-txt3 border-bg5 hover:border-primary/40"}`}
                  >
                    {s === "all" ? "All" : s}
                  </button>
                ))}
              </div>
            )}
          </div>
          {filteredCatalog.length === 0
            ? <p className="text-txt3 text-xs text-center py-8">{t("noCatalog")}</p>
            : (
              <div className="divide-y divide-bg5 max-h-[520px] overflow-y-auto">
                {filteredCatalog.map((test: any) => (
                  <div key={test.id} className="px-4 py-3 hover:bg-bg3 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-txt text-sm font-medium truncate">{test.name}</p>
                        {test.description && <p className="text-txt3 text-[11px] mt-0.5 leading-relaxed line-clamp-2">{test.description}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-bg4 text-txt3 border border-bg5">{test.unit}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${test.isGlobal ? "bg-primary/10 text-primary border border-primary/20" : "bg-amber/10 text-amber border border-amber/20"}`}>
                          {test.isGlobal ? t("global").toUpperCase() : t("custom").toUpperCase()}
                        </span>
                      </div>
                    </div>
                    {test.sport && <span className="text-[10px] text-txt3 mt-1 block">{test.sport}</span>}
                  </div>
                ))}
              </div>
            )}
        </section>
      </div>
    </div>
  );
}

// ── Custom Tests Tab ───────────────────────────────────────────────────────────

interface MovementDraft {
  name: string;
  sets: string;
  reps: string;
  distanceMeters: string;
  durationSeconds: string;
  notes: string;
}

const EMPTY_MOVEMENT: MovementDraft = { name: "", sets: "", reps: "", distanceMeters: "", durationSeconds: "", notes: "" };

function CustomTestsTab({ t, tCommon }: { t: any; tCommon: any }) {
  const utils = trpc.useUtils();
  const { data: athletes = [] } = trpc.athletes.list.useQuery();
  const { data: customTests = [], isLoading } = trpc.customTests.list.useQuery();

  // ── Create form ──────────────────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", sport: "", unit: "seconds", description: "" });
  const [movements, setMovements] = useState<MovementDraft[]>([{ ...EMPTY_MOVEMENT }]);
  const [createError, setCreateError] = useState("");
  const setF = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const addMovement = () => setMovements((p) => [...p, { ...EMPTY_MOVEMENT }]);
  const removeMovement = (i: number) => setMovements((p) => p.filter((_, idx) => idx !== i));
  const setM = (i: number, k: keyof MovementDraft, v: string) =>
    setMovements((p) => p.map((m, idx) => (idx === i ? { ...m, [k]: v } : m)));

  const createMut = trpc.customTests.create.useMutation({
    onSuccess: () => {
      setForm({ name: "", sport: "", unit: "seconds", description: "" });
      setMovements([{ ...EMPTY_MOVEMENT }]);
      setCreateError("");
      setShowCreate(false);
      utils.customTests.list.invalidate();
    },
    onError: (e) => setCreateError(e.message),
  });

  function handleCreate() {
    if (!form.name || !form.unit) { setCreateError("Name and unit are required"); return; }
    const valid = movements.filter((m) => m.name.trim());
    if (valid.length === 0) { setCreateError("Add at least one movement"); return; }
    createMut.mutate({
      name: form.name,
      sport: form.sport || undefined,
      unit: form.unit,
      description: form.description || undefined,
      movements: valid.map((m, i) => ({
        name: m.name,
        sets: m.sets ? parseInt(m.sets) : undefined,
        reps: m.reps ? parseInt(m.reps) : undefined,
        distanceMeters: m.distanceMeters ? parseFloat(m.distanceMeters) : undefined,
        durationSeconds: m.durationSeconds ? parseInt(m.durationSeconds) : undefined,
        notes: m.notes || undefined,
        order: i,
      })),
    });
  }

  // ── Assign form ──────────────────────────────────────────────────────────────
  const [openAssignId, setOpenAssignId] = useState<string | null>(null);
  const [assignForms, setAssignForms] = useState<Record<string, { athleteProfileId: string; scheduledAt: string; notes: string }>>({});

  const assignMut = trpc.customTests.assign.useMutation({
    onSuccess: (data, vars) => {
      const assignedAthleteId = vars.athleteProfileId;
      setOpenAssignId(null);
      setAssignForms({});
      utils.customTests.list.invalidate();
      // Auto-show this athlete's assignments in the right panel
      setAssignFilterAthlete(assignedAthleteId);
      utils.customTests.athleteAssignments.invalidate({ athleteProfileId: assignedAthleteId });
    },
  });

  // ── Assignments view ─────────────────────────────────────────────────────────
  const [assignFilterAthlete, setAssignFilterAthlete] = useState("");
  const { data: athleteAssignments = [] } = trpc.customTests.athleteAssignments.useQuery(
    { athleteProfileId: assignFilterAthlete },
    { enabled: !!assignFilterAthlete },
  );

  // ── Per-movement result forms ─────────────────────────────────────────────────
  // movementResultForms[assignmentId][movementId] = { value, notes }
  const [movementResultForms, setMovementResultForms] = useState<
    Record<string, Record<string, { value: string; notes: string }>>
  >({});
  const [savingMovementKey, setSavingMovementKey] = useState<string | null>(null);

  const setMovementResultMut = trpc.customTests.setMovementResult.useMutation({
    onSuccess: () => {
      setSavingMovementKey(null);
      utils.customTests.athleteAssignments.invalidate({ athleteProfileId: assignFilterAthlete });
    },
  });

  // ── Edit assignment ──────────────────────────────────────────────────────────
  const [editAssignId, setEditAssignId] = useState<string | null>(null);
  const [editAssignForms, setEditAssignForms] = useState<Record<string, { scheduledAt: string; notes: string }>>({});

  const updateAssignmentMut = trpc.customTests.updateAssignment.useMutation({
    onSuccess: () => {
      setEditAssignId(null);
      utils.customTests.athleteAssignments.invalidate({ athleteProfileId: assignFilterAthlete });
    },
  });

  // ── Delete assignment ────────────────────────────────────────────────────────
  const [deletingAssignId, setDeletingAssignId] = useState<string | null>(null);

  const deleteAssignmentMut = trpc.customTests.deleteAssignment.useMutation({
    onSuccess: () => {
      setDeletingAssignId(null);
      utils.customTests.athleteAssignments.invalidate({ athleteProfileId: assignFilterAthlete });
    },
  });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Left: custom test library */}
      <div className="xl:col-span-2 flex flex-col gap-6">
        <section className="bg-bg2 border border-bg5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-txt font-bold text-sm">Custom Tests</h2>
            <Button
              size="sm"
              onClick={() => setShowCreate(!showCreate)}
              variant={showCreate ? "ghost" : "default"}
              className={showCreate ? "text-txt3" : "bg-primary text-white"}
            >
              {showCreate ? <><X size={13} className="mr-1" /> Cancel</> : <><Plus size={13} className="mr-1" /> New Custom Test</>}
            </Button>
          </div>

          {/* Create form */}
          {showCreate && (
            <div className="border border-bg5 rounded-xl p-4 bg-bg3 mb-4">
              <p className="text-txt3 text-[10px] tracking-widest font-bold mb-3">TEST DETAILS</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="col-span-2">
                  <Label className="text-txt3 text-[10px] tracking-widest font-bold mb-1 block">TEST NAME *</Label>
                  <Input value={form.name} onChange={(e) => setF("name", e.target.value)} placeholder="e.g. 5K + Wallball Circuit" className="bg-bg2 border-bg5 text-txt text-sm" />
                </div>
                <div>
                  <Label className="text-txt3 text-[10px] tracking-widest font-bold mb-1 block">SPORT</Label>
                  <Input value={form.sport} onChange={(e) => setF("sport", e.target.value)} placeholder="CrossFit" className="bg-bg2 border-bg5 text-txt text-sm" />
                </div>
                <div>
                  <Label className="text-txt3 text-[10px] tracking-widest font-bold mb-1 block">RESULT UNIT *</Label>
                  <select value={form.unit} onChange={(e) => setF("unit", e.target.value)} className="w-full rounded-lg border border-bg5 bg-bg2 text-txt text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40">
                    <option value="seconds">seconds (time)</option>
                    <option value="minutes">minutes (time)</option>
                    <option value="reps">reps (score)</option>
                    <option value="rounds">rounds (score)</option>
                    <option value="kg">kg (weight)</option>
                    <option value="points">points</option>
                    <option value="custom">custom</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <Label className="text-txt3 text-[10px] tracking-widest font-bold mb-1 block">DESCRIPTION</Label>
                  <textarea value={form.description} onChange={(e) => setF("description", e.target.value)} placeholder="Describe the test protocol..." rows={2} className="w-full rounded-lg border border-bg5 bg-bg2 text-txt text-sm px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
              </div>

              {/* Movements */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-txt3 text-[10px] tracking-widest font-bold">MOVEMENTS</p>
                  <button onClick={addMovement} className="flex items-center gap-1 text-primary text-xs font-semibold hover:opacity-80">
                    <Plus size={12} /> Add Movement
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {movements.map((m, i) => (
                    <div key={i} className="bg-bg2 border border-bg5 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <GripVertical size={14} className="text-txt3 flex-shrink-0" />
                        <span className="text-txt3 text-[10px] font-bold">{i + 1}.</span>
                        <Input value={m.name} onChange={(e) => setM(i, "name", e.target.value)} placeholder="e.g. 5km Run" className="flex-1 bg-bg3 border-bg5 text-txt text-sm h-8" />
                        {movements.length > 1 && (
                          <button onClick={() => removeMovement(i)} className="text-coral hover:opacity-70 flex-shrink-0"><Trash2 size={13} /></button>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        <div><Label className="text-txt3 text-[9px] font-bold mb-0.5 block">SETS</Label><Input type="number" value={m.sets} onChange={(e) => setM(i, "sets", e.target.value)} placeholder="–" className="bg-bg3 border-bg5 text-txt text-xs h-7 px-2" /></div>
                        <div><Label className="text-txt3 text-[9px] font-bold mb-0.5 block">REPS</Label><Input type="number" value={m.reps} onChange={(e) => setM(i, "reps", e.target.value)} placeholder="–" className="bg-bg3 border-bg5 text-txt text-xs h-7 px-2" /></div>
                        <div><Label className="text-txt3 text-[9px] font-bold mb-0.5 block">DIST (m)</Label><Input type="number" value={m.distanceMeters} onChange={(e) => setM(i, "distanceMeters", e.target.value)} placeholder="–" className="bg-bg3 border-bg5 text-txt text-xs h-7 px-2" /></div>
                        <div><Label className="text-txt3 text-[9px] font-bold mb-0.5 block">TIME (s)</Label><Input type="number" value={m.durationSeconds} onChange={(e) => setM(i, "durationSeconds", e.target.value)} placeholder="–" className="bg-bg3 border-bg5 text-txt text-xs h-7 px-2" /></div>
                      </div>
                      <Input value={m.notes} onChange={(e) => setM(i, "notes", e.target.value)} placeholder="Notes (weight, equipment...)" className="mt-1.5 bg-bg3 border-bg5 text-txt text-xs h-7" />
                    </div>
                  ))}
                </div>
              </div>

              {createError && <p className="text-coral text-xs mb-2">{createError}</p>}
              <Button onClick={handleCreate} disabled={createMut.isPending} className="bg-primary hover:bg-primary/90 text-white w-full">
                {createMut.isPending ? "Creating..." : "Create Custom Test"}
              </Button>
            </div>
          )}

          {/* Custom test list */}
          {isLoading
            ? <p className="text-txt3 text-sm text-center py-6">{tCommon("loading")}</p>
            : customTests.length === 0
              ? <p className="text-txt3 text-sm text-center py-6">No custom tests yet. Create your first one.</p>
              : (
                <div className="flex flex-col gap-3">
                  {customTests.map((ct: any) => {
                    const assignForm = assignForms[ct.id] ?? { athleteProfileId: "", scheduledAt: "", notes: "" };
                    const isAssignOpen = openAssignId === ct.id;
                    return (
                      <div key={ct.id} className="border border-bg5 rounded-xl overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-bg3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-txt font-bold text-sm">{ct.name}</span>
                              {ct.sport && <span className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full font-bold">{ct.sport}</span>}
                              <span className="text-[10px] text-txt3 bg-bg4 border border-bg5 px-2 py-0.5 rounded-full">{ct.unit}</span>
                            </div>
                            {ct.description && <p className="text-txt3 text-xs mt-0.5 truncate">{ct.description}</p>}
                          </div>
                          <button
                            onClick={() => setOpenAssignId(isAssignOpen ? null : ct.id)}
                            className="flex items-center gap-1.5 text-primary text-xs font-semibold hover:opacity-80 ml-3 flex-shrink-0"
                          >
                            {isAssignOpen ? <><X size={12} /> Cancel</> : <><Plus size={12} /> Assign</>}
                          </button>
                        </div>

                        {/* Movements */}
                        <div className="px-4 py-2 flex flex-col gap-1">
                          {ct.movements.map((m: any, idx: number) => (
                            <div key={m.id} className="flex items-baseline gap-2 py-1 border-b border-bg5 last:border-0">
                              <span className="text-txt3 text-[10px] font-bold w-4 flex-shrink-0">{idx + 1}.</span>
                              <span className="text-txt text-sm font-medium">{m.name}</span>
                              {formatMovement(m) && <span className="text-txt3 text-xs">{formatMovement(m)}</span>}
                              {m.notes && <span className="text-txt3 text-[10px] italic ml-auto">{m.notes}</span>}
                            </div>
                          ))}
                        </div>

                        {/* Assign form */}
                        {isAssignOpen && (
                          <div className="px-4 pb-4 pt-2 border-t border-bg5 bg-bg3/50">
                            <p className="text-txt3 text-[10px] tracking-widest font-bold mb-2">ASSIGN TO ATHLETE</p>
                            <div className="grid grid-cols-3 gap-2 mb-2">
                              <div>
                                <select
                                  value={assignForm.athleteProfileId}
                                  onChange={(e) => setAssignForms((p) => ({ ...p, [ct.id]: { ...assignForm, athleteProfileId: e.target.value } }))}
                                  className="w-full rounded-lg border border-bg5 bg-bg2 text-txt text-xs px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/40"
                                >
                                  <option value="">Select athlete</option>
                                  {athletes.map((ca: any) => <option key={ca.athlete.id} value={ca.athlete.id}>{ca.athlete.user.name}</option>)}
                                </select>
                              </div>
                              <div>
                                <Input type="date" value={assignForm.scheduledAt} onChange={(e) => setAssignForms((p) => ({ ...p, [ct.id]: { ...assignForm, scheduledAt: e.target.value } }))} className="bg-bg2 border-bg5 text-txt text-xs h-8" />
                              </div>
                              <div>
                                <Input value={assignForm.notes} onChange={(e) => setAssignForms((p) => ({ ...p, [ct.id]: { ...assignForm, notes: e.target.value } }))} placeholder="Notes..." className="bg-bg2 border-bg5 text-txt text-xs h-8" />
                              </div>
                            </div>
                            <Button
                              size="sm"
                              disabled={!assignForm.athleteProfileId || assignMut.isPending}
                              onClick={() => assignMut.mutate({
                                customTestId: ct.id,
                                athleteProfileId: assignForm.athleteProfileId,
                                scheduledAt: assignForm.scheduledAt ? new Date(assignForm.scheduledAt) : undefined,
                                notes: assignForm.notes || undefined,
                              })}
                              className="bg-primary hover:bg-primary/90 text-white text-xs"
                            >
                              {assignMut.isPending ? "Assigning..." : "Assign Test"}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
        </section>
      </div>

      {/* Right: assignments per athlete */}
      <div className="flex flex-col gap-4">
        <section className="bg-bg2 border border-bg5 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-bg5">
            <p className="text-txt font-bold text-sm mb-2">Assignments</p>
            <select
              value={assignFilterAthlete}
              onChange={(e) => setAssignFilterAthlete(e.target.value)}
              className="w-full text-xs rounded-lg border border-bg5 bg-bg3 text-txt px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">Select athlete</option>
              {athletes.map((ca: any) => <option key={ca.athlete.id} value={ca.athlete.id}>{ca.athlete.user.name}</option>)}
            </select>
          </div>

          {!assignFilterAthlete
            ? <p className="text-txt3 text-xs text-center py-8">Select an athlete to view their custom test assignments.</p>
            : athleteAssignments.length === 0
              ? <p className="text-txt3 text-xs text-center py-8">No custom tests assigned yet.</p>
              : (
                <div className="divide-y divide-bg5 max-h-[700px] overflow-y-auto">
                  {athleteAssignments.map((item: any) => {
                    const isDone = item.status === "COMPLETED";
                    const isEditingAssign = editAssignId === item.id;
                    const editAssignForm = editAssignForms[item.id] ?? {
                      scheduledAt: item.scheduledAt ? new Date(item.scheduledAt).toISOString().split("T")[0] : "",
                      notes: item.notes ?? "",
                    };
                    const isConfirmingDelete = deletingAssignId === item.id;

                    return (
                      <div key={item.id} className="px-4 py-3">
                        {/* Title row */}
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isDone
                              ? <CheckCircle2 size={14} className="text-accent flex-shrink-0" />
                              : <Clock size={14} className="text-amber flex-shrink-0" />}
                            <span className="text-txt font-semibold text-sm">{item.customTest.name}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isDone ? "text-accent bg-accent/10 border border-accent/20" : "text-amber bg-amber/10 border border-amber/20"}`}>
                              {isDone ? "DONE" : "PENDING"}
                            </span>
                          </div>
                          {/* Edit/Delete */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!isDone && (
                              <button
                                onClick={() => {
                                  setEditAssignId(isEditingAssign ? null : item.id);
                                  setEditAssignForms((p) => ({
                                    ...p,
                                    [item.id]: {
                                      scheduledAt: item.scheduledAt ? new Date(item.scheduledAt).toISOString().split("T")[0] : "",
                                      notes: item.notes ?? "",
                                    },
                                  }));
                                }}
                                className="w-6 h-6 rounded-md bg-bg3 hover:bg-bg4 flex items-center justify-center transition-colors"
                                title="Edit"
                              >
                                <Pencil size={11} className="text-txt3" />
                              </button>
                            )}
                            {isConfirmingDelete ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => deleteAssignmentMut.mutate({ assignmentId: item.id })}
                                  disabled={deleteAssignmentMut.isPending}
                                  className="text-[9px] font-bold text-coral px-1.5 py-0.5 bg-coral/10 border border-coral/20 rounded"
                                >
                                  Delete
                                </button>
                                <button onClick={() => setDeletingAssignId(null)} className="text-[9px] text-txt3 px-1">✕</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeletingAssignId(item.id)}
                                className="w-6 h-6 rounded-md bg-bg3 hover:bg-coral/10 flex items-center justify-center transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={11} className="text-txt3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Scheduled / notes (unless editing) */}
                        {!isEditingAssign && (
                          <>
                            {item.scheduledAt && <p className="text-txt3 text-[11px] mb-1">📅 {new Date(item.scheduledAt).toLocaleDateString()}</p>}
                            {item.notes && <p className="text-txt2 text-[11px] italic mb-1">{item.notes}</p>}
                          </>
                        )}

                        {/* Inline edit form */}
                        {isEditingAssign && (
                          <div className="mb-2 p-2.5 bg-bg3 rounded-lg border border-bg5 flex flex-col gap-1.5">
                            <Input
                              type="date"
                              value={editAssignForm.scheduledAt}
                              onChange={(e) => setEditAssignForms((p) => ({ ...p, [item.id]: { ...editAssignForm, scheduledAt: e.target.value } }))}
                              className="bg-bg2 border-bg5 text-txt text-xs h-7"
                            />
                            <Input
                              value={editAssignForm.notes}
                              onChange={(e) => setEditAssignForms((p) => ({ ...p, [item.id]: { ...editAssignForm, notes: e.target.value } }))}
                              placeholder="Notes..."
                              className="bg-bg2 border-bg5 text-txt text-xs h-7"
                            />
                            <div className="flex gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => updateAssignmentMut.mutate({
                                  assignmentId: item.id,
                                  scheduledAt: editAssignForm.scheduledAt ? new Date(editAssignForm.scheduledAt) : null,
                                  notes: editAssignForm.notes || null,
                                })}
                                disabled={updateAssignmentMut.isPending}
                                className="bg-primary text-white text-xs h-7 px-2.5"
                              >
                                <Check size={11} className="mr-1" />Save
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditAssignId(null)} className="text-txt3 h-7 px-2"><X size={11} /></Button>
                            </div>
                          </div>
                        )}

                        {/* Per-movement results */}
                        <div className="flex flex-col gap-1.5 mt-1">
                          {item.customTest.movements.map((m: any, i: number) => {
                            const movResult = item.movementResults?.find((r: any) => r.movementId === m.id);
                            const pct = movResult ? calcMovementPct(m, movResult.value) : null;
                            const label = getMovementInputLabel(m);
                            const key = `${item.id}-${m.id}`;
                            const formVal = movementResultForms[item.id]?.[m.id] ?? { value: movResult ? String(movResult.value) : "", notes: movResult?.notes ?? "" };
                            const isSaving = savingMovementKey === key;

                            return (
                              <div key={m.id} className={`rounded-lg border px-3 py-2.5 ${movResult ? "border-accent/20 bg-accent/5" : "border-bg5 bg-bg3"}`}>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <span className="text-txt3 text-[10px] font-bold w-4">{i + 1}.</span>
                                  <span className="text-txt text-xs font-semibold flex-1">{m.name}</span>
                                  {formatMovement(m) && <span className="text-txt3 text-[10px]">{formatMovement(m)}</span>}
                                  {pct !== null && (
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${pct >= 90 ? "text-accent bg-accent/15" : pct >= 70 ? "text-amber bg-amber/15" : "text-coral bg-coral/15"}`}>
                                      {Math.round(pct)}%
                                    </span>
                                  )}
                                  {movResult && !isDone && (
                                    <CheckCircle2 size={12} className="text-accent flex-shrink-0" />
                                  )}
                                </div>
                                {!isDone && (
                                  <div className="flex gap-1.5">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={formVal.value}
                                      onChange={(e) => setMovementResultForms((p) => ({
                                        ...p,
                                        [item.id]: { ...(p[item.id] ?? {}), [m.id]: { ...formVal, value: e.target.value } },
                                      }))}
                                      placeholder={label}
                                      className="bg-bg2 border-bg5 text-txt text-xs h-7 flex-1"
                                    />
                                    <Input
                                      value={formVal.notes}
                                      onChange={(e) => setMovementResultForms((p) => ({
                                        ...p,
                                        [item.id]: { ...(p[item.id] ?? {}), [m.id]: { ...formVal, notes: e.target.value } },
                                      }))}
                                      placeholder="Notes..."
                                      className="bg-bg2 border-bg5 text-txt text-xs h-7 flex-1"
                                    />
                                    <Button
                                      size="sm"
                                      disabled={!formVal.value || isSaving}
                                      onClick={() => {
                                        if (!formVal.value) return;
                                        setSavingMovementKey(key);
                                        setMovementResultMut.mutate({
                                          assignmentId: item.id,
                                          movementId: m.id,
                                          value: parseFloat(formVal.value),
                                          notes: formVal.notes || undefined,
                                        });
                                      }}
                                      className={`text-white text-xs h-7 px-2.5 flex-shrink-0 ${movResult ? "bg-accent hover:bg-accent/90" : "bg-primary hover:bg-primary/90"}`}
                                    >
                                      {isSaving ? "…" : movResult ? "Update" : "Save"}
                                    </Button>
                                  </div>
                                )}
                                {isDone && movResult && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-txt2 text-xs font-semibold">{movResult.value}</span>
                                    <span className="text-txt3 text-[10px]">{label.split(" ")[0]}</span>
                                    {movResult.notes && <span className="text-txt3 text-[10px] italic">— {movResult.notes}</span>}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Overall score when completed */}
                        {isDone && item.result && (
                          <div className="mt-2 flex items-center gap-2 bg-accent/8 border border-accent/20 rounded-lg px-3 py-2">
                            <CheckCircle2 size={13} className="text-accent" />
                            <span className="text-txt3 text-xs">Overall score:</span>
                            <span className="text-accent font-bold text-base">{item.result.value}{item.result.unit}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
        </section>
      </div>
    </div>
  );
}
