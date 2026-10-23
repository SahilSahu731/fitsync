export function searchKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Token matching allows e.g. "dumbbell incline" without depending on name order.
export function matchesExercise(
  exercise: { name: string; equipment: string[]; primaryMuscles: string[]; secondaryMuscles: string[] },
  query: string
) {
  const tokens = searchKey(query).split(/\s+/).filter(Boolean);
  const text = searchKey([exercise.name, ...exercise.equipment, ...exercise.primaryMuscles, ...exercise.secondaryMuscles].join(" "));
  return tokens.every(token => text.includes(token));
}
