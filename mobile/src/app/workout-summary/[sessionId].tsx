import { Ionicons } from "@expo/vector-icons";

import { router, useLocalSearchParams } from "expo-router";

import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { useSQLiteContext } from "expo-sqlite";

import { useAuthStore } from "@/features/auth/store";

import { useResolvedWorkout } from "@/features/workout-session/hooks/use-resolved-workout";

import { compareWorkoutToTemplate } from "@/features/workout-templates/compare-workout-template";
import { getLocalRoutineByAnyId } from "@/features/workout-templates/local-routine-repository";
import {
  createLocalTemplate,
  saveLocalTemplate,
} from "@/features/workout-templates/local-services";
import { requestRoutineSync } from "@/features/workout-templates/sync-manager";
import { structureFromWorkout } from "@/features/workout-templates/update-from-workout";
import { workoutToRoutineInput } from "@/features/workout-templates/workout-to-routine";

import type { WorkoutTemplate } from "@/features/workouts/types";

import {
  formatCompactDuration,
  formatVolume,
  workoutVolume,
} from "@/features/workouts/utils";

function SyncBadge({ status }: { status: string | null }) {
  if (!status || status === "SYNCED") {
    return null;
  }

  let text = "Saved on device";

  let icon: keyof typeof Ionicons.glyphMap = "cloud-offline-outline";

  if (status === "SYNCING") {
    text = "Syncing…";

    icon = "cloud-upload-outline";
  }

  if (status === "CONFLICT") {
    text = "Needs attention";

    icon = "alert-circle-outline";
  }

  if (status === "ERROR") {
    text = "Sync failed";

    icon = "warning-outline";
  }

  return (
    <View className="mt-4 flex-row items-center self-start rounded-full bg-white/[0.05] px-3 py-2">
      <Ionicons name={icon} size={14} color="#9CA3AF" />

      <Text className="ml-2 text-[11px] font-semibold text-white/45">
        {text}
      </Text>
    </View>
  );
}

export default function WorkoutSummaryScreen() {
  const database = useSQLiteContext();
  const params = useLocalSearchParams<{
    sessionId?: string;
  }>();

  const workoutKey =
    typeof params.sessionId === "string" ? params.sessionId : "";

  const user = useAuthStore((state) => state.user);

  const [sourceRoutine, setSourceRoutine] = useState<WorkoutTemplate | null>(
    null,
  );

  const resolved = useResolvedWorkout(workoutKey);

  const workout = resolved.workout;

  const templateKey =
    workout?.template_client_id ?? workout?.template_id ?? null;

  useEffect(() => {
    let active = true;
    if (!templateKey || !user?.id)
      return () => {
        active = false;
      };
    void getLocalRoutineByAnyId(database, user.id, templateKey).then(
      (record) => {
        if (active) setSourceRoutine(record?.template ?? null);
      },
    );
    return () => {
      active = false;
    };
  }, [database, templateKey, user?.id]);

  if (resolved.isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#3B82F6" />
      </SafeAreaView>
    );
  }

  if (!workout) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background px-8">
        <Ionicons name="alert-circle-outline" size={32} color="#737373" />

        <Text className="mt-4 text-center text-white/45">
          Workout could not be loaded.
        </Text>

        <Pressable
          onPress={() => router.replace("/train")}
          className="mt-6 rounded-2xl bg-brand px-6 py-4"
        >
          <Text className="font-bold text-white">Back to Train</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const volume = workoutVolume(workout, user?.weight_unit ?? "KG");

  const historyKey = resolved.localId ?? resolved.serverId ?? workout.id;

  const difference = sourceRoutine
    ? compareWorkoutToTemplate(workout, sourceRoutine)
    : null;

  async function createRoutine(mode: "STRUCTURE_ONLY" | "USE_LOGGED_VALUES") {
    if (!user || !workout) return;
    const localId = await createLocalTemplate(database, {
      userId: user.id,
      input: workoutToRoutineInput(workout, mode),
      folderId: null,
      isFavorite: false,
    });
    requestRoutineSync(database, user.id, 0);
    router.push(`/workout-templates/${localId}`);
  }

  function saveAsRoutine() {
    Alert.alert(
      "Save as Routine",
      "What should FitSync use as the routine targets?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Structure only",
          onPress: () => void createRoutine("STRUCTURE_ONLY"),
        },
        {
          text: "Use logged values",
          onPress: () => void createRoutine("USE_LOGGED_VALUES"),
        },
      ],
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 22,

          paddingBottom: 50,
        }}
      >
        <View className="h-14 w-14 items-center justify-center rounded-full bg-brand">
          <Ionicons name="checkmark" size={27} color="#FFFFFF" />
        </View>

        <Text className="mt-6 text-[13px] font-bold uppercase tracking-[1.8px] text-brand-bright">
          Workout complete
        </Text>

        <Text className="mt-2 text-[34px] font-extrabold tracking-[-1.4px] text-white">
          {workout.name}
        </Text>

        <SyncBadge status={resolved.syncStatus} />

        <View className="mt-8 flex-row rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-5">
          <Stat
            label="Duration"
            value={formatCompactDuration(workout.duration_seconds ?? 0)}
          />

          <Stat
            label="Volume"
            value={`${formatVolume(volume)} ${user?.weight_unit ?? "KG"}`}
          />

          <Stat label="Sets" value={String(workout.completed_set_count)} />
        </View>

        <Text className="mt-9 text-[19px] font-extrabold text-white">
          Exercises
        </Text>

        <View className="mt-4 gap-2">
          {workout.exercises.map((exercise) => (
            <View
              key={exercise.id}
              className="flex-row items-center rounded-2xl bg-white/[0.025] px-4 py-4"
            >
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-muted">
                <Ionicons name="barbell-outline" size={17} color="#60A5FA" />
              </View>

              <View className="ml-3 flex-1">
                <Text className="text-[14px] font-bold text-white">
                  {exercise.exercise_name}
                </Text>

                <Text className="mt-1 text-[11px] text-white/30">
                  {
                    exercise.sets.filter((workoutSet) => workoutSet.completed)
                      .length
                  }{" "}
                  completed sets
                </Text>
              </View>
            </View>
          ))}
        </View>

        {!templateKey ? (
          <Pressable
            onPress={saveAsRoutine}
            className="mt-6 flex-row items-center rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4"
          >
            <Ionicons name="albums-outline" size={20} color="#60A5FA" />
            <View className="ml-3 flex-1">
              <Text className="font-bold text-white">Save as Routine</Text>
              <Text className="mt-1 text-[10px] text-white/30">
                Reuse this workout whenever you want.
              </Text>
            </View>
          </Pressable>
        ) : null}

        {sourceRoutine && difference?.changed ? (
          <View className="mt-5 rounded-2xl border border-brand-bright/20 bg-brand/[0.08] p-4">
            <Text className="font-bold text-white">
              You changed this routine
            </Text>
            <Text className="mt-1 text-[10px] text-white/35">
              Update {sourceRoutine.name} so your next workout uses this
              structure.
            </Text>
            <Pressable
              onPress={() => {
                if (!user) return;
                void getLocalRoutineByAnyId(
                  database,
                  user.id,
                  sourceRoutine.id,
                ).then(async (record) => {
                  if (!record) return;
                  await saveLocalTemplate(database, {
                    localId: record.localId,
                    userId: user.id,
                    input: structureFromWorkout(workout, sourceRoutine),
                    folderId: sourceRoutine.folder_client_id,
                    isFavorite: sourceRoutine.is_favorite,
                  });
                  requestRoutineSync(database, user.id, 0);
                  const updated = await getLocalRoutineByAnyId(
                    database,
                    user.id,
                    record.localId,
                  );
                  setSourceRoutine(updated?.template ?? null);
                  Alert.alert(
                    "Routine updated",
                    `${sourceRoutine.name} now uses this workout structure.`,
                  );
                });
              }}
              className="mt-4 min-h-[44px] items-center justify-center rounded-xl bg-brand"
            >
              <Text className="font-extrabold text-white">Update Routine</Text>
            </Pressable>
          </View>
        ) : null}

        <Pressable
          onPress={() => {
            router.replace("/train");
          }}
          className="mt-9 min-h-[56px] items-center justify-center rounded-2xl bg-brand"
        >
          <Text className="text-[15px] font-extrabold text-white">Done</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            router.push(`/workout-history/${historyKey}`);
          }}
          className="mt-3 min-h-[52px] items-center justify-center rounded-2xl bg-white/[0.04]"
        >
          <Text className="text-[13px] font-bold text-white/55">
            View full workout
          </Text>
        </Pressable>
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
