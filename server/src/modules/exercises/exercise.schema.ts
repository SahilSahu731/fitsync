
import { z } from "zod";

const code = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(80);

const lines = z.array(
  z.string().trim().min(2).max(500)
).max(30);

export const exerciseInputSchema = z.object({
  slug: code.max(120),

  name: z.string().trim().min(2).max(120),

  description: z.string()
    .trim()
    .max(2000)
    .default(""),

  category: code,
  activityType: code,
  bodyRegion: code,

  difficulty: z.enum([
    "beginner",
    "intermediate",
    "advanced"
  ]),

  trackingType: z.enum([
    "reps_weight",
    "reps",
    "duration",
    "distance_duration"
  ]),

  movementPattern: z.enum([
    "push",
    "pull",
    "squat",
    "hinge",
    "lunge",
    "carry",
    "rotation",
    "locomotion",
    "mobility",
    "stillness",
    "other"
  ]),

  primaryMuscles: z.array(code).max(20).default([]),
  secondaryMuscles: z.array(code).max(20).default([]),
  equipment: z.array(code).max(20).default([]),

  instructions: lines.min(1),
  tips: lines.default([]),
  mistakes: lines.default([]),
  safetyNotes: lines.default([]),

  breathingTip: z.string()
    .trim()
    .max(500)
    .default(""),

  status: z.enum([
    "draft",
    "published",
    "archived"
  ]).default("draft")
}).superRefine((value, ctx) => {
  const primary = new Set(value.primaryMuscles);
  const secondary = new Set(value.secondaryMuscles);
  const equipment = new Set(value.equipment);

  if (
    primary.size !== value.primaryMuscles.length ||
    secondary.size !== value.secondaryMuscles.length ||
    equipment.size !== value.equipment.length
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Duplicate taxonomy values are not allowed."
    });
  }

  if (
    value.secondaryMuscles.some(muscle =>
      primary.has(muscle)
    )
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["secondaryMuscles"],
      message: "A muscle cannot be both primary and secondary."
    });
  }
});

export const exercisePatchSchema = z.object(
  exerciseInputSchema.shape
).partial();

export const exerciseListSchema = z.object({
  q: z.string().trim().max(100).optional(),

  category: code.optional(),
  activityType: code.optional(),
  bodyRegion: code.optional(),
  muscle: code.optional(),
  equipment: code.optional(),

  difficulty: z.enum([
    "beginner",
    "intermediate",
    "advanced"
  ]).optional(),

  status: z.enum(["draft", "published", "archived"]).optional(),

  includeDrafts: z.enum(["true", "false"]).optional(),

  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20)
});

export const mediaMetadataSchema = z.object({
  altText: z.string().trim().max(200).default(""),

  credit: z.string().trim().max(200).default(""),

  license: z.string().trim().min(3).max(150),

  sourceUrl: z.string()
    .trim()
    .max(1000)
    .refine(
      value => !value || /^https?:\/\//i.test(value),
      "Source URL must start with http:// or https://"
    )
    .default("")
});

export type ExerciseInput =
  z.infer<typeof exerciseInputSchema>;

export type ExerciseListInput =
  z.infer<typeof exerciseListSchema>;

export type MediaMetadata =
  z.infer<typeof mediaMetadataSchema>;
