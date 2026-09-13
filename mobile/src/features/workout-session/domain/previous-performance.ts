import type { PreviousSet, WorkoutSet } from "@/features/workouts/types";

export function matchPreviousSet(
  currentSets: WorkoutSet[],

  previousSets: PreviousSet[],

  currentIndex: number,
): PreviousSet | undefined {
  if (previousSets.length === 0) {
    return undefined;
  }

  const current = currentSets[currentIndex];

  if (!current) {
    return undefined;
  }

  /*
   * Prefer the same occurrence of the same
   * set type.
   *
   * Example:
   *
   * W, W, NORMAL, NORMAL
   *
   * should compare warmups to warmups instead
   * of blindly comparing array indexes.
   */
  const sameTypeCurrentBefore = currentSets
    .slice(0, currentIndex + 1)
    .filter((set) => set.type === current.type).length;

  const sameTypePrevious = previousSets.filter(
    (set) => set.type === current.type,
  );

  const matching = sameTypePrevious[sameTypeCurrentBefore - 1];

  if (matching) {
    return matching;
  }

  /*
   * Fall back to the same numeric position.
   */
  if (previousSets[currentIndex]) {
    return previousSets[currentIndex];
  }

  /*
   * Extra current set:
   * show the final historical set.
   */
  return previousSets[previousSets.length - 1];
}

export function copyPreviousMetrics(
  current: WorkoutSet,

  previous: PreviousSet,
): WorkoutSet {
  return {
    ...current,

    weight: previous.weight,

    weight_unit: previous.weight_unit,

    reps: previous.reps,

    duration_seconds: previous.duration_seconds,

    distance_meters: previous.distance_meters,

    rpe: previous.rpe,
  };
}
