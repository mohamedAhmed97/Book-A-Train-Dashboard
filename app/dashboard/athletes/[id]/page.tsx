"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft, Activity, Clock, Flame, Gauge, Waves, CheckCircle2, Circle,
  ChevronDown, ChevronUp, Timer, MapPin, FileText, CalendarDays, Dumbbell,
  ClipboardList, X, HeartPulse, Droplets, TrendingUp, Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ZONE_COLORS, formatSeconds, type Zone } from "@/lib/vitals";
import { formatMetricValue, metricMeta } from "@/lib/metricCatalog";
import { metricStyle, metricLabel } from "@/lib/metricDisplay";

const STATUS_STYLE: Record<string, string> = {
  SCHEDULED: "text-accent bg-accent/10 border border-accent/20",
  ONGOING: "text-amber bg-amber/10 border border-amber/20",
  COMPLETED: "text-txt2 bg-bg3 border border-bg5",
  CANCELLED: "text-coral bg-coral/10 border border-coral/20",
};

const GPS_SPORTS = new Set(["Running", "Cycling", "Football", "Basketball", "Tennis"]);
const LAP_SPORTS = new Set(["Swimming"]);

function formatDuration(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatPace(secPerKm: number) {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function AthleteProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations("athleteProfile");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("sessions.status");

  const { data: athlete, isLoading } = trpc.athletes.getProfile.useQuery({ athleteProfileId: id });
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);

  // Tests
  const tTests = useTranslations("tests");
  const utils = trpc.useUtils();
  const { data: catalog = [] } = trpc.tests.catalog.useQuery();
  const { data: athleteTests = [], isLoading: testsLoading } = trpc.tests.athleteTests.useQuery({ athleteProfileId: id });
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignForm, setAssignForm] = useState({ testId: "", scheduledAt: "", notes: "" });
  const [assignError, setAssignError] = useState("");
  const [openResultId, setOpenResultId] = useState<string | null>(null);
  const [resultForms, setResultForms] = useState<Record<string, { value: string; notes: string }>>({});

  const assignMut = trpc.tests.assign.useMutation({
    onSuccess: () => {
      setAssignForm({ testId: "", scheduledAt: "", notes: "" });
      setAssignError("");
      setShowAssignForm(false);
      utils.tests.athleteTests.invalidate();
    },
    onError: (e) => setAssignError(e.message),
  });

  const addResultMut = trpc.tests.addResult.useMutation({
    onSuccess: () => {
      setOpenResultId(null);
      setResultForms({});
      utils.tests.athleteTests.invalidate();
    },
  });

  function handleAssign() {
    if (!assignForm.testId) { setAssignError(tTests("errorRequired")); return; }
    assignMut.mutate({
      athleteProfileId: id,
      testId: assignForm.testId,
      scheduledAt: assignForm.scheduledAt ? new Date(assignForm.scheduledAt) : undefined,
      notes: assignForm.notes || undefined,
    });
  }

  function handleRecordResult(athleteTestId: string) {
    const form = resultForms[athleteTestId];
    if (!form?.value) return;
    addResultMut.mutate({ athleteTestId, value: parseFloat(form.value), notes: form.notes || undefined });
  }

  if (isLoading) {
    return (
      <div className="p-7 flex items-center justify-center min-h-[400px]">
        <p className="text-txt2 text-sm">{tCommon("loading")}</p>
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="p-7">
        <p className="text-coral text-sm">{t("notFound")}</p>
      </div>
    );
  }

  const now = new Date();
  const pastBookings = athlete.bookings.filter(
    (b) => new Date(b.session.scheduledAt) < now && b.session.status !== "CANCELLED",
  );
  const totalExercisesDone = athlete.bookings.reduce(
    (sum, b) => sum + b.progress.filter((p) => p.completed).length,
    0,
  );
  const workoutsRecorded = athlete.bookings.filter((b) => b.workoutResult).length;

  return (
    <div className="p-7">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-txt3 text-sm hover:text-txt transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        {tCommon("back")}
      </button>

      {/* Profile header */}
      <div className="bg-bg2 border border-bg5 rounded-2xl p-6 mb-6 flex items-start gap-5">
        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
          {athlete.user.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-txt font-bold text-xl">{athlete.user.name}</h1>
          <p className="text-txt3 text-sm">{athlete.user.email}</p>
          {athlete.sport && (
            <span className="inline-block mt-2 text-primary text-xs bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
              {athlete.sport}
            </span>
          )}
          {athlete.bio && <p className="text-txt2 text-sm mt-3 leading-relaxed">{athlete.bio}</p>}
          {athlete.goals && (
            <p className="text-txt3 text-xs mt-2">
              <span className="font-semibold">{t("goals")}:</span> {athlete.goals}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <StatCard label={t("totalSessions")} value={String(athlete.bookings.length)} />
        <StatCard label={t("sessionsAttended")} value={String(pastBookings.length)} accent="text-accent" />
        <StatCard label={t("exercisesDone")} value={String(totalExercisesDone)} accent="text-primary" />
        <StatCard label={t("workoutsRecorded")} value={String(workoutsRecorded)} accent="text-amber" />
        <StatCard
          label="Tests"
          value={`${athleteTests.filter((t: any) => t.status === "COMPLETED").length}/${athleteTests.length}`}
          accent="text-purple-500"
        />
      </div>

      {/* Watch recovery — renders nothing when the athlete has no linked watch */}
      <AthleteRecoverySection athleteProfileId={id} />

      {/* Sessions list */}
      <div className="bg-bg2 border border-bg5 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-bg5">
          <h2 className="text-txt font-bold text-sm">{t("sessions")}</h2>
        </div>

        {athlete.bookings.length === 0 && (
          <p className="text-txt3 text-sm text-center py-10">{t("noSessions")}</p>
        )}

        {athlete.bookings.map((booking) => {
          const isExpanded = expandedBookingId === booking.id;
          const result = booking.workoutResult;
          const sport = booking.session.sport;
          const completedCount = booking.progress.filter((p) => p.completed).length;
          const totalExercises = booking.session.exercises.length;
          const sessionDate = new Date(booking.session.scheduledAt);
          const isGps = GPS_SPORTS.has(sport);
          const isLap = LAP_SPORTS.has(sport);
          const lapsDistanceKm = result?.laps ? (result.laps * 50) / 1000 : null;

          return (
            <div key={booking.id} className="border-b border-bg5 last:border-b-0">
              {/* Row */}
              <button
                className="w-full text-start px-5 py-4 hover:bg-bg3 transition-colors"
                onClick={() => setExpandedBookingId(isExpanded ? null : booking.id)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                      <p className="text-txt font-semibold text-sm">{booking.session.title}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_STYLE[booking.session.status]}`}>
                        {tStatus(booking.session.status)}
                      </span>
                      {result && (
                        <span className="text-[10px] font-semibold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full flex-shrink-0">
                          {t("workoutSaved")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-txt3 text-xs flex-wrap">
                      <span className="flex items-center gap-1">
                        <CalendarDays size={11} />
                        {sessionDate.toLocaleDateString()} {sessionDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span>{sport}</span>
                      <span>{booking.session.durationMinutes} min</span>
                      {booking.session.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={11} />
                          {booking.session.location}
                        </span>
                      )}
                      {totalExercises > 0 && (
                        <span className="flex items-center gap-1">
                          <Dumbbell size={11} />
                          {completedCount}/{totalExercises} {t("exercises")}
                        </span>
                      )}
                    </div>
                  </div>
                  {isExpanded
                    ? <ChevronUp size={16} className="text-txt3 flex-shrink-0" />
                    : <ChevronDown size={16} className="text-txt3 flex-shrink-0" />}
                </div>
              </button>

              {/* Expanded */}
              {isExpanded && (
                <div className="border-t border-bg5 bg-bg3/40">

                  {/* Session info */}
                  {(booking.session.description || booking.session.location) && (
                    <div className="px-5 pt-4 pb-3 border-b border-bg5">
                      <p className="text-txt3 text-[10px] tracking-widest font-bold mb-2">{t("sessionInfo").toUpperCase()}</p>
                      <div className="flex flex-col gap-1.5">
                        {booking.session.location && (
                          <p className="text-txt2 text-sm flex items-center gap-2">
                            <MapPin size={13} className="text-txt3 flex-shrink-0" />
                            {booking.session.location}
                          </p>
                        )}
                        {booking.session.description && (
                          <p className="text-txt2 text-sm flex items-start gap-2">
                            <FileText size={13} className="text-txt3 flex-shrink-0 mt-0.5" />
                            {booking.session.description}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Workout metrics — same layout as the athlete app */}
                  {result ? (
                    <div className="px-5 pt-4 pb-4 border-b border-bg5">
                      <p className="text-txt3 text-[10px] tracking-widest font-bold mb-4">{t("workoutMetrics").toUpperCase()}</p>
                      <div className="flex flex-wrap gap-6">

                        {/* Duration — always */}
                        <MetricTile
                          icon={<Clock size={18} className="text-blue-500" />}
                          label={t("duration")}
                          value={formatDuration(result.durationMs)}
                          bg="bg-blue-500/10"
                        />

                        {/* GPS distance */}
                        {isGps && result.distanceM != null && result.distanceM > 0 && (
                          <MetricTile
                            icon={<Activity size={18} className="text-accent" />}
                            label={t("distance")}
                            value={`${(result.distanceM / 1000).toFixed(2)} km`}
                            bg="bg-accent/10"
                          />
                        )}

                        {/* Pace — Running only */}
                        {sport === "Running" && result.avgPaceSecPerKm != null && (
                          <MetricTile
                            icon={<Timer size={18} className="text-purple-500" />}
                            label={t("pace")}
                            value={`${formatPace(result.avgPaceSecPerKm)} /km`}
                            bg="bg-purple-500/10"
                          />
                        )}

                        {/* Speed — Cycling only */}
                        {sport === "Cycling" && result.avgSpeedKph != null && (
                          <MetricTile
                            icon={<Gauge size={18} className="text-amber" />}
                            label={t("speed")}
                            value={`${result.avgSpeedKph} km/h`}
                            bg="bg-amber/10"
                          />
                        )}

                        {/* Laps + distance — Swimming */}
                        {isLap && result.laps != null && (
                          <>
                            <MetricTile
                              icon={<Waves size={18} className="text-cyan-500" />}
                              label={t("laps")}
                              value={String(result.laps)}
                              bg="bg-cyan-500/10"
                            />
                            {lapsDistanceKm != null && (
                              <MetricTile
                                icon={<Activity size={18} className="text-accent" />}
                                label={t("distance")}
                                value={`${lapsDistanceKm.toFixed(2)} km`}
                                bg="bg-accent/10"
                              />
                            )}
                          </>
                        )}

                        {/* Calories */}
                        {result.calories != null && (
                          <MetricTile
                            icon={<Flame size={18} className="text-coral" />}
                            label={t("calories")}
                            value={`${result.calories} kcal`}
                            bg="bg-red-500/10"
                          />
                        )}
                      </div>

                      {result.notes && (
                        <div className="mt-4 pt-4 border-t border-bg5">
                          <p className="text-txt3 text-[10px] tracking-widest font-bold mb-1">{t("notes").toUpperCase()}</p>
                          <p className="text-txt2 text-sm leading-relaxed">{result.notes}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="px-5 py-3 border-b border-bg5">
                      <p className="text-txt3 text-xs italic">{t("noWorkoutRecorded")}</p>
                    </div>
                  )}

                  {/* Watch vitals — renders nothing when the session captured none */}
                  <SessionVitalsSection bookingId={booking.id} />

                  {/* Exercise progress */}
                  {booking.session.exercises.length > 0 && (
                    <div className="px-5 pt-4 pb-5">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-txt3 text-[10px] tracking-widest font-bold">{t("exerciseProgress").toUpperCase()}</p>
                        <span className="text-txt3 text-xs">{completedCount}/{totalExercises}</span>
                      </div>

                      {/* Progress bar */}
                      {totalExercises > 0 && (
                        <div className="h-1.5 bg-bg4 rounded-full mb-4">
                          <div
                            className="h-1.5 rounded-full bg-accent transition-all"
                            style={{ width: `${(completedCount / totalExercises) * 100}%` }}
                          />
                        </div>
                      )}

                      <div className="flex flex-col gap-2.5">
                        {booking.session.exercises.map((ex) => {
                          const done = booking.progress.find((p) => p.exerciseId === ex.id)?.completed ?? false;
                          const specs = [
                            ex.sets ? `${ex.sets} sets` : null,
                            ex.reps ? `${ex.reps} reps` : null,
                            ex.durationSeconds ? `${ex.durationSeconds}s` : null,
                            ex.restSeconds ? `${ex.restSeconds}s rest` : null,
                          ].filter(Boolean).join(" · ");

                          return (
                            <div key={ex.id} className="flex items-center gap-3">
                              {done
                                ? <CheckCircle2 size={16} className="text-accent flex-shrink-0" />
                                : <Circle size={16} className="text-txt3 flex-shrink-0" />}
                              <div className="flex-1 min-w-0">
                                <span className={`text-sm ${done ? "text-txt font-medium" : "text-txt2"}`}>
                                  {ex.name}
                                </span>
                                {specs && (
                                  <span className="text-txt3 text-xs ml-2">{specs}</span>
                                )}
                              </div>
                              {done && (
                                <span className="text-accent text-[10px] font-bold">{t("done")}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!result && booking.session.exercises.length === 0 && !booking.session.description && (
                    <p className="text-txt3 text-sm px-5 py-4">{t("noData")}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* ── Tests Section ─────────────────────────────────────────── */}
      <div className="bg-bg2 border border-bg5 rounded-2xl overflow-hidden mt-6">
        {/* Header */}
        <div className="px-5 py-4 border-b border-bg5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList size={15} className="text-primary" />
            <h2 className="text-txt font-bold text-sm">{tTests("title")}</h2>
            {athleteTests.length > 0 && (
              <span className="text-[10px] font-bold text-txt3 bg-bg3 border border-bg5 px-2 py-0.5 rounded-full">
                {athleteTests.filter((t: any) => t.status === "COMPLETED").length}/{athleteTests.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowAssignForm(!showAssignForm)}
            className="flex items-center gap-1.5 text-primary text-xs font-semibold hover:opacity-80 transition-opacity"
          >
            {showAssignForm ? <X size={13} /> : <ClipboardList size={13} />}
            {showAssignForm ? tCommon("cancel") : tTests("assignTest")}
          </button>
        </div>

        {/* Assign form */}
        {showAssignForm && (
          <div className="px-5 py-4 border-b border-bg5 bg-bg3/40">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <Label className="text-txt3 text-[10px] tracking-widest font-bold mb-1.5 block">
                  {tTests("selectTest").toUpperCase()} *
                </Label>
                <select
                  value={assignForm.testId}
                  onChange={(e) => setAssignForm((p) => ({ ...p, testId: e.target.value }))}
                  className="w-full rounded-lg border border-bg5 bg-bg2 text-txt text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">{tTests("selectTest")}</option>
                  {catalog.map((test: any) => (
                    <option key={test.id} value={test.id}>
                      {test.name} ({test.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-txt3 text-[10px] tracking-widest font-bold mb-1.5 block">
                  {tTests("scheduledDate").toUpperCase()}
                </Label>
                <Input
                  type="date"
                  value={assignForm.scheduledAt}
                  onChange={(e) => setAssignForm((p) => ({ ...p, scheduledAt: e.target.value }))}
                  className="bg-bg2 border-bg5 text-txt text-sm"
                />
              </div>
              <div>
                <Label className="text-txt3 text-[10px] tracking-widest font-bold mb-1.5 block">
                  {tTests("notes").toUpperCase()}
                </Label>
                <Input
                  value={assignForm.notes}
                  onChange={(e) => setAssignForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder={tTests("notesPlaceholder")}
                  className="bg-bg2 border-bg5 text-txt text-sm"
                />
              </div>
            </div>
            {assignError && <p className="text-coral text-xs mb-2">{assignError}</p>}
            <Button
              size="sm"
              onClick={handleAssign}
              disabled={assignMut.isPending}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {assignMut.isPending ? tTests("assigning") : tTests("assign")}
            </Button>
          </div>
        )}

        {/* Tests list */}
        {testsLoading ? (
          <p className="text-txt3 text-sm text-center py-8">{tCommon("loading")}</p>
        ) : athleteTests.length === 0 ? (
          <p className="text-txt3 text-sm text-center py-8">{tTests("noAssignments")}</p>
        ) : (
          <div className="divide-y divide-bg5">
            {athleteTests.map((item: any) => {
              const isDone = item.status === "COMPLETED";
              const isOpen = openResultId === item.id;
              const form = resultForms[item.id] ?? { value: "", notes: "" };

              return (
                <div key={item.id} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      {isDone
                        ? <CheckCircle2 size={16} className="text-accent" />
                        : <Clock size={16} className="text-amber" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-txt font-semibold text-sm">{item.test.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isDone
                            ? "text-accent bg-accent/10 border border-accent/20"
                            : "text-amber bg-amber/10 border border-amber/20"
                        }`}>
                          {isDone ? tTests("completed").toUpperCase() : tTests("pending").toUpperCase()}
                        </span>
                        <span className="text-txt3 text-xs">{item.test.unit}</span>
                      </div>

                      {item.scheduledAt && (
                        <p className="text-txt3 text-xs mb-1">
                          {tTests("scheduledFor", { date: new Date(item.scheduledAt).toLocaleDateString() })}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-txt2 text-xs italic mb-1">{item.notes}</p>
                      )}

                      {/* Completed result */}
                      {isDone && item.result && (
                        <div className="inline-flex items-center gap-1.5 bg-accent/8 border border-accent/20 rounded-xl px-3 py-1.5 mt-1">
                          <span className="text-accent font-bold text-base">{item.result.value}</span>
                          <span className="text-txt3 text-xs">{item.result.unit}</span>
                          {item.result.notes && (
                            <span className="text-txt3 text-xs ml-1">— {item.result.notes}</span>
                          )}
                          <span className="text-txt3 text-[10px] ml-2">
                            {tTests("completedOn", { date: new Date(item.result.completedAt).toLocaleDateString() })}
                          </span>
                        </div>
                      )}

                      {/* Add result form */}
                      {!isDone && (
                        <div className="mt-2">
                          <button
                            onClick={() => setOpenResultId(isOpen ? null : item.id)}
                            className="flex items-center gap-1.5 text-primary text-xs font-semibold hover:opacity-80 transition-opacity"
                          >
                            {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            {tTests("addResult")}
                          </button>

                          {isOpen && (
                            <div className="mt-2 p-3 bg-bg3 rounded-xl border border-bg5 flex flex-col gap-2">
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <Label className="text-txt3 text-[10px] tracking-widest font-bold mb-1 block">
                                    {tTests("value").toUpperCase()} ({item.test.unit}) *
                                  </Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={form.value}
                                    onChange={(e) => setResultForms((p) => ({ ...p, [item.id]: { ...form, value: e.target.value } }))}
                                    placeholder="0"
                                    className="bg-bg2 border-bg5 text-txt text-sm"
                                  />
                                </div>
                                <div className="flex-1">
                                  <Label className="text-txt3 text-[10px] tracking-widest font-bold mb-1 block">
                                    {tTests("notes").toUpperCase()}
                                  </Label>
                                  <Input
                                    value={form.notes}
                                    onChange={(e) => setResultForms((p) => ({ ...p, [item.id]: { ...form, notes: e.target.value } }))}
                                    placeholder="Optional..."
                                    className="bg-bg2 border-bg5 text-txt text-sm"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleRecordResult(item.id)}
                                  disabled={!form.value || addResultMut.isPending}
                                  className="bg-accent hover:bg-accent/90 text-white text-xs"
                                >
                                  {addResultMut.isPending ? tTests("recording") : tTests("recordResult")}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setOpenResultId(null)} className="text-txt3">
                                  <X size={13} />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Day-by-day recovery picture from the athlete's watch, independent of any
 * session — resting HR, HRV, sleep and whatever else their device reports.
 *
 * Renders nothing when the athlete has no linked watch, so a roster of mixed
 * athletes doesn't show empty panels.
 */
function AthleteRecoverySection({ athleteProfileId }: { athleteProfileId: string }) {
  const t = useTranslations("vitals");
  const tMetric = useTranslations("vitals.metric");
  const [days, setDays] = useState(14);
  const { data = [] } = trpc.vitals.athleteDaily.useQuery(
    { athleteProfileId, days },
    { retry: false },
  );

  if (data.length === 0) return null;

  const today = data[0] as { date: string; metrics: Record<string, { value: number; unit: string }> };
  const todayKeys = Object.keys(today.metrics);

  // Baseline is the mean of the *earlier* days, so today isn't compared to
  // itself. Needs at least a couple of prior days to mean anything.
  const baselineFor = (metric: string): number | null => {
    const prior = data
      .slice(1)
      .map((d: { metrics: Record<string, { value: number }> }) => d.metrics[metric]?.value)
      .filter((v: number | undefined): v is number => typeof v === "number");
    if (prior.length < 2) return null;
    return prior.reduce((sum: number, v: number) => sum + v, 0) / prior.length;
  };

  const sorted = todayKeys.sort(
    (a, b) => metricMeta(a).group.localeCompare(metricMeta(b).group) || a.localeCompare(b),
  );

  return (
    <div className="bg-bg2 border border-bg5 rounded-2xl p-5 mb-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Moon size={16} className="text-indigo-500" />
          <p className="text-txt font-bold text-sm">{t("recoveryTitle")}</p>
        </div>
        <div className="flex items-center gap-1">
          {[7, 14, 30].map((option) => (
            <button
              key={option}
              onClick={() => setDays(option)}
              className={`text-[10px] font-semibold px-2 py-1 rounded-md transition-colors ${
                days === option ? "bg-bg4 text-txt" : "text-txt3 hover:text-txt2"
              }`}
            >
              {t("lastDays", { days: option })}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {sorted.map((metric) => {
          const reading = today.metrics[metric]!;
          const baseline = baselineFor(metric);
          const delta = baseline === null ? null : reading.value - baseline;
          // A percentage of baseline reads better than a raw delta across
          // metrics whose scales differ by orders of magnitude.
          const deltaPct =
            baseline === null || baseline === 0 ? null : ((delta ?? 0) / baseline) * 100;
          const { icon: Icon, color } = metricStyle(metric);

          return (
            <div key={metric} className="bg-bg3 border border-bg5 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={13} className={color} />
                <span className="text-txt3 text-[10px] truncate">
                  {metricLabel(tMetric, metric)}
                </span>
              </div>
              <p className="text-txt font-semibold text-sm tabular-nums">
                {formatMetricValue(metric, reading.value, reading.unit)}
              </p>
              {deltaPct !== null && Math.abs(deltaPct) >= 1 && (
                <p
                  className={`text-[10px] tabular-nums mt-0.5 ${
                    deltaPct > 0 ? "text-emerald-500" : "text-orange-500"
                  }`}
                >
                  {deltaPct > 0 ? "+" : ""}
                  {deltaPct.toFixed(0)}% {t("vsBaseline")}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Watch vitals for one past session: averages plus the HR zone breakdown.
 * Queried per expanded booking rather than eagerly with the athlete, so opening
 * a profile doesn't pull the summary for every session in their history.
 */
function SessionVitalsSection({ bookingId }: { bookingId: string }) {
  const t = useTranslations("vitals");
  const { data } = trpc.vitals.sessionVitals.useQuery({ bookingId }, { retry: false });

  const summary = data?.summary;
  const metricSummaries = data?.metricSummaries ?? [];
  if (!summary || summary.sampleCount === 0) return null;

  // Metrics already shown as headline tiles below; the rest go in the grid so
  // nothing the watch captured is hidden from the coach.
  const HEADLINE = new Set(["HEART_RATE", "SPO2", "HRV"]);
  const extras = metricSummaries.filter(
    (m: { metric: string }) => !HEADLINE.has(m.metric),
  );

  const zones: Array<{ zone: Zone; seconds: number }> = [
    { zone: 1, seconds: summary.zone1Sec },
    { zone: 2, seconds: summary.zone2Sec },
    { zone: 3, seconds: summary.zone3Sec },
    { zone: 4, seconds: summary.zone4Sec },
    { zone: 5, seconds: summary.zone5Sec },
  ];
  const totalZoneSec = zones.reduce((sum, z) => sum + z.seconds, 0);

  return (
    <div className="px-5 pt-4 pb-4 border-b border-bg5">
      <p className="text-txt3 text-[10px] tracking-widest font-bold mb-4">
        {t("sectionTitle").toUpperCase()}
      </p>

      <div className="flex flex-wrap gap-6">
        {summary.avgHeartRate != null && (
          <MetricTile
            icon={<HeartPulse size={18} className="text-red-500" />}
            label={t("avgHr")}
            value={`${summary.avgHeartRate} bpm`}
            bg="bg-red-500/10"
          />
        )}
        {summary.maxHeartRate != null && (
          <MetricTile
            icon={<TrendingUp size={18} className="text-orange-500" />}
            label={t("maxHr")}
            value={`${summary.maxHeartRate} bpm`}
            bg="bg-orange-500/10"
          />
        )}
        {summary.avgSpo2 != null && (
          <MetricTile
            icon={<Droplets size={18} className="text-sky-500" />}
            label={t("avgSpo2")}
            value={`${summary.avgSpo2}%`}
            bg="bg-sky-500/10"
          />
        )}
        {summary.avgHrvMs != null && (
          <MetricTile
            icon={<Waves size={18} className="text-purple-500" />}
            label={t("avgHrv")}
            value={`${summary.avgHrvMs} ms`}
            bg="bg-purple-500/10"
          />
        )}
      </div>

      {totalZoneSec > 0 && (
        <div className="mt-5">
          <p className="text-txt3 text-[10px] tracking-widest font-bold mb-2.5">
            {t("zones").toUpperCase()}
          </p>

          {/* Proportion of the session spent in each zone */}
          <div className="flex h-2.5 rounded-full overflow-hidden mb-3">
            {zones.map(({ zone, seconds }) =>
              seconds > 0 ? (
                <div key={zone} style={{ flex: seconds, backgroundColor: ZONE_COLORS[zone] }} />
              ) : null,
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            {zones
              .filter((z) => z.seconds > 0)
              .reverse()
              .map(({ zone, seconds }) => (
                <div key={zone} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: ZONE_COLORS[zone] }}
                  />
                  <span className="text-txt2 text-xs flex-1">{t("zone", { zone })}</span>
                  <span className="text-txt font-semibold text-xs tabular-nums">
                    {formatSeconds(seconds)}
                  </span>
                  <span className="text-txt3 text-[10px] w-9 text-end tabular-nums">
                    {Math.round((seconds / totalZoneSec) * 100)}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {extras.length > 0 && <SessionMetricGrid metrics={extras} />}
    </div>
  );
}

/**
 * Everything else the watch recorded during the session, one tile per metric.
 *
 * Driven entirely by what's in the data — a metric this build has never heard
 * of still lands here with a humanised label and a generic icon, rather than
 * being silently dropped for not matching a hardcoded list.
 */
function SessionMetricGrid({
  metrics,
}: {
  metrics: Array<{
    metric: string;
    unit: string;
    min: number;
    max: number;
    avg: number;
    sum: number;
    last: number;
    count: number;
  }>;
}) {
  const t = useTranslations("vitals");
  const tMetric = useTranslations("vitals.metric");

  const sorted = [...metrics].sort(
    (a, b) =>
      metricMeta(a.metric).group.localeCompare(metricMeta(b.metric).group) ||
      a.metric.localeCompare(b.metric),
  );

  return (
    <div className="mt-5">
      <p className="text-txt3 text-[10px] tracking-widest font-bold mb-2.5">
        {t("allMetrics").toUpperCase()}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {sorted.map((m) => {
          const spec = metricMeta(m.metric, m.unit);
          // Each metric collapses the way it makes sense to: a total for
          // counters, the latest reading for body measurements, a mean for
          // rates.
          const value = spec.agg === "sum" ? m.sum : spec.agg === "last" ? m.last : m.avg;
          const { icon: Icon, color } = metricStyle(m.metric);
          return (
            <div key={m.metric} className="bg-bg3 border border-bg5 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={13} className={color} />
                <span className="text-txt3 text-[10px] truncate">
                  {metricLabel(tMetric, m.metric)}
                </span>
              </div>
              <p className="text-txt font-semibold text-sm tabular-nums">
                {formatMetricValue(m.metric, value, m.unit)}
              </p>
              {/* Range is only meaningful for metrics we averaged. */}
              {spec.agg === "avg" && m.count > 1 && (
                <p className="text-txt3 text-[10px] tabular-nums mt-0.5">
                  {formatMetricValue(m.metric, m.min, m.unit)} –{" "}
                  {formatMetricValue(m.metric, m.max, m.unit)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent = "text-txt" }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-bg2 border border-bg5 rounded-2xl p-4">
      <p className="text-txt3 text-[10px] tracking-widest font-bold mb-1">{label.toUpperCase()}</p>
      <p className={`font-bold text-xl ${accent}`}>{value}</p>
    </div>
  );
}

function MetricTile({ icon, label, value, bg }: {
  icon: React.ReactNode; label: string; value: string; bg: string;
}) {
  return (
    <div className="flex-1 min-w-[120px]">
      <div className={`w-10 h-10 rounded-2xl ${bg} flex items-center justify-center mb-2`}>
        {icon}
      </div>
      <p className="text-txt3 text-[10px] tracking-widest uppercase mb-0.5">{label}</p>
      <p className="text-txt font-bold text-base">{value}</p>
    </div>
  );
}
