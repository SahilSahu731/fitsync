
import React from "react";
import { useLocalSearchParams } from "expo-router";

import {
  AdminExerciseForm
} from "@/src/components/exercises/admin-exercise-form";

export default function EditExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <AdminExerciseForm exerciseId={id} />;
}
