import React from "react";
import { useRouter } from "expo-router";
import { ExercisePicker } from "@/src/features/workouts/components/exercise-picker";
import { useWorkout } from "@/src/features/workouts/workout-context";

export default function AddWorkoutExercise() {
  const router = useRouter();
  const { session, addExercises, busy } = useWorkout();
  return <ExercisePicker existingIds={session?.workout_session_exercises.map(item => item.exercise_id) ?? []} disabled={busy} onClose={() => router.back()} onConfirm={async items => {
    await addExercises(items.map(item => item.id));
    router.back();
  }} />;
}
