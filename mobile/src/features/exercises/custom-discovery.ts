import type { Exercise, ExerciseFilters } from "./api";
import type { PickerExercise } from "./picker-cache";

export type ExerciseScope = "all" | "custom";

// The custom endpoint returns every owned exercise, including archived ones.
// Filter that complete collection before paginating so search never misses a
// match that happens to be beyond the first page.
export function filterCustomExercises(
  exercises: Exercise[],
  query = "",
  filters: Pick<ExerciseFilters, "category" | "muscle" | "equipment"> = {},
) {
  const tokens = query
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const seen = new Set<string>();
  return exercises
    .filter((exercise) => {
      if (exercise.status !== "published" || seen.has(exercise.id)) return false;
      seen.add(exercise.id);
      if (filters.category && exercise.category !== filters.category) return false;
      const muscles = [...exercise.primaryMuscles, ...exercise.secondaryMuscles];
      if (filters.muscle && !muscles.includes(filters.muscle)) return false;
      if (filters.equipment && !exercise.equipment.includes(filters.equipment)) return false;
      return tokens.every(
        (token) =>
          exercise.name.toLowerCase().includes(token) ||
          muscles.includes(token) ||
          exercise.equipment.includes(token),
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

export function pickerExercise(exercise: Exercise): PickerExercise {
  return {
    id: exercise.id,
    name: exercise.name,
    trackingType: exercise.trackingType,
    regionLabel: exercise.regionLabel,
    equipment: exercise.equipment,
    primaryMuscles: exercise.primaryMuscles,
    secondaryMuscles: exercise.secondaryMuscles,
    imageUrl: exercise.media.find((media) => media.kind === "image")?.url ?? null,
    isCustom: !!exercise.isCustom,
  };
}

export function customPickerExercise(exercise: Exercise): PickerExercise {
  return { ...pickerExercise(exercise), isCustom: true };
}
