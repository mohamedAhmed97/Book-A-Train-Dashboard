import { z } from "zod";
import jwt from "jsonwebtoken";
import { db } from "../../lib/db";
import { TRPCError } from "@trpc/server";
import { router, coachProcedure } from "../init";
import { DEFAULT_MAX_HR, zoneForHeartRate } from "@/lib/vitals";

/**
 * Coach-facing watch vitals. Mirrors the same procedures in the API's
 * trpc/routers/vitals.ts — the dashboard client talks to the API at
 * NEXT_PUBLIC_API_URL, so this copy exists to give `trpc.vitals.*` its types.
 * Athlete-only procedures (ingest, connect, …) are intentionally absent.
 */

/** Metrics charted as a time series unless the caller asks for others. */
const DEFAULT_SERIES_METRICS = ["HEART_RATE", "SPO2", "RESPIRATORY_RATE"];

/** A watch quiet for longer than this is reported as stale, not current. */
const STALE_AFTER_MS = 3 * 60_000;

const metricKey = z
  .string()
  .min(2)
  .max(48)
  .regex(/^[A-Z0-9_]+$/);

async function requireCoach(userId: string) {
  const coach = await db.coachProfile.findUnique({ where: { userId } });
  if (!coach) throw new TRPCError({ code: "NOT_FOUND", message: "Coach profile not found" });
  return coach;
}

/**
 * Latest sample of every metric for many bookings in one round trip. Metric
 * keys are open, so there is no fixed list to fetch — see the API's
 * repos/vitals.repo.ts, which this mirrors.
 */
async function latestPerMetricForBookings(bookingIds: string[]) {
  if (bookingIds.length === 0) return [];
  return db.$queryRaw<
    Array<{ bookingId: string; metric: string; value: number; unit: string; recordedAt: Date }>
  >`
    SELECT DISTINCT ON ("bookingId", "metric")
      "bookingId", "metric", "value", "unit", "recordedAt"
    FROM "vitals_samples"
    WHERE "bookingId" = ANY(${bookingIds})
    ORDER BY "bookingId", "metric", "recordedAt" DESC
  `;
}

/** Collapse open per-metric daily rows into one entry per calendar day. */
function groupDailyByDate(
  rows: Array<{ date: Date; metric: string; value: number; unit: string }>,
) {
  const byDate = new Map<
    string,
    { date: Date; metrics: Record<string, { value: number; unit: string }> }
  >();
  for (const row of rows) {
    const key = row.date.toISOString().slice(0, 10);
    let day = byDate.get(key);
    if (!day) {
      day = { date: row.date, metrics: {} };
      byDate.set(key, day);
    }
    day.metrics[row.metric] = { value: row.value, unit: row.unit };
  }
  return [...byDate.values()];
}

export const vitalsRouter = router({
  sessionVitals: coachProcedure
    .input(
      z.object({
        bookingId: z.string(),
        seriesMetrics: z.array(metricKey).max(10).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const coach = await requireCoach(ctx.userId);
      const booking = await db.sessionBooking.findFirst({
        where: { id: input.bookingId, session: { coachId: coach.id } },
        include: {
          athlete: { include: { user: { select: { name: true } } } },
          session: { select: { title: true } },
        },
      });
      if (!booking)
        throw new TRPCError({ code: "FORBIDDEN", message: "Session is not on your roster" });

      const [summary, metricSummaries, samples, distinct] = await Promise.all([
        db.sessionVitalsSummary.findUnique({ where: { bookingId: input.bookingId } }),
        db.sessionMetricSummary.findMany({
          where: { bookingId: input.bookingId },
          orderBy: { metric: "asc" },
        }),
        db.vitalsSample.findMany({
          where: {
            bookingId: input.bookingId,
            metric: { in: input.seriesMetrics ?? DEFAULT_SERIES_METRICS },
          },
          orderBy: { recordedAt: "asc" },
        }),
        db.vitalsSample.findMany({
          where: { bookingId: input.bookingId },
          distinct: ["metric"],
          select: { metric: true },
        }),
      ]);

      return {
        athleteName: booking.athlete.user.name,
        sessionTitle: booking.session.title,
        maxHeartRate: booking.athlete.maxHeartRate ?? DEFAULT_MAX_HR,
        summary,
        /** Every metric this session captured, rolled up. */
        metricSummaries,
        /** Keys the coach can request a series for. */
        availableMetrics: distinct.map((d) => d.metric),
        samples: samples.map((s) => ({
          metric: s.metric,
          value: s.value,
          recordedAt: s.recordedAt,
        })),
      };
    }),

  liveBoard: coachProcedure.query(async ({ ctx }) => {
    const coach = await requireCoach(ctx.userId);

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 86_400_000);

    const bookings = await db.sessionBooking.findMany({
      where: {
        status: "CONFIRMED",
        session: { coachId: coach.id, scheduledAt: { gte: dayStart, lt: dayEnd } },
      },
      include: {
        athlete: { include: { user: { select: { name: true, avatar: true } } } },
        session: {
          select: { id: true, title: true, sport: true, scheduledAt: true, status: true },
        },
        workoutResult: { select: { completedAt: true } },
      },
      orderBy: { session: { scheduledAt: "asc" } },
    });

    const now = Date.now();

    const latestRows = await latestPerMetricForBookings(bookings.map((b) => b.id));
    const latestByBooking = new Map<string, typeof latestRows>();
    for (const row of latestRows) {
      const bucket = latestByBooking.get(row.bookingId);
      if (bucket) bucket.push(row);
      else latestByBooking.set(row.bookingId, [row]);
    }

    return bookings.map((booking) => {
      const latest = latestByBooking.get(booking.id) ?? [];
      const maxHr = booking.athlete.maxHeartRate ?? DEFAULT_MAX_HR;
      const hr = latest.find((s) => s.metric === "HEART_RATE");
      const lastAt = latest.reduce<Date | null>(
        (newest, s) => (!newest || s.recordedAt > newest ? s.recordedAt : newest),
        null,
      );
      return {
        bookingId: booking.id,
        athleteId: booking.athleteId,
        athleteName: booking.athlete.user.name,
        athleteAvatar: booking.athlete.user.avatar,
        sessionId: booking.session.id,
        sessionTitle: booking.session.title,
        sport: booking.session.sport,
        scheduledAt: booking.session.scheduledAt,
        completed: !!booking.workoutResult,
        maxHeartRate: maxHr,
        heartRate: hr?.value ?? null,
        zone: hr ? zoneForHeartRate(hr.value, maxHr) : null,
        lastSampleAt: lastAt,
        stale: !lastAt || now - lastAt.getTime() > STALE_AFTER_MS,
        // Every metric the watch is currently reporting, not a fixed five.
        metrics: latest.map((s) => ({
          metric: s.metric,
          value: s.value,
          unit: s.unit,
          recordedAt: s.recordedAt,
        })),
      };
    });
  }),

  athleteDaily: coachProcedure
    .input(
      z.object({
        athleteProfileId: z.string(),
        days: z.number().int().min(1).max(90).default(14),
      }),
    )
    .query(async ({ ctx, input }) => {
      const coach = await requireCoach(ctx.userId);
      const relation = await db.coachAthlete.findUnique({
        where: { coachId_athleteId: { coachId: coach.id, athleteId: input.athleteProfileId } },
      });
      if (!relation)
        throw new TRPCError({ code: "FORBIDDEN", message: "Athlete not in your roster" });
      const to = new Date();
      const from = new Date(to.getTime() - input.days * 86_400_000);
      const rows = await db.dailyVitalsMetric.findMany({
        where: { athleteId: input.athleteProfileId, date: { gte: from, lte: to } },
        orderBy: [{ date: "desc" }, { metric: "asc" }],
      });
      return groupDailyByDate(rows);
    }),

  liveStreamToken: coachProcedure
    .input(z.object({ bookingId: z.string() }))
    .query(async ({ ctx, input }) => {
      const coach = await requireCoach(ctx.userId);
      const booking = await db.sessionBooking.findFirst({
        where: { id: input.bookingId, session: { coachId: coach.id } },
        select: { id: true },
      });
      if (!booking)
        throw new TRPCError({ code: "FORBIDDEN", message: "Session is not on your roster" });
      return {
        token: jwt.sign(
          { userId: ctx.userId, bookingId: input.bookingId, kind: "vitals-stream" },
          process.env["JWT_SECRET"] ?? "dev-secret-change-in-production",
          { expiresIn: "10m" },
        ),
      };
    }),
});
