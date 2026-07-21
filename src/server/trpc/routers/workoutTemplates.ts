import { z } from "zod";
import { db } from "../../lib/db";
import { TRPCError } from "@trpc/server";
import { router, coachProcedure } from "../init";

type TemplateSeed = {
  name: string;
  sets?: number;
  reps?: number;
  durationSeconds?: number;
  restSeconds?: number;
  notes?: string;
};

const SPORT_DEFAULTS: Record<string, TemplateSeed[]> = {
  CrossFit: [],
  Swimming: [],
  Running: [],
  Cycling: [],
  Football: [],
  Basketball: [],
  Tennis: [],
  General: [],
};

const templateShape = z.object({
  name: z.string().min(1),
  sport: z.string().optional(),
  sets: z.number().int().positive().optional(),
  reps: z.number().int().positive().optional(),
  durationSeconds: z.number().int().positive().optional(),
  restSeconds: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
});

export const workoutTemplatesRouter = router({
  list: coachProcedure
    .input(z.object({ sport: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const coach = await db.coachProfile.findUnique({ where: { userId: ctx.userId } });
      if (!coach) throw new TRPCError({ code: "NOT_FOUND", message: "Coach profile not found" });
      const where: { coachId: string; sport?: string } = { coachId: coach.id };
      if (input?.sport) where.sport = input.sport;
      return db.workoutTemplate.findMany({ where, orderBy: { createdAt: "asc" } });
    }),

  create: coachProcedure
    .input(templateShape)
    .mutation(async ({ ctx, input }) => {
      const coach = await db.coachProfile.findUnique({ where: { userId: ctx.userId } });
      if (!coach) throw new TRPCError({ code: "NOT_FOUND", message: "Coach profile not found" });
      return db.workoutTemplate.create({ data: { coachId: coach.id, ...input } });
    }),

  update: coachProcedure
    .input(templateShape.partial().extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const coach = await db.coachProfile.findUnique({ where: { userId: ctx.userId } });
      if (!coach) throw new TRPCError({ code: "NOT_FOUND", message: "Coach profile not found" });
      const { id, ...data } = input;
      return db.workoutTemplate.update({ where: { id }, data });
    }),

  delete: coachProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const coach = await db.coachProfile.findUnique({ where: { userId: ctx.userId } });
      if (!coach) throw new TRPCError({ code: "NOT_FOUND", message: "Coach profile not found" });
      await db.workoutTemplate.delete({ where: { id: input.id } });
      return { success: true };
    }),

  seedDefaults: coachProcedure
    .input(z.object({ sport: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const coach = await db.coachProfile.findUnique({ where: { userId: ctx.userId } });
      if (!coach) throw new TRPCError({ code: "NOT_FOUND", message: "Coach profile not found" });
      const sportKey = Object.keys(SPORT_DEFAULTS).find(
        (k) => input.sport.toLowerCase().includes(k.toLowerCase()),
      ) ?? "General";
      return { created: 0, sport: sportKey };
    }),

  availableSports: coachProcedure.query(() => Object.keys(SPORT_DEFAULTS)),
});
