import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSQLiteContext } from "expo-sqlite";
import { useAuthStore } from "@/features/auth/store";
import { getLocalRoutineByAnyId } from "@/features/workout-templates/local-routine-repository";
import {
  estimateRoutineMinutes,
  exerciseRoutineSummary,
  formatRestSeconds,
  routineSetCount,
} from "@/features/workout-templates/routine-format";
import { startLocalWorkout } from "@/features/workout-session/local/start-local-workout";
import type { WorkoutTemplate } from "@/features/workouts/types";

export default function RoutineDetailScreen() {
  const params = useLocalSearchParams<{ templateId?: string }>();
  const templateId =
    typeof params.templateId === "string" ? params.templateId : "";
  const database = useSQLiteContext();
  const user = useAuthStore((state) => state.user);
  const [routine, setRoutine] = useState<WorkoutTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!user?.id || !templateId) return;
    try {
      setRoutine(
        (await getLocalRoutineByAnyId(database, user.id, templateId))
          ?.template ?? null,
      );
    } finally {
      setLoading(false);
    }
  }, [database, templateId, user?.id]);
  useFocusEffect(
    useCallback(() => {
      void load();
      return undefined;
    }, [load]),
  );
  if (loading)
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#3B82F6" />
      </SafeAreaView>
    );
  if (!routine)
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <Text className="text-white/40">Routine not found.</Text>
      </SafeAreaView>
    );
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          onPress={router.back}
          className="h-10 w-10 items-center justify-center"
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>
        <View className="flex-1" />
        <Pressable
          onPress={() => router.push(`/workout-templates/${templateId}/edit`)}
          className="rounded-xl bg-white/[0.05] px-4 py-3"
        >
          <Text className="font-bold text-white/65">Edit</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-5 pt-3">
          <Text className="text-[29px] font-extrabold text-white">
            {routine.name}
          </Text>
          {routine.description ? (
            <Text className="mt-3 text-white/40">{routine.description}</Text>
          ) : null}
          <Text className="mt-4 text-white/35">
            {routine.exercise_count} exercises · {routineSetCount(routine)} sets
            · ~{estimateRoutineMinutes(routine)} min
          </Text>
        </View>
        <View className="mt-8 border-t border-white/[0.06]">
          {routine.exercises.map((exercise, index) => (
            <View
              key={exercise.id}
              className="border-b border-white/[0.06] px-5 py-4"
            >
              <Text className="font-bold text-white">
                {index + 1}. {exercise.exercise_name}
              </Text>
              <Text className="mt-2 text-white/35">
                {exerciseRoutineSummary(exercise)}
              </Text>
              <Text className="mt-1 text-white/25">
                {formatRestSeconds(exercise.rest_seconds)} rest
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <View className="absolute bottom-0 left-0 right-0 bg-[#08090B] px-5 pb-7 pt-3">
        <Pressable
          onPress={() => {
            if (!user) return;
            void startLocalWorkout(database, user, { template: routine }).then(
              (id) => router.push(`/workouts/active/${id}`),
            );
          }}
          className="min-h-[54px] items-center justify-center rounded-2xl bg-brand"
        >
          <Text className="font-extrabold text-white">Start Workout</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
