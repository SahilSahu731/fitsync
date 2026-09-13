import type {
  WorkoutSession,
  WorkoutTemplate,
} from "@/features/workouts/types";
export interface RoutineDifference {
  changed: boolean;
  addedExercises: number;
  removedExercises: number;
  reordered: boolean;
  setChanges: number;
  restChanges: number;
  supersetChanges: number;
}
export function compareWorkoutToTemplate(
  workout: WorkoutSession,
  template: WorkoutTemplate,
): RoutineDifference {
  const workoutIds = workout.exercises.map((item) => item.exercise_id);
  const templateIds = template.exercises.map((item) => item.exercise_id);
  const workoutSet = new Set(workoutIds),
    templateSet = new Set(templateIds);
  const addedExercises = workoutIds.filter((id) => !templateSet.has(id)).length;
  const removedExercises = templateIds.filter(
    (id) => !workoutSet.has(id),
  ).length;
  const reordered =
    JSON.stringify(workoutIds.filter((id) => templateSet.has(id))) !==
    JSON.stringify(templateIds.filter((id) => workoutSet.has(id)));
  let setChanges = 0,
    restChanges = 0,
    supersetChanges = 0;
  template.exercises.forEach((planned) => {
    const actual = workout.exercises.find(
      (item) => item.exercise_id === planned.exercise_id,
    );
    if (!actual) return;
    if (
      actual.sets.length !== planned.planned_sets.length ||
      JSON.stringify(actual.sets.map((set) => set.type)) !==
        JSON.stringify(planned.planned_sets.map((set) => set.type))
    )
      setChanges += 1;
    if (actual.rest_seconds !== planned.rest_seconds) restChanges += 1;
    if (actual.superset_group_id !== planned.superset_group_id)
      supersetChanges += 1;
  });
  const changed =
    addedExercises > 0 ||
    removedExercises > 0 ||
    reordered ||
    setChanges > 0 ||
    restChanges > 0 ||
    supersetChanges > 0;
  return {
    changed,
    addedExercises,
    removedExercises,
    reordered,
    setChanges,
    restChanges,
    supersetChanges,
  };
}
