import { z } from "zod";
import { db } from "../../lib/db";
import { TRPCError } from "@trpc/server";
import { router, coachProcedure } from "../init";

export const testsRouter = router({
  catalog: coachProcedure.query(async ({ ctx }) => {
    const coach = await db.coachProfile.findUnique({ where: { userId: ctx.userId } });
    if (!coach) throw new TRPCError({ code: "NOT_FOUND", message: "Coach profile not found" });
    return db.test.findMany({
      where: { OR: [{ isGlobal: true }, { coachId: coach.id }] },
      orderBy: [{ isGlobal: "desc" }, { name: "asc" }],
    });
  }),

  createTest: coachProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      sport: z.string().optional(),
      unit: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const coach = await db.coachProfile.findUnique({ where: { userId: ctx.userId } });
      if (!coach) throw new TRPCError({ code: "NOT_FOUND", message: "Coach profile not found" });
      return db.test.create({ data: { ...input, coachId: coach.id } });
    }),

  assign: coachProcedure
    .input(z.object({
      testId: z.string(),
      athleteProfileId: z.string(),
      scheduledAt: z.coerce.date().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const coach = await db.coachProfile.findUnique({ where: { userId: ctx.userId } });
      if (!coach) throw new TRPCError({ code: "NOT_FOUND", message: "Coach profile not found" });
      const test = await db.test.findUnique({ where: { id: input.testId } });
      if (!test) throw new TRPCError({ code: "NOT_FOUND", message: "Test not found" });
      const athleteTest = await db.athleteTest.create({
        data: {
          testId: input.testId,
          athleteId: input.athleteProfileId,
          coachId: coach.id,
          scheduledAt: input.scheduledAt,
          notes: input.notes,
        },
        include: {
          athlete: { include: { user: { select: { id: true, name: true } } } },
        },
      });
      await db.notification.create({
        data: {
          userId: athleteTest.athlete.userId,
          type: "TEST_ASSIGNED",
          title: "New Test Assigned",
          body: `Your coach assigned you a ${test.name}`,
          data: { athleteTestId: athleteTest.id },
        },
      });
      return athleteTest;
    }),

  addResult: coachProcedure
    .input(z.object({
      athleteTestId: z.string(),
      value: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const coach = await db.coachProfile.findUnique({ where: { userId: ctx.userId } });
      if (!coach) throw new TRPCError({ code: "NOT_FOUND", message: "Coach profile not found" });
      const athleteTest = await db.athleteTest.findFirst({
        where: { id: input.athleteTestId, coachId: coach.id },
        include: {
          test: true,
          result: true,
          athlete: { include: { user: { select: { id: true, name: true } } } },
        },
      });
      if (!athleteTest) throw new TRPCError({ code: "NOT_FOUND", message: "Test assignment not found" });
      if (athleteTest.result) throw new TRPCError({ code: "CONFLICT", message: "Result already recorded" });
      const [result] = await Promise.all([
        db.testResult.create({
          data: { athleteTestId: input.athleteTestId, value: input.value, unit: athleteTest.test.unit, notes: input.notes },
        }),
        db.athleteTest.update({ where: { id: input.athleteTestId }, data: { status: "COMPLETED" } }),
        db.notification.create({
          data: {
            userId: athleteTest.athlete.userId,
            type: "TEST_RESULT_ADDED",
            title: "Test Result Recorded",
            body: `Your ${athleteTest.test.name} result: ${input.value} ${athleteTest.test.unit}`,
            data: { athleteTestId: athleteTest.id },
          },
        }),
      ]);
      return result;
    }),

  athleteTests: coachProcedure
    .input(z.object({ athleteProfileId: z.string() }))
    .query(async ({ ctx, input }) => {
      const coach = await db.coachProfile.findUnique({ where: { userId: ctx.userId } });
      if (!coach) throw new TRPCError({ code: "NOT_FOUND", message: "Coach profile not found" });
      return db.athleteTest.findMany({
        where: { athleteId: input.athleteProfileId, coachId: coach.id },
        include: { test: true, result: true },
        orderBy: { createdAt: "desc" },
      });
    }),

  updateAssignment: coachProcedure
    .input(z.object({
      athleteTestId: z.string(),
      scheduledAt: z.coerce.date().nullable().optional(),
      notes: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const coach = await db.coachProfile.findUnique({ where: { userId: ctx.userId } });
      if (!coach) throw new TRPCError({ code: "NOT_FOUND", message: "Coach profile not found" });
      const assignment = await db.athleteTest.findFirst({ where: { id: input.athleteTestId, coachId: coach.id } });
      if (!assignment) throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found" });
      return db.athleteTest.update({
        where: { id: input.athleteTestId },
        data: { scheduledAt: input.scheduledAt, notes: input.notes },
      });
    }),

  deleteAssignment: coachProcedure
    .input(z.object({ athleteTestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const coach = await db.coachProfile.findUnique({ where: { userId: ctx.userId } });
      if (!coach) throw new TRPCError({ code: "NOT_FOUND", message: "Coach profile not found" });
      const assignment = await db.athleteTest.findFirst({ where: { id: input.athleteTestId, coachId: coach.id } });
      if (!assignment) throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found" });
      return db.athleteTest.delete({ where: { id: input.athleteTestId } });
    }),
});
