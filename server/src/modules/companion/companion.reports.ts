import { db } from "../../config/supabase.js";
import { checked, loadWorkouts } from "./companion.service.js";
import { metricLimits } from "../progress/progress.schema.js";

const metricUnits: Record<keyof typeof metricLimits, string> = {
  steps: "steps",
  caloriesIn: "kcal",
  caloriesActive: "kcal",
  weight: "kg",
  water: "ml",
  sleep: "h",
  protein: "g",
  carbs: "g",
  fat: "g",
  waist: "cm",
  bodyFat: "%",
  restingHeartRate: "bpm",
  distance: "km",
  activeMinutes: "min",
  floors: "floors",
  fiber: "g",
  sugar: "g",
  sodium: "mg",
  caffeine: "mg",
  chest: "cm",
  hips: "cm",
  upperArm: "cm",
  thigh: "cm",
  calf: "cm",
  neck: "cm",
  sleepQuality: "/5",
  energy: "/5",
  mood: "/5",
  stress: "/5",
  soreness: "/5",
  hrv: "ms",
};

const finite = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value)
    ? value
    : typeof value === "string" && value.trim() && Number.isFinite(Number(value))
      ? Number(value)
      : 0;
export function reportBounds(month: string) {
  const start = `${month}-01`;
  const d = new Date(`${start}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return {
    start,
    next: d.toISOString().slice(0, 10),
    from: new Date(Date.parse(`${start}T00:00:00Z`) - 86400000).toISOString(),
    until: new Date(d.setUTCHours(0, 0, 0, 0) + 86400000).toISOString(),
  };
}
export function buildMonthlyReport(
  month: string,
  timezone: string,
  workouts: any[],
  events: any[],
  now = new Date(),
) {
  const { start, next } = reportBounds(month);
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const selected = [...new Map(workouts.map((workout) => [workout.id, workout])).values()]
    .filter((workout) => {
      if (
        workout.status !== "completed" ||
        !workout.finished_at ||
        Date.parse(workout.finished_at) > now.getTime()
      )
        return false;
      const day = date.format(new Date(workout.finished_at));
      return day >= start && day < next;
    })
    .sort((a, b) => a.finished_at.localeCompare(b.finished_at) || a.id.localeCompare(b.id));
  let workingSets = 0,
    warmupSets = 0,
    volumeKg = 0,
    reps = 0;
  const effort: number[] = [];
  const days = new Set<string>();
  const exerciseMap = new Map<
    string,
    {
      exerciseId: string;
      name: string;
      trackingType: string;
      sessions: Set<string>;
      workingSets: number;
      bestWeightKg: number | null;
      bestReps: number | null;
    }
  >();
  for (const workout of selected) {
    days.add(date.format(new Date(workout.finished_at)));
    for (const exercise of workout.workout_session_exercises ?? []) {
      const key = `${exercise.exercise_id}:${exercise.tracking_type}`;
      for (const set of exercise.workout_logged_sets ?? []) {
        if (!set.completed_at || Date.parse(set.completed_at) > now.getTime()) continue;
        if (set.set_type === "warmup") {
          warmupSets++;
          continue;
        }
        workingSets++;
        reps += finite(set.reps);
        if (set.rpe != null && finite(set.rpe) >= 1 && finite(set.rpe) <= 10)
          effort.push(finite(set.rpe));
        if (exercise.tracking_type === "reps_weight")
          volumeKg += finite(set.weight_kg) * finite(set.reps);
        const entry = exerciseMap.get(key) ?? {
          exerciseId: exercise.exercise_id,
          name: exercise.exercise_name,
          trackingType: exercise.tracking_type,
          sessions: new Set<string>(),
          workingSets: 0,
          bestWeightKg: null,
          bestReps: null,
        };
        entry.sessions.add(workout.id);
        entry.workingSets++;
        if (set.weight_kg != null)
          entry.bestWeightKg = Math.max(entry.bestWeightKg ?? 0, finite(set.weight_kg));
        if (set.reps != null) entry.bestReps = Math.max(entry.bestReps ?? 0, finite(set.reps));
        exerciseMap.set(key, entry);
      }
    }
  }
  const latest = new Map<string, any>();
  for (const event of [...events].sort(
    (a, b) => Date.parse(a.observed_at) - Date.parse(b.observed_at) || a.id.localeCompare(b.id),
  )) {
    const value = event.payload;
    if (
      value?.kind === "metric" &&
      value.metric in metricLimits &&
      value.date >= start &&
      value.date < next
    )
      latest.set(`${value.date}:${value.metric}`, value);
  }
  const measurements = [...latest.values()]
    .filter((value) => value.value !== null && Number.isFinite(value.value))
    .map(({ metric, date: day, value, source }) => ({
      metric,
      date: day,
      value,
      source,
      unit: metricUnits[metric as keyof typeof metricLimits],
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.metric.localeCompare(b.metric));
  const summary = {
    workouts: selected.length,
    trainingDays: days.size,
    minutes: Math.round(
      selected.reduce((sum, workout) => sum + Math.max(0, finite(workout.elapsed_seconds)), 0) / 60,
    ),
    workingSets,
    warmupSets,
    volumeKg: Math.round(volumeKg * 100) / 100,
    reps,
    averageRpe: effort.length
      ? Math.round((effort.reduce((sum, value) => sum + value, 0) / effort.length) * 10) / 10
      : null,
    effortRecordedSets: effort.length,
  };
  const exercises = [...exerciseMap.values()]
    .map((entry) => ({ ...entry, sessions: entry.sessions.size }))
    .sort((a, b) => b.workingSets - a.workingSets || a.name.localeCompare(b.name));
  const sessions = selected.map((workout) => ({
    id: workout.id,
    date: date.format(new Date(workout.finished_at)),
    name: workout.name,
    minutes: Math.round(Math.max(0, finite(workout.elapsed_seconds)) / 60),
  }));
  const text = [
    `FitSync monthly report · ${month}`,
    `Timezone: ${timezone}`,
    `Generated: ${now.toISOString()}`,
    "",
    `${summary.workouts} completed workouts across ${summary.trainingDays} training days`,
    `${summary.minutes} logged minutes · ${workingSets} working sets · ${warmupSets} warm-up sets`,
    `${summary.volumeKg} kg external-load volume · ${reps} logged repetitions`,
    summary.averageRpe === null
      ? "Effort: no RPE recorded."
      : `Average recorded RPE: ${summary.averageRpe} (${effort.length} sets)`,
    "",
    "WORKOUTS",
    ...sessions.map((workout) => `${workout.date} · ${workout.name} · ${workout.minutes} min`),
    "",
    "EXERCISES",
    ...exercises.map(
      (exercise) =>
        `${exercise.name} (${exercise.trackingType}) · ${exercise.sessions} sessions · ${exercise.workingSets} working sets${exercise.bestWeightKg === null ? "" : ` · highest logged load ${exercise.bestWeightKg} kg`}${exercise.bestReps === null ? "" : ` · highest logged reps ${exercise.bestReps}`}`,
    ),
    "",
    "MEASUREMENTS",
    ...measurements.map(
      (entry) =>
        `${entry.date} · ${entry.metric.replace(/([a-z])([A-Z])/g, "$1 $2")}: ${entry.value} ${entry.unit} (${entry.source})`,
    ),
    "",
    "Volume includes completed, non-warm-up reps_weight sets only. Highest loads and repetitions are monthly observations, not verified all-time personal records. Missing effort and measurements are not inferred. Deleted/corrected measurements use the latest journal event. Photos and readiness notes are not included.",
  ].join("\n");
  return {
    month,
    timezone,
    generatedAt: now.toISOString(),
    summary,
    workouts: sessions,
    exercises,
    measurements,
    text,
  };
}
export async function monthlyReport(userId: string, month: string, timezone: string) {
  const bounds = reportBounds(month);
  const events: any[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = await db
      .from("progress_events")
      .select("id,observed_at,payload")
      .eq("user_id", userId)
      .eq("payload->>kind", "metric")
      .gte("payload->>date", bounds.start)
      .lt("payload->>date", bounds.next)
      .order("id")
      .range(offset, offset + 499);
    checked(page.error);
    events.push(...(page.data ?? []));
    if ((page.data?.length ?? 0) < 500) break;
  }
  const workouts = await loadWorkouts(userId, bounds.from, bounds.until);
  return buildMonthlyReport(month, timezone, workouts, events);
}
