import { z } from "zod";

export const setTypeSchema = z.enum([
    "warmup",
    "normal",
    "heavy",
    "failure",
    "drop",
    "rest_pause"
]);

export const uuidSchema = z.uuid();
export const tempoSchema = z.string().regex(/^([0-9]|X)-([0-9]|X)-([0-9]|X)-([0-9]|X)$/,
    "Use four tempo parts such as 3-1-1-0; each part is 0–9 or X.");
export const supersetGroupSchema = z.string().regex(/^[A-Za-z0-9_-]{1,24}$/);

export const workoutSetSchema = z.object({
    setType: setTypeSchema.default("normal"),
    targetReps: z.number().int().min(1).max(1000).nullable().optional(),
    targetWeight: z.number().min(0).max(100000).nullable().optional(),
    targetDurationSeconds: z.number().int().min(0).nullable().optional(),
    restSeconds: z.number().int().min(0).max(900).nullable().optional(),
    tempo: tempoSchema.nullable().optional()
});

export const templateExerciseSchema = z.object({
    exerciseId: uuidSchema,
    notes: z.string().max(1000).default(""),
    restSeconds: z.number().int().min(0).max(900).default(90),
    supersetGroup: supersetGroupSchema.nullable().optional(),
    sets: z.array(workoutSetSchema).min(1).max(30)
});

export const createTemplateSchema = z.object({
    name: z.string().trim().min(1).max(100),
    description: z.string().max(2000).default(""),
    exercises: z.array(templateExerciseSchema).min(1).max(50)
});
export const editTemplateSchema = createTemplateSchema.extend({ expectedRevision: z.number().int().nonnegative().max(2147483646) }).strict();

export const updateSetSchema = z.object({
    setType: setTypeSchema.optional(),
    weightKg: z.number().min(0).max(100000).nullable().optional(),
    reps: z.number().int().min(0).max(1000).nullable().optional(),
    durationSeconds: z.number().int().min(0).nullable().optional(),
    distanceMeters: z.number().min(0).nullable().optional(),
    rpe: z.number().min(1).max(10).nullable().optional(),
    rir: z.number().int().min(0).max(10).nullable().optional(),
    completed: z.boolean().optional(),
    notes: z.string().max(1000).optional(),
    restSeconds: z.number().int().min(0).max(900).nullable().optional(),
    tempo: tempoSchema.nullable().optional()
}).strict();

export const updateSessionExerciseSchema = z.object({
    restSeconds: z.number().int().min(0).max(900).optional(),
    supersetGroup: supersetGroupSchema.nullable().optional()
}).strict().refine(input => Object.keys(input).length > 0, "Choose an exercise setting to update.");

export const addSessionExerciseSchema = z.object({
    exerciseId: uuidSchema,
    restSeconds: z.number().int().min(0).max(900).default(90)
});

export const addSessionExercisesSchema = z.object({
    exerciseIds: z.array(uuidSchema).min(1).max(50)
        .refine(ids => new Set(ids).size === ids.length, "Select each exercise only once."),
    restSeconds: z.number().int().min(0).max(900).default(90)
});

export const addSessionSetSchema = z.object({
    setType: setTypeSchema.default("normal"),
    weightKg: z.number().min(0).nullable().default(null),
    reps: z.number().int().min(0).nullable().default(null)
});

export const finishWorkoutSchema = z.object({
    notes: z.string().max(2000).default(""),
    elapsedSeconds: z.number().int().min(0).optional()
});

export type CreateTemplateInput =
    z.infer<typeof createTemplateSchema>;
export type EditTemplateInput = z.infer<typeof editTemplateSchema>;
