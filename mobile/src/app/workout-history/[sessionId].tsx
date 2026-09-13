import { Ionicons } from "@expo/vector-icons";

import { router, useLocalSearchParams } from "expo-router";

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { useResolvedWorkout } from "@/features/workout-session/hooks/use-resolved-workout";

import { formatWorkoutSetMetrics } from "@/features/workouts/set-display";

import { formatDuration } from "@/features/workouts/utils";

export default function WorkoutHistoryDetailScreen() {
  const params = useLocalSearchParams<{
    sessionId?: string;
  }>();

  const workoutKey =
    typeof params.sessionId === "string" ? params.sessionId : "";

  const resolved = useResolvedWorkout(workoutKey);

  if (resolved.isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#3B82F6" />
      </SafeAreaView>
    );
  }

  const workout = resolved.workout;

  if (!workout) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <Text className="text-white/50">Workout not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-5 pt-3">
        <Pressable
          onPress={router.back}
          className="h-11 w-11 items-center justify-center rounded-full bg-white/[0.05]"
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </Pressable>

        <View className="ml-4 flex-1">
          <Text className="text-[12px] font-bold uppercase tracking-[1.4px] text-brand-bright">
            Completed workout
          </Text>

          <Text className="mt-1 text-[20px] font-extrabold text-white">
            {workout.name}
          </Text>

          {resolved.syncStatus && resolved.syncStatus !== "SYNCED" ? (
            <Text className="mt-1 text-[10px] font-semibold text-white/30">
              {resolved.syncStatus === "SYNCING"
                ? "Syncing…"
                : "Saved on device"}
            </Text>
          ) : null}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 20,

          paddingBottom: 80,
        }}
      >
        <View className="flex-row rounded-[22px] border border-white/10 bg-white/[0.03] p-5">
          <Stat
            label="Duration"
            value={formatDuration(workout.duration_seconds ?? 0)}
          />

          <Stat label="Exercises" value={String(workout.exercises.length)} />

          <Stat label="Sets" value={String(workout.completed_set_count)} />
        </View>

        <View className="mt-7 gap-4">
          {workout.exercises.map((exercise) => {
            const completed = exercise.sets.filter(
              (workoutSet) => workoutSet.completed,
            );

            return (
              <View
                key={exercise.id}
                className="rounded-[24px] border border-white/10 bg-white/[0.025] p-4"
              >
                <Text className="text-[16px] font-extrabold text-white">
                  {exercise.exercise_name}
                </Text>

                <Text className="mt-1 text-[11px] text-white/30">
                  {completed.length} completed sets
                </Text>

                <View className="mt-3">
                  {completed.map((workoutSet, index) => (
                    <View
                      key={workoutSet.id}
                      className="mt-2 flex-row items-center rounded-xl bg-white/[0.025] px-3 py-3"
                    >
                      <Text className="w-10 text-[11px] font-bold text-white/35">
                        {workoutSet.type === "WARMUP" ? "W" : index + 1}
                      </Text>

                      <Text className="flex-1 text-[13px] font-semibold text-white/70">
                        {formatWorkoutSetMetrics(
                          exercise.tracking_type,
                          workoutSet,
                        )}
                      </Text>

                      {workoutSet.rpe ? (
                        <Text className="text-[11px] font-semibold text-brand-bright">
                          RPE {workoutSet.rpe}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>

                {exercise.notes ? (
                  <Text className="mt-4 text-[12px] leading-5 text-white/35">
                    {exercise.notes}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>

        {workout.notes ? (
          <View className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
            <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-white/25">
              Notes
            </Text>

            <Text className="mt-3 text-[13px] leading-5 text-white/50">
              {workout.notes}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <View className="flex-1">
      <Text className="text-[10px] font-bold uppercase tracking-[1px] text-white/25">
        {label}
      </Text>

      <Text className="mt-2 text-[16px] font-extrabold text-white">
        {value}
      </Text>
    </View>
  );
}
