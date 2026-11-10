import { z } from "zod";

export const metricLimits = {
  steps: [0, 200000], caloriesIn: [0, 20000], caloriesActive: [0, 20000], weight: [25, 350],
  water: [0, 15000], sleep: [0, 24], protein: [0, 1000], carbs: [0, 2000], fat: [0, 1000],
  waist: [30, 250], bodyFat: [2, 75], restingHeartRate: [25, 250],
  distance: [0, 500], activeMinutes: [0, 1440], floors: [0, 2000],
  fiber: [0, 300], sugar: [0, 1000], sodium: [0, 30000], caffeine: [0, 3000],
  chest: [30, 250], hips: [30, 250], upperArm: [10, 100], thigh: [15, 150], calf: [10, 100], neck: [15, 100],
  sleepQuality: [1, 5], energy: [1, 5], mood: [1, 5], stress: [1, 5], soreness: [1, 5], hrv: [1, 500],
} as const;
const metrics = Object.keys(metricLimits) as [keyof typeof metricLimits, ...(keyof typeof metricLimits)[]];
export const goalsSchema = z.object({
  steps: z.number().int().min(1).max(100000).nullable(),
  caloriesIn: z.number().int().min(1).max(20000).nullable(),
  caloriesActive: z.number().int().min(1).max(20000).nullable(),
  weight: z.number().min(25).max(350).nullable(),
  water: z.number().int().min(1).max(15000).nullable(),
  sleep: z.number().min(1).max(24).nullable(),
  protein: z.number().positive().max(1000).nullable().default(null),
  carbs: z.number().positive().max(2000).nullable().default(null),
  fat: z.number().positive().max(1000).nullable().default(null),
  activeMinutes: z.number().positive().max(1440).nullable().default(null),
  weeklyWorkouts: z.number().int().min(1).max(14),
}).strict();
const base = { id: z.string().regex(/^[a-zA-Z0-9_-]{20,80}$/), observedAt: z.iso.datetime({ offset: true }) };
const metricEvent = z.object({
  ...base, kind: z.literal("metric"), metric: z.enum(metrics), date: z.iso.date(),
  value: z.number().finite().nullable(), source: z.enum(["manual", "pedometer", "healthkit", "healthconnect"]), notes: z.string().trim().max(500),
}).strict().superRefine((entry, ctx) => {
  const [min, max] = metricLimits[entry.metric];
  const integer = ["steps", "floors", "sleepQuality", "energy", "mood", "stress", "soreness"].includes(entry.metric);
  if (entry.value !== null && (entry.value < min || entry.value > max || integer && !Number.isInteger(entry.value))) ctx.addIssue({ code: "custom", path: ["value"], message: `Use ${min}–${max}${integer ? " whole" : ""} units.` });
  if (["healthkit", "healthconnect"].includes(entry.source) && !["steps", "sleep", "weight"].includes(entry.metric)) ctx.addIssue({ code: "custom", path: ["source"], message: "Health imports support steps, sleep and weight." });
  if (entry.source === "pedometer" && entry.metric !== "steps") ctx.addIssue({ code: "custom", path: ["source"], message: "Pedometer readings are only for steps." });
});
export const eventSchema = z.discriminatedUnion("kind", [metricEvent, z.object({ ...base, kind: z.literal("goals"), goals: goalsSchema }).strict()]);
export const batchSchema = z.object({ ownerId: z.uuid(), events: z.array(eventSchema).min(1).max(100) }).strict().refine(value => new Set(value.events.map(e => e.id)).size === value.events.length, "Each event ID must be unique.");
