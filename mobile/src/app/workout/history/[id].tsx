import React, { useEffect, useMemo, useState } from "react";

import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";

import { MaterialCommunityIcons } from "@expo/vector-icons";

import { C } from "@/src/constants/theme";
import { Txt } from "@/src/components/ui";

import { workoutApi, type WorkoutSession } from "@/src/features/workouts/api";

export default function WorkoutHistoryDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [session, setSession] = useState<WorkoutSession | null>(null);

  useEffect(() => {
    if (!id) return;

    void workoutApi.session(id).then(setSession).catch(console.warn);
  }, [id]);

  const stats = useMemo(() => {
    const sets =
      session?.workout_session_exercises
        .flatMap((item) => item.workout_logged_sets)
        .filter((set) => Boolean(set.completed_at)) ?? [];

    const volume = sets.reduce(
      (total, set) => total + (set.weight_kg ?? 0) * (set.reps ?? 0),
      0,
    );

    return {
      sets: sets.length,
      volume,
    };
  }, [session]);

  if (!session) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color={C.brand} />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ padding: 22, paddingBottom: 80 }}
    >
      <Pressable onPress={() => router.back()} className="mb-8">
        <MaterialCommunityIcons name="arrow-left" size={26} color={C.ink} />
      </Pressable>

      <Txt weight="semibold" className="text-xs text-brand">
        WORKOUT COMPLETE
      </Txt>

      <Txt weight="extra" className="mt-2 text-[35px]">
        {session.name}
      </Txt>

      <Txt className="mt-2 text-muted">
        {new Date(session.started_at).toLocaleString()}
      </Txt>

      <View className="my-7 flex-row gap-3">
        {[
          {
            label: "DURATION",
            value: `${Math.floor((session.elapsed_seconds ?? 0) / 60)}m`,
          },
          {
            label: "SETS",
            value: String(stats.sets),
          },
          {
            label: "VOLUME",
            value: `${Math.round(stats.volume)} kg`,
          },
        ].map((item) => (
          <View key={item.label} className="flex-1 rounded-2xl bg-panel p-4">
            <Txt className="text-[10px] text-muted">{item.label}</Txt>

            <Txt weight="extra" className="mt-2 text-xl">
              {item.value}
            </Txt>
          </View>
        ))}
      </View>

      {session.workout_session_exercises
        .sort((a, b) => a.position - b.position)
        .map((exercise) => (
          <View
            key={exercise.id}
            className="mb-4 rounded-2xl border border-border bg-panel p-5"
          >
            <Txt weight="bold" className="mb-4 text-lg">
              {exercise.exercise_name}
            </Txt>

            {exercise.workout_logged_sets
              .filter((set) => set.completed_at)
              .sort((a, b) => a.position - b.position)
              .map((set, index) => (
                <View
                  key={set.id}
                  className="flex-row justify-between border-b border-border py-3"
                >
                  <Txt className="text-sm text-muted">
                    {index + 1}. {set.set_type.toUpperCase()}
                  </Txt>

                  <Txt weight="semibold">
                    {set.weight_kg ?? "—"} kg × {set.reps ?? "—"}
                  </Txt>
                </View>
              ))}
          </View>
        ))}
    </ScrollView>
  );
}
