import type { SessionExercise } from "./api";

/** Continue the exercise being tracked, then move forward through the session. */
export function nextWorkoutSet(exercises: SessionExercise[], focusedId?: string) {
  const ordered = [...exercises].sort((a, b) => a.position - b.position);
  const focusedIndex = ordered.findIndex((exercise) => exercise.id === focusedId);
  const start = Math.max(0, focusedIndex);
  const queue = [...ordered.slice(start), ...ordered.slice(0, start)];
  const visitedGroups = new Set<string>();
  for (const exercise of queue) {
    if (exercise.superset_group) {
      if (visitedGroups.has(exercise.superset_group)) continue;
      visitedGroups.add(exercise.superset_group);
      const group = ordered.filter((e) => e.superset_group === exercise.superset_group);
      const candidates = group
        .flatMap((member) => {
          const sets = [...member.workout_logged_sets].sort((a, b) => a.position - b.position);
          const warmup = sets.findIndex((s) => s.set_type === "warmup" && !s.completed_at);
          if (warmup !== -1)
            return [{ exercise: member, set: sets[warmup], number: warmup + 1, round: -1 }];
          const working = sets.filter((s) => s.set_type !== "warmup");
          const index = working.findIndex((s) => !s.completed_at);
          return index === -1
            ? []
            : [
                {
                  exercise: member,
                  set: working[index],
                  number: sets.indexOf(working[index]) + 1,
                  round: index,
                },
              ];
        })
        .sort((a, b) => a.round - b.round || a.exercise.position - b.exercise.position);
      if (candidates.length) {
        const { round: _round, ...next } = candidates[0];
        return next;
      }
      continue;
    }
    const sets = [...exercise.workout_logged_sets].sort((a, b) => a.position - b.position);
    const index = sets.findIndex((set) => !set.completed_at);
    if (index !== -1) return { exercise, set: sets[index], number: index + 1 };
  }
  return null;
}

/** Rest starts after the last unfinished member in a superset round, not between paired sets. */
export function restAfterWorkoutSet(
  exercises: SessionExercise[],
  exerciseId: string,
  setId: string,
) {
  const exercise = exercises.find((e) => e.id === exerciseId);
  const sets = [...(exercise?.workout_logged_sets ?? [])].sort((a, b) => a.position - b.position);
  const set = sets.find((s) => s.id === setId);
  if (!exercise || !set) return 0;
  const rest = set.rest_seconds ?? exercise.rest_seconds;
  if (!exercise.superset_group || set.set_type === "warmup") return rest;
  const round = sets.filter((s) => s.set_type !== "warmup").findIndex((s) => s.id === setId);
  const pendingPartner = exercises
    .filter((e) => e.id !== exerciseId && e.superset_group === exercise.superset_group)
    .some((partner) => {
      const partnerSet = [...partner.workout_logged_sets]
        .sort((a, b) => a.position - b.position)
        .filter((s) => s.set_type !== "warmup")[round];
      return !!partnerSet && !partnerSet.completed_at;
    });
  return pendingPartner ? 0 : rest;
}

export function workoutTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainder = String(safe % 60).padStart(2, "0");
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${remainder}`
    : `${String(minutes).padStart(2, "0")}:${remainder}`;
}
