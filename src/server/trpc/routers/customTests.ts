import { z } from "zod";
import { db } from "../../lib/db";
import { TRPCError } from "@trpc/server";
import { router, coachProcedure } from "../init";

const movementSchema = z.object({
  name: z.string().min(1),
  sets: z.number().int().positive().optional(),
  reps: z.number().int().positive().optional(),
  distanceMeters: z.number().positive().optional(),
  durationSeconds: z.number().int().positive().optional(),
  notes: z.string().optional(),
  order: z.number().int().default(0),
});

const MOVEMENTS_INCLUDE = { movements: { orderBy: { order: "asc" as const } } } as const;
const MOVEMENT_RESULT_INCLUDE = { movements: { orderBy: { order: "asc" as const } } } as const;

export const customTestsRouter = router({
  list: coachProcedure.query(async ({ ctx }) => {
    const coach = await db.coachProfile.findUnique({ where: { userId: ctx.userId } });
    if (!coach) throw new TRPCError({ code: "NOT_FOUND", message: "Coach profile not found" });
    return db.customTest.findMany({
      where: { coachId: coach.id },
      include: MOVEMENTS_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  }),

  create: coachProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      sport: z.string().optional(),
      unit: z.string().min(1),
      movements: z.array(movementSchema).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const coach = await db.coachProfile.findUnique({ where: { userId: ctx.userId } });
      if (!coach) throw new TRPCError({ code: "NOT_FOUND", message: "Coach profile not found" });
      const { movements, ...rest } = input;
      return db.customTest.create({
        data: { ...rest, coachId: coach.id, movements: { create: movements } },
        include: MOVEMENTS_INCLUDE,
      });
    }),

  assign: coachProcedure
    .input(z.object({
      customTestId: z.string(),
      athleteProfileId: z.string(),
      scheduledAt: z.coerce.date().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const coach = await db.coachProfile.findUnique({ where: { userId: ctx.userId } });
      if (!coach) throw new TRPCError({ code: "NOT_FOUND", message: "Coach profile not found" });
      const customTest = await db.customTest.findFirst({ where: { id: input.customTestId, coachId: coach.id } });
      if (!customTest) throw new TRPCError({ code: "NOT_FOUND", message: "Custom test not found" });
      const assignment = await db.customTestAssignment.create({
        data: {
          customTestId: input.customTestId,
          athleteId: input.athleteProfileId,
          coachId: coach.id,
          scheduledAt: input.scheduledAt,
          notes: input.notes,
        },
        include: {
          customTest: { include: MOVEMENTS_INCLUDE },
          athlete: { include: { user: { select: { id: true, name: true } } } },
        },
      });
      await db.notification.create({
        data: {
          userId: assignment.athlete.userId,
          type: "TEST_ASSIGNED",
          title: "New Custom Test Assigned",
          body: `Your coach assigned you a ${customTest.name} test`,
          data: { customTestAssignmentId: assignment.id },
        },
      });
      return assignment;
    }),

  addResult: coachProcedure
    .input(z.object({
      assignmentId: z.string(),
      value: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const coach = await db.coachProfile.findUnique({ where: { userId: ctx.userId } });
      if (!coach) throw new TRPCError({ code: "NOT_FOUND", message: "Coach profile not found" });
      const assignment = await db.customTestAssignment.findFirst({
        where: { id: input.assignmentId, coachId: coach.id },
        include: {
          customTest: true,
          result: true,
          athlete: { include: { user: { select: { id: true, name: true } } } },
        },
      });
      if (!assignment) throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found" });
      if (assignment.result) throw new TRPCError({ code: "CONFLICT", message: "Result already recorded" });
      const [result] = await Promise.all([
        db.customTestResult.create({
          data: { assignmentId: input.assignmentId, value: input.value, unit: assignment.customTest.unit, notes: input.notes },
        }),
        db.customTestAssignment.update({ where: { id: input.assignmentId }, data: { status: "COMPLETED" } }),
        db.notification.create({
          data: {
            userId: assignment.athlete.userId,
            type: "TEST_RESULT_ADDED",
            title: "Test Result Recorded",
            body: `Your ${assignment.customTest.name} result: ${input.value} ${assignment.customTest.unit}`,
            data: { customTestAssignmentId: assignment.id },
          },
        }),
      ]);
      return result;
    }),

  athleteAssignments: coachProcedure
    .input(z.object({ athleteProfileId: z.string() }))
    .query(async ({ ctx, input }) => {
      const coach = await db.coachProfile.findUnique({ where: { userId: ctx.userId } });
      if (!coach) throw new TRPCError({ code: "NOT_FOUND", message: "Coach profile not found" });
      return db.customTestAssignment.findMany({
        where: { athleteId: input.athleteProfileId, coachId: coach.id },
        include: { customTest: { include: MOVEMENT_RESULT_INCLUDE }, result: true, movementResults: true },
        orderBy: { createdAt: "desc" },
      });
    }),

  setMovementResult: coachProcedure
    .input(z.object({
      assignmentId: z.string(),
      movementId: z.string(),
      value: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const coach = await db.coachProfile.findUnique({ where: { userId: ctx.userId } });
      if (!coach) throw new TRPCError({ code: "NOT_FOUND", message: "Coach profile not found" });
      const assignment = await db.customTestAssignment.findFirst({
        where: { id: input.assignmentId, coachId: coach.id },
      });
      if (!assignment) throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found" });

      await db.customTestMovementResult.upsert({
        where: { assignmentId_movementId: { assignmentId: input.assignmentId, movementId: input.movementId } },
        create: { assignmentId: input.assignmentId, movementId: input.movementId, value: input.value, notes: input.notes },
        update: { value: input.value, notes: input.notes },
      });

      const updated = await db.customTestAssignment.findUnique({
        where: { id: input.assignmentId },
        include: {
          customTest: { include: MOVEMENT_RESULT_INCLUDE },
          result: true,
          movementResults: true,
          athlete: { include: { user: { select: { id: true, name: true } } } },
        },
      });
      if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const movementsWithTargets = updated.customTest.movements.filter(
        (m: any) => m.durationSeconds != null || m.reps != null || m.distanceMeters != null || m.sets != null,
      );
      const allDone = movementsWithTargets.length > 0 &&
        movementsWithTargets.every((m: any) => updated.movementResults.some((r: any) => r.movementId === m.id));

      if (allDone && !updated.result) {
        const percentages = movementsWithTargets
          .map((m: any) => {
            const r = updated.movementResults.find((r: any) => r.movementId === m.id);
            if (!r) return null;
            if (m.durationSeconds != null && m.durationSeconds > 0 && r.value > 0)
              return (m.durationSeconds / r.value) * 100;
            const target = (m.reps != null && m.sets != null) ? m.reps * m.sets : (m.reps ?? m.distanceMeters ?? m.sets);
            return (target != null && target > 0) ? (r.value / target) * 100 : null;
          })
          .filter((p: any): p is number => p !== null && !isNaN(p) && isFinite(p));

        if (percentages.length === 0) return updated.movementResults;

        const overallPct = Math.round(percentages.reduce((a: number, b: number) => a + b, 0) / percentages.length * 10) / 10;

        await Promise.all([
          db.customTestResult.create({
            data: { assignmentId: input.assignmentId, value: overallPct, unit: "%" },
          }),
          db.customTestAssignment.update({ where: { id: input.assignmentId }, data: { status: "COMPLETED" } }),
          db.notification.create({
            data: {
              userId: updated.athlete.userId,
              type: "TEST_RESULT_ADDED",
              title: "Test Completed! 🎉",
              body: `Your ${updated.customTest.name} score: ${overallPct}%`,
              data: { customTestAssignmentId: input.assignmentId },
            },
          }),
        ]);
      }

      return updated.movementResults;
    }),

  updateAssignment: coachProcedure
    .input(z.object({
      assignmentId: z.string(),
      scheduledAt: z.coerce.date().nullable().optional(),
      notes: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const coach = await db.coachProfile.findUnique({ where: { userId: ctx.userId } });
      if (!coach) throw new TRPCError({ code: "NOT_FOUND", message: "Coach profile not found" });
      const assignment = await db.customTestAssignment.findFirst({ where: { id: input.assignmentId, coachId: coach.id } });
      if (!assignment) throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found" });
      return db.customTestAssignment.update({
        where: { id: input.assignmentId },
        data: { scheduledAt: input.scheduledAt, notes: input.notes },
      });
    }),

  deleteAssignment: coachProcedure
    .input(z.object({ assignmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const coach = await db.coachProfile.findUnique({ where: { userId: ctx.userId } });
      if (!coach) throw new TRPCError({ code: "NOT_FOUND", message: "Coach profile not found" });
      const assignment = await db.customTestAssignment.findFirst({ where: { id: input.assignmentId, coachId: coach.id } });
      if (!assignment) throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found" });
      return db.customTestAssignment.delete({ where: { id: input.assignmentId } });
    }),
});
