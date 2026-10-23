import { z } from "zod";
const text = z.string().trim().min(1).max(120);
const image = z.string().trim().max(1000).refine(v => !v || /^https?:\/\//i.test(v), "Use an http or https image URL.").nullable().default(null);
const base = {
  name: text,
  slug: z.string().max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(2000).default(""),
};
const training = {
  ...base,
  level: z.enum(["beginner", "intermediate", "advanced"]),
  goal: z.enum(["muscle", "strength", "fat_loss", "endurance", "general"]),
  equipment: z.enum(["gym", "dumbbells", "bodyweight", "bands", "mixed"]),
  author: text.default("FitSync"),
  published: z.boolean().default(false),
};
export const categorySchema = z.object({ ...base, image_url: image, position: z.number().int().min(0).max(10000) });
export const routineSchema = z.object({ ...training, category_id: z.uuid().nullable(), image_url: image, estimated_minutes: z.number().int().min(1).max(600) });
export const programSchema = z.object({ ...training, cover_url: image, tagline: z.string().trim().max(200).default(""), duration_weeks: z.number().int().min(1).max(52), featured_rank: z.number().int().min(1).max(1000).nullable() });
export const prescriptionSchema = z.object({
  exercise_id: z.uuid(), position: z.number().int().min(0).max(1000),
  sets: z.number().int().min(1).max(20), min_reps: z.number().int().min(1).max(10000), max_reps: z.number().int().min(1).max(10000),
  rest_seconds: z.number().int().min(0).max(3600),
  set_type: z.enum(["normal", "warmup", "heavy", "drop", "failure"]).default("normal"),
  notes: z.string().trim().max(2000).default(""),
}).refine(v => v.max_reps >= v.min_reps, { message: "Maximum reps must be at least minimum reps.", path: ["max_reps"] });
export const daySchema = z.object({ day_number: z.number().int().min(1).max(7), routine_id: z.uuid().nullable(), label: text });
