import { z } from "zod";

export const equipmentSchema = z.enum(["gym", "dumbbells", "bodyweight"]);
export const timezoneSchema = z.string().max(100).refine(value => {
  try { new Intl.DateTimeFormat("en", { timeZone: value }).format(); return true; } catch { return false; }
}, "Choose a valid timezone.");
const request = { requestId: z.uuid() };
export const planPreferencesSchema = z.object({ goal: z.enum(["muscle", "strength", "fat_loss", "fitness"]), experience: z.enum(["beginner", "intermediate", "advanced"]), trainingDays: z.number().int().min(1).max(7), minutesPerWorkout: z.union([z.literal(30), z.literal(45), z.literal(60)]), equipment: equipmentSchema }).strict();
export const previewPlanSchema = z.object({ startDate: z.iso.date(), timezone: timezoneSchema, preferences: planPreferencesSchema }).strict();
export const createPlanSchema = z.object({ ...request, startDate: z.iso.date(), timezone: timezoneSchema, replacePlanId: z.uuid().optional(), preferences: planPreferencesSchema.optional() }).strict();
export const adaptSchema = z.object({
  ...request, expectedRevision: z.number().int().nonnegative(), minutes: z.number().int().min(15).max(90).optional(),
  equipment: equipmentSchema.optional(), effort: z.enum(["normal", "easy"]).optional(), swapExerciseId: z.uuid().optional(), preview: z.boolean().optional(),
}).strict().refine(v => v.minutes !== undefined || v.equipment !== undefined || v.effort !== undefined || v.swapExerciseId !== undefined, "Choose a change to your session.");
export const progressionSchema = z.object({ ...request, expectedRevision: z.number().int().nonnegative(), incrementKg: z.number().finite().min(0.25).max(10).optional(), preview: z.boolean().optional() }).strict();
export const rescheduleSchema = z.object({ ...request, expectedRevision: z.number().int().nonnegative(), date: z.iso.date() }).strict();
export const startSchema = z.object(request).strict();
export const focusSchema = z.object({ ...request, planId: z.uuid(), expectedRevisions: z.array(z.object({ id: z.uuid(), revision: z.number().int().nonnegative() }).strict()).max(100), muscle: z.string().regex(/^[a-z][a-z0-9-]{0,39}$/), startsOn: z.iso.date(), weeks: z.union([z.literal(4), z.literal(8)]), additionalSetsPerWeek: z.number().int().min(1).max(2), preview: z.boolean().optional() }).strict().refine(v => new Set(v.expectedRevisions.map(d => d.id)).size === v.expectedRevisions.length, "Include each session only once.");
export type AdaptInput = z.infer<typeof adaptSchema>;
