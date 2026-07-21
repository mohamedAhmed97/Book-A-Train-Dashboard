"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft, Activity, Clock, Flame, Gauge, Waves, CheckCircle2, Circle,
  ChevronDown, ChevronUp, Timer, MapPin, FileText, CalendarDays, Dumbbell,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

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
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label={t("totalSessions")} value={String(athlete.bookings.length)} />
        <StatCard label={t("sessionsAttended")} value={String(pastBookings.length)} accent="text-accent" />
        <StatCard label={t("exercisesDone")} value={String(totalExercisesDone)} accent="text-primary" />
        <StatCard label={t("workoutsRecorded")} value={String(workoutsRecorded)} accent="text-amber" />
      </div>

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
