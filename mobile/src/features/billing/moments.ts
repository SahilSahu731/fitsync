import { addDays, localDate, type ProgressWorkout } from "../progress/model";
import { completedSets, summary, workoutDate } from "../progress/analytics";
import {
  completedInsightWorkouts,
  suggestWorkingSetTargets,
  type WorkingSetSuggestion,
} from "../pro/companion-insights";
import { workoutRecords } from "../workouts/achievements";
import type { WorkoutSession } from "../workouts/api";
import type { CoachingDay, CoachingPlan } from "../coaching/api";
import { weightIncrementKg } from "../../lib/weight";

export type MomentSource = "personal_best" | "workout_three" | "weekly_review" | "missed_session";
export type TargetPreview = { exerciseId: string; name: string; target: WorkingSetSuggestion };
export type UpgradeMoment = {
  key: string;
  source: MomentSource;
  title: string;
  detail: string;
  action: string;
  targets?: TargetPreview[];
  insights?: { title: string; text: string }[];
  stats?: { workouts: number; sets: number; minutes: number };
  recovery?: { day: CoachingDay; date: string };
};
export function progressWorkout(workout: WorkoutSession): ProgressWorkout {
  return {
    ...workout,
    workout_session_exercises: workout.workout_session_exercises.map(
      ({ exercises: _snapshot, ...exercise }) => exercise,
    ),
  };
}
export function nextTargets(workouts: ProgressWorkout[], today: string, unit: "kg" | "lb" = "kg") {
  const rows = completedInsightWorkouts(workouts, today);
  const latest = rows.at(-1);
  if (!latest) return [];
  const unique = [
    ...new Map(latest.workout_session_exercises.map((e) => [e.exercise_id, e])).values(),
  ];
  return unique.flatMap((exercise): TargetPreview[] => {
    if (!["reps_weight", "reps"].includes(exercise.tracking_type)) return [];
    const suggestion = suggestWorkingSetTargets(
      rows,
      exercise.exercise_id,
      exercise.tracking_type,
      addDays(today, 1),
      weightIncrementKg(unit),
    );
    const target = suggestion.targets.find(
      (t) =>
        t.suggested.reps !== null &&
        (exercise.tracking_type === "reps" || t.suggested.weightKg !== null),
    );
    return target
      ? [{ exerciseId: exercise.exercise_id, name: exercise.exercise_name, target }]
      : [];
  });
}
export function workoutMoment(
  current: ProgressWorkout,
  history: ProgressWorkout[],
  today: string,
  unit: "kg" | "lb",
): UpgradeMoment | null {
  const rows = completedInsightWorkouts(
    [...history.filter((w) => w.id !== current.id), current],
    today,
  ).filter((w) => Date.parse(w.finished_at!) <= Date.parse(current.finished_at ?? ""));
  if (!rows.some((w) => w.id === current.id)) return null;
  const records = workoutRecords(current, history);
  const source = records.length ? "personal_best" : rows.length === 3 ? "workout_three" : null;
  const targets = nextTargets(rows, today, unit).sort(
    (a, b) =>
      Number(records.some((r) => r.exercise === b.name)) -
      Number(records.some((r) => r.exercise === a.name)),
  );
  if (!source || !targets.length) return null;
  return {
    key: `${source}:${current.id}`,
    source,
    title:
      source === "personal_best"
        ? "A best today. A clear target next time."
        : "Three workouts. Your next target is ready.",
    detail:
      source === "personal_best"
        ? "Keep the celebration. Here is one target built from the normal working sets you recorded."
        : "Here is what you have actually logged, plus one target to carry into your next session.",
    action: "See your next target with Pro",
    targets,
    stats: summary(rows),
  };
}
const distance = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400_000);
export function weeklyMoment(
  history: ProgressWorkout[],
  createdAt: string,
  today: string,
  unit: "kg" | "lb",
): UpgradeMoment | null {
  if (!Number.isFinite(Date.parse(createdAt))) return null;
  const start = localDate(new Date(createdAt));
  const age = distance(start, today);
  if (age < 7) return null;
  const week = Math.floor(age / 7) - 1;
  const from = addDays(start, week * 7),
    through = addDays(from, 6);
  const rows = completedInsightWorkouts(history, today).filter(
    (w) => workoutDate(w) >= from && workoutDate(w) <= through,
  );
  if (!rows.length) return null;
  const totals = summary(rows);
  const days = new Set(rows.map(workoutDate)).size;
  const frequencies = new Map<string, { name: string; count: number }>();
  for (const workout of rows)
    for (const exercise of new Map(completedSets(workout).map((s) => [s.exerciseId, s])).values()) {
      const old = frequencies.get(exercise.exerciseId);
      frequencies.set(exercise.exerciseId, {
        name: exercise.exerciseName,
        count: (old?.count ?? 0) + 1,
      });
    }
  const most = [...frequencies.values()].sort((a, b) => b.count - a.count)[0];
  const insights = [
    {
      title: "Your training rhythm",
      text: `You completed ${rows.length} workout${rows.length === 1 ? "" : "s"} across ${days} training day${days === 1 ? "" : "s"}, with ${totals.sets} working sets.`,
    },
    {
      title: "Time you put in",
      text: `${totals.minutes} logged minutes in this week, averaging ${Math.round(totals.minutes / rows.length)} minutes per workout.`,
    },
    ...(most
      ? [
          {
            title: "Your most-practised movement",
            text: `${most.name} appeared in ${most.count} completed workout${most.count === 1 ? "" : "s"}.`,
          },
        ]
      : []),
  ];
  return {
    key: `weekly_review:${from}`,
    source: "weekly_review",
    title: week === 0 ? "Your first weekly insight is ready." : "Your weekly review is ready.",
    detail: `${from} – ${through} · Built from your completed workouts.`,
    action: "Unlock my full weekly review",
    insights,
    targets: nextTargets(rows, today, unit),
  };
}
export function missedMoment(plan: CoachingPlan | null, now = new Date()): UpgradeMoment | null {
  if (!plan || plan.sessions.some((s) => s.status === "active")) return null;
  let today: string;
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: plan.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const part = (type: string) => parts.find((p) => p.type === type)?.value;
    today = `${part("year")}-${part("month")}-${part("day")}`;
  } catch {
    return null;
  }
  const day = [...plan.sessions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .find(
      (s) =>
        s.date < today &&
        s.date >= addDays(today, -7) &&
        ["planned", "overdue"].includes(s.status) &&
        !s.workoutId,
    );
  if (!day) return null;
  const occupied = new Set(plan.sessions.filter((s) => s.id !== day.id).map((s) => s.date));
  let date = addDays(today, 1);
  for (let n = 0; occupied.has(date) && n < 35; n++) date = addDays(date, 1);
  if (occupied.has(date)) return null;
  return {
    key: `missed_session:${day.id}:${day.date}`,
    source: "missed_session",
    title: "Life happened. Your plan can move.",
    detail: `${day.name} was planned for ${day.date}. Pro can move it to ${date} for you, after you confirm.`,
    action: "Move my session with Pro",
    recovery: { day, date },
  };
}
export type MomentHistory = { seen: string[]; shown: number[] };
export function parseMomentHistory(value: string | null): MomentHistory {
  try {
    const data = JSON.parse(value ?? "{}");
    return {
      seen: Array.isArray(data.seen)
        ? data.seen.filter((k: unknown) => typeof k === "string").slice(-100)
        : [],
      shown: Array.isArray(data.shown)
        ? data.shown.filter((n: unknown) => typeof n === "number" && Number.isFinite(n)).slice(-20)
        : [],
    };
  } catch {
    return { seen: [], shown: [] };
  }
}
export function canShowMoment(history: MomentHistory, key: string, now: number) {
  return (
    !history.seen.includes(key) &&
    !history.shown.some((at) => now - at < 48 * 3600_000) &&
    history.shown.filter((at) => now - at < 7 * 86400_000).length < 2
  );
}
export function firstEligibleMoment(
  history: MomentHistory,
  candidates: readonly UpgradeMoment[],
  now: number,
) {
  return candidates.find((moment) => canShowMoment(history, moment.key, now)) ?? null;
}

// A completion synced after midnight still deserves its moment. Never replay old history.
export function recentWorkoutMoments(
  history: ProgressWorkout[],
  today: string,
  unit: "kg" | "lb",
  now = Date.now(),
) {
  return completedInsightWorkouts(history, today)
    .filter((workout) => {
      const finished = Date.parse(workout.finished_at!);
      return finished <= now && now - finished <= 72 * 3600_000;
    })
    .reverse()
    .flatMap((workout) => {
      const moment = workoutMoment(workout, history, today, unit);
      return moment ? [moment] : [];
    });
}
