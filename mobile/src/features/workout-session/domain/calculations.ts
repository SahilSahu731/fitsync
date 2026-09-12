export {
  formatVolume,
  reorderExercises,
  workoutVolume,
} from "@/features/workouts/utils";

export function formatWorkoutClock(seconds: number): string {
  const hours = Math.floor(seconds / 3600);

  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}
