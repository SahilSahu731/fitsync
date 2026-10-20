
import { z } from "zod";

export const onboardingSchema = z.object({
  goal: z.enum(["muscle", "strength", "fat_loss", "fitness"]),

  experience: z.enum([
    "beginner",
    "intermediate",
    "advanced"
  ]),

  gender: z.enum([
    "male",
    "female",
    "prefer_not_to_say"
  ]),

  heightCm: z.number().min(100).max(250),
  weightKg: z.number().min(25).max(350),

  bodyType: z.enum([
    "slim",
    "medium",
    "broad"
  ]).nullable().optional(),

  trainingDays: z.number().int().min(1).max(7),

  minutesPerWorkout: z.union([
    z.literal(30),
    z.literal(45),
    z.literal(60)
  ]),

  equipment: z.enum([
    "gym",
    "dumbbells",
    "bodyweight"
  ])
}).strict();

export const editFitnessSchema = onboardingSchema
  .partial()
  .refine(value => Object.keys(value).length > 0);

export const editUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  bio: z.string().trim().max(250).optional()
}).strict().refine(value => Object.keys(value).length > 0);

export const settingsSchema = z.object({
  weightUnit: z.enum(["kg", "lb"]).optional(),

  restSeconds: z.union([
    z.literal(30),
    z.literal(60),
    z.literal(90),
    z.literal(120),
    z.literal(180)
  ]).optional(),

  workoutReminders: z.boolean().optional()
}).strict().refine(value => Object.keys(value).length > 0);
