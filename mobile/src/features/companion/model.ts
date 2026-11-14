import type { CoachingPlan } from "../coaching/api";
import {
  addDays,
  latestMetrics,
  orderedEvents,
  type ProgressEvent,
  type ProgressWorkout,
} from "../progress/model";
import { workoutDate } from "../progress/analytics";
import type { CompanionRecord, Milestone, Readiness } from "./api";

export function effectiveReadiness(
  record: CompanionRecord<"readiness"> | undefined,
  events: ProgressEvent[],
  today: string,
): Readiness {
  const metrics = orderedEvents(events).filter(
    (event) => event.kind === "metric" && event.date === today,
  );
  const sleep = metrics.findLast((event) => event.kind === "metric" && event.metric === "sleep");
  const energy = metrics.findLast((event) => event.kind === "metric" && event.metric === "energy");
  return {
    ...(record?.date === today ? record.data : {}),
    ...(sleep?.kind === "metric" ? { sleepHours: sleep.value ?? undefined } : {}),
    ...(energy?.kind === "metric" ? { energy: energy.value ?? undefined } : {}),
  };
}
export function todayBriefing(
  plan: CoachingPlan | null,
  workouts: ProgressWorkout[],
  today: string,
  readiness: Readiness,
) {
  const sessions = plan?.sessions ?? [];
  const day =
    sessions.find((item) => item.status === "active") ??
    sessions.find((item) => item.date === today && item.status !== "completed");
  const next = [...sessions]
    .filter((item) => item.date > today && item.status === "planned")
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const completedToday = workouts.filter(
    (w) => w.status === "completed" && w.finished_at && workoutDate(w) === today,
  );
  const previous = day
    ? [
        ...new Map(
          workouts
            .filter((w) => w.status === "completed" && w.finished_at && workoutDate(w) <= today)
            .map((w) => [w.id, w]),
        ).values(),
      ]
        .filter((w) =>
          w.workout_session_exercises.some(
            (exercise) =>
              day.prescription.exercises.some(
                (planned) =>
                  planned.exerciseId === exercise.exercise_id &&
                  planned.trackingType === exercise.tracking_type,
              ) &&
              exercise.workout_logged_sets.some(
                (set) => set.completed_at && set.set_type !== "warmup",
              ),
          ),
        )
        .sort((a, b) => b.finished_at!.localeCompare(a.finished_at!))[0]
    : null;
  const reasons: string[] = [];
  if (readiness.energy != null && readiness.energy <= 2)
    reasons.push(`You reported energy ${readiness.energy}/5.`);
  if (readiness.soreness?.some((item) => item.level >= 4))
    reasons.push("You reported high soreness in at least one muscle group.");
  const shorter =
    !!day &&
    readiness.availableMinutes != null &&
    readiness.availableMinutes < day.prescription.minutes;
  if (shorter)
    reasons.push(
      `You have ${readiness.availableMinutes} minutes; the saved session allows ${day!.prescription.minutes}.`,
    );
  return {
    day: day ?? null,
    next: next ?? null,
    previous: previous ?? null,
    completedToday,
    restDay: !!plan && !day && !completedToday.length,
    reasons,
    suggestion:
      day && (shorter || reasons.length)
        ? {
            ...(shorter
              ? { minutes: Math.max(15, Math.min(90, readiness.availableMinutes!)) }
              : {}),
            ...(reasons.some((reason) => !reason.startsWith("You have"))
              ? { effort: "easy" as const }
              : {}),
          }
        : null,
  };
}
export function milestoneProgress(
  goal: Milestone,
  workouts: ProgressWorkout[],
  events: ProgressEvent[],
  today: string,
) {
  const done = [
    ...new Map(
      workouts
        .filter((w) => w.status === "completed" && w.finished_at && workoutDate(w) <= today)
        .map((w) => [w.id, w]),
    ).values(),
  ];
  let current: number | null = null;
  let evidence = "No matching data yet.";
  if (goal.type === "strength" && goal.exerciseId) {
    const values = done.flatMap((w) =>
      w.workout_session_exercises
        .filter((e) => e.exercise_id === goal.exerciseId && e.tracking_type === "reps_weight")
        .flatMap((e) =>
          e.workout_logged_sets
            .filter(
              (s) =>
                s.completed_at &&
                s.set_type !== "warmup" &&
                s.reps != null &&
                s.reps > 0 &&
                s.weight_kg != null,
            )
            .map((s) => s.weight_kg!),
        ),
    );
    if (values.length) {
      current = Math.max(...values);
      evidence = "Highest completed working-set load; stored in kg.";
    }
  } else if (goal.type === "consistency") {
    const start = addDays(today, -6);
    current = done.filter((w) => workoutDate(w) >= start).length;
    evidence = `Completed sessions from ${start} to ${today} (rolling seven days).`;
  } else if (goal.type === "measurement" && goal.metric) {
    const metric = latestMetrics(events)
      .filter((e) => e.metric === goal.metric && e.date <= today)
      .at(-1);
    if (metric?.value != null) {
      current = metric.value;
      evidence = `Latest ${goal.metric} reading: ${metric.date}.`;
    }
  }
  const baseline = goal.baseline;
  const down = baseline != null && goal.target < baseline;
  const achieved = current != null && (down ? current <= goal.target : current >= goal.target);
  const percent =
    current == null
      ? null
      : baseline != null && baseline !== goal.target
        ? Math.max(0, Math.min(100, ((current - baseline) / (goal.target - baseline)) * 100))
        : Math.max(0, Math.min(100, (current / goal.target) * 100));
  return {
    current,
    achieved,
    percent,
    evidence,
    overdue: !!goal.deadline && goal.deadline < today && !achieved,
  };
}
