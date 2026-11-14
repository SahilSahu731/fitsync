import { z } from "zod";
import { metricLimits } from "../progress/progress.schema.js";

export const recordIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);
export const timezoneSchema = z
  .string()
  .max(100)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value }).format();
      return true;
    } catch {
      return false;
    }
  }, "Choose a valid timezone.");
const date = z.iso.date();
const shortText = z.string().trim().min(1).max(120);
const muscle = z.string().regex(/^[a-z][a-z0-9-]{0,39}$/);
const metric = z.enum(
  Object.keys(metricLimits) as [keyof typeof metricLimits, ...(keyof typeof metricLimits)[]],
);
const readiness = z
  .object({
    sleepHours: z.number().min(0).max(24).optional(),
    energy: z.number().int().min(1).max(5).optional(),
    soreness: z
      .array(z.object({ muscle, level: z.number().int().min(0).max(5) }).strict())
      .max(30)
      .optional(),
    availableMinutes: z.number().int().min(5).max(240).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Add at least one check-in value.")
  .refine(
    (value) =>
      new Set(value.soreness?.map((item) => item.muscle)).size === (value.soreness?.length ?? 0),
    "Choose each muscle once.",
  );
const goal = z
  .object({
    type: z.enum(["strength", "consistency", "measurement"]),
    title: shortText,
    target: z.number().finite().positive().max(1000000),
    unit: z.string().trim().min(1).max(24),
    exerciseId: z.uuid().optional(),
    metric: metric.optional(),
    deadline: date.optional(),
    baseline: z.number().finite().min(0).max(1000000).optional(),
    completedAt: z.iso.datetime({ offset: true }).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.type === "strength" && !value.exerciseId)
      ctx.addIssue({
        code: "custom",
        path: ["exerciseId"],
        message: "Choose the exercise for this strength goal.",
      });
    if (value.type === "measurement" && !value.metric)
      ctx.addIssue({
        code: "custom",
        path: ["metric"],
        message: "Choose the measurement for this goal.",
      });
    if (value.type === "consistency" && !Number.isInteger(value.target))
      ctx.addIssue({ code: "custom", path: ["target"], message: "Use a whole workout count." });
  });
const clock = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const reminders = z
  .object({
    enabled: z.boolean(),
    time: clock,
    days: z.array(z.number().int().min(1).max(7)).min(1).max(7),
    quietStart: clock,
    quietEnd: clock,
    snoozeMinutes: z.number().int().min(5).max(180),
    timezone: timezoneSchema,
  })
  .strict()
  .refine((value) => new Set(value.days).size === value.days.length, "Choose each day once.");
const experiment = z
  .object({
    title: shortText,
    hypothesis: z.string().trim().min(1).max(500),
    startDate: date,
    endDate: date,
    compareStartDate: date.optional(),
    compareEndDate: date.optional(),
    metric: z.enum(["sessions", "volume", "strength", "measurement"]),
    exerciseId: z.uuid().optional(),
    measurement: metric.optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.endDate < value.startDate)
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End the experiment after it starts.",
      });
    if (
      Boolean(value.compareStartDate) !== Boolean(value.compareEndDate) ||
      (value.compareStartDate && value.compareEndDate! < value.compareStartDate)
    )
      ctx.addIssue({
        code: "custom",
        path: ["compareEndDate"],
        message: "Choose both comparison dates in order.",
      });
    if (value.compareEndDate && value.compareEndDate >= value.startDate)
      ctx.addIssue({
        code: "custom",
        path: ["compareEndDate"],
        message: "The comparison block must finish before the experiment starts.",
      });
    if (value.metric === "measurement" && !value.measurement)
      ctx.addIssue({
        code: "custom",
        path: ["measurement"],
        message: "Choose the measurement to compare.",
      });
  });
const specialisation = z
  .object({
    muscle,
    startsOn: date,
    weeks: z.union([z.literal(4), z.literal(8)]),
    additionalSetsPerWeek: z.number().int().min(0).max(6),
    notes: z.string().trim().max(1000).optional(),
  })
  .strict();
const base = { expectedRevision: z.number().int().min(0).max(2147483646) };
export const saveRecordSchema = z.discriminatedUnion("kind", [
  z.object({ ...base, kind: z.literal("readiness"), date, data: readiness }).strict(),
  z.object({ ...base, kind: z.literal("goal"), date: date.optional(), data: goal }).strict(),
  z.object({ ...base, kind: z.literal("reminders"), data: reminders }).strict(),
  z
    .object({ ...base, kind: z.literal("experiment"), date: date.optional(), data: experiment })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal("specialisation"),
      date: date.optional(),
      data: specialisation,
    })
    .strict(),
]);
export type SaveRecord = z.infer<typeof saveRecordSchema>;
export const photoSchema = z
  .object({
    date,
    view: z.enum(["front", "side", "back"]),
    caption: z.string().trim().max(300).default(""),
  })
  .strict();
export const cropSchema = z
  .object({
    left: z.number().int().nonnegative(),
    top: z.number().int().nonnegative(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })
  .strict();
export const shareSchema = z
  .object({
    label: shortText,
    fields: z
      .array(z.enum(["workouts", "plan"]))
      .min(1)
      .max(2),
    expiresInDays: z.number().int().min(1).max(30),
  })
  .strict()
  .refine((value) => new Set(value.fields).size === value.fields.length, "Choose each field once.");
export const shareTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const reportSchema = z
  .object({
    month: z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/),
    timezone: timezoneSchema.default("UTC"),
  })
  .strict();
