import React, { useCallback } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { C } from "@/src/constants/theme";
import { Txt } from "@/src/components/ui";
import { workoutApi } from "@/src/features/workouts/api";
import { useProgramResource } from "./use-program-resource";

export function ExercisePreview({ templateId }: { templateId: string }) {
  const { data, loading, error, refresh } = useProgramResource(useCallback(() => workoutApi.template(templateId), [templateId]));
  if (!data) return <View className="py-4">{loading ? <ActivityIndicator color={C.brand} /> : <Pressable accessibilityRole="button" onPress={() => void refresh()}><Txt className="text-sm text-muted">{error || "Could not load exercises."}</Txt><Txt className="mt-2 text-sm text-brand">Retry preview</Txt></Pressable>}</View>;
  const exercises = [...data.workout_template_exercises].sort((a, b) => a.position - b.position);
  const totalSets = exercises.reduce((sum, item) => sum + (item.workout_template_sets?.length ?? 0), 0);
  return <View className="mt-3">
    <Txt className="mb-3 text-xs text-muted">{exercises.length} exercises · {totalSets} planned sets</Txt>
    {exercises.map((exercise, index) => {
      const sets = exercise.workout_template_sets ?? [];
      const reps = sets.map(set => set.target_reps).filter((value): value is number => value !== null);
      const duration = sets.map(set => set.target_duration_seconds).filter((value): value is number => value !== null);
      const target = duration.length ? `${Math.min(...duration)}${Math.min(...duration) !== Math.max(...duration) ? `–${Math.max(...duration)}` : ""} sec` : reps.length ? `${Math.min(...reps)}${Math.min(...reps) !== Math.max(...reps) ? `–${Math.max(...reps)}` : ""} reps` : "Set your targets as you go";
      const media = exercise.exercises?.exercise_media?.filter(item => item.kind === "image" && item.delivery_url).sort((a, b) => a.sort_order - b.sort_order)[0];
      return <View key={exercise.id} className="mb-3 flex-row items-center gap-3">
        <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-bg">
          {media?.delivery_url ? <Image source={{ uri: media.delivery_url }} contentFit="cover" style={{ width: 48, height: 48 }} /> : <MaterialCommunityIcons name="dumbbell" size={22} color={C.muted} />}
        </View>
        <View className="flex-1"><Txt weight="semibold" className="text-sm">{index + 1}. {exercise.exercises?.name ?? "Exercise"}</Txt><Txt className="mt-1 text-xs text-muted">{sets.length} sets · {target}{exercise.rest_seconds ? ` · ${exercise.rest_seconds}s rest` : ""}</Txt></View>
      </View>;
    })}
    {!exercises.length && <Txt className="text-sm text-muted">This routine has no exercises yet. You can add them in the workout.</Txt>}
  </View>;
}
