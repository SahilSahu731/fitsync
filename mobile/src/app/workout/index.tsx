import { useAppAlert } from "@/src/components/app-dialog";
import React, { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
} from "react-native";

import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";

import { useWorkout } from "@/src/features/workouts/workout-context";
import { SetRow } from "@/src/features/workouts/components/set-row";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;

  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function LiveWorkoutScreen() {
  const Alert = useAppAlert();
  const router = useRouter();

  const {
    session,
    loading,
    busy,
    restTimer,
    addSet,
    finish,
    discard,
    stopRest,
  } = useWorkout();

  // eslint-disable-next-line react-hooks/purity
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const exercises = useMemo(() => {
    return [...(session?.workout_session_exercises ?? [])].sort(
      (a, b) => a.position - b.position,
    );
  }, [session]);

  const elapsed = session
    ? Math.floor((now - new Date(session.started_at).getTime()) / 1000)
    : 0;

  const restRemaining = restTimer
    ? Math.max(0, Math.ceil((restTimer.endsAt - now) / 1000))
    : 0;

  const completedSets = exercises.reduce(
    (total, item) =>
      total +
      item.workout_logged_sets.filter((set) => set.completed_at !== null)
        .length,
    0,
  );

  const totalSets = exercises.reduce(
    (total, item) => total + item.workout_logged_sets.length,
    0,
  );

  const handleFinish = () => {
    Alert.alert(
      "Finish workout?",
      "Your completed sets will be saved to your history.",
      [
        { text: "Keep training", style: "cancel" },
        {
          text: "Finish",
          onPress: async () => {
            try {
              await finish();
              router.replace("/(tabs)/train");
            } catch {
              Alert.alert("Error", "Could not finish your workout.");
            }
          },
        },
      ],
    );
  };

  const handleDiscard = () => {
    Alert.alert(
      "Discard workout?",
      "This workout will not appear in your completed history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: async () => {
            try {
              await discard();
              router.replace("/(tabs)/train");
            } catch {
              Alert.alert("Error", "Could not discard the workout.");
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color={C.brand} />
      </View>
    );
  }

  if (!session) {
    return (
      <View className="flex-1 items-center justify-center bg-bg px-6">
        <MaterialCommunityIcons name="dumbbell" size={50} color={C.brand} />

        <Txt weight="bold" className="mt-5 text-2xl">
          No active workout
        </Txt>

        <Pressable
          onPress={() => router.replace("/(tabs)/train")}
          className="mt-6 rounded-2xl bg-brand px-8 py-4"
        >
          <Txt weight="bold" className="text-bg">
            GO TO WORKOUTS
          </Txt>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <View className="flex-row items-center justify-between px-5 pb-4 pt-5">
        <Pressable
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-full border border-border"
        >
          <MaterialCommunityIcons name="chevron-down" size={28} color={C.ink} />
        </Pressable>

        <View className="items-center">
          <Txt weight="bold" className="text-[17px]">
            {session.name}
          </Txt>

          <Txt weight="semibold" className="text-sm text-brand">
            {formatTime(Math.max(0, elapsed))}
          </Txt>
        </View>

        <Pressable
          onPress={handleFinish}
          disabled={busy}
          className="rounded-full bg-brand px-4 py-3"
        >
          <Txt weight="bold" className="text-xs text-bg">
            FINISH
          </Txt>
        </Pressable>
      </View>

      <View className="mx-5 mb-4 rounded-2xl bg-panel p-4">
        <View className="flex-row justify-between">
          <Txt weight="semibold" className="text-sm">
            WORKOUT PROGRESS
          </Txt>

          <Txt weight="bold" className="text-brand">
            {completedSets}/{totalSets}
          </Txt>
        </View>

        <View className="mt-3 h-2 overflow-hidden rounded-full bg-elevated">
          <View
            className="h-full rounded-full bg-brand"
            style={{
              width: `${totalSets ? (completedSets / totalSets) * 100 : 0}%`,
            }}
          />
        </View>
      </View>

      {restRemaining > 0 && (
        <View className="mx-5 mb-4 flex-row items-center rounded-2xl border border-brand/30 bg-brand/10 p-4">
          <MaterialCommunityIcons
            name="timer-outline"
            size={28}
            color={C.brand}
          />

          <View className="ml-3 flex-1">
            <Txt weight="semibold">REST TIMER</Txt>
            <Txt weight="extra" className="text-[26px] text-brand">
              {formatTime(restRemaining)}
            </Txt>
          </View>

          <Pressable
            onPress={stopRest}
            className="rounded-xl bg-panel px-4 py-3"
          >
            <Txt weight="bold" className="text-xs">
              SKIP
            </Txt>
          </Pressable>
        </View>
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 120,
        }}
      >
        {exercises.map((exercise, index) => {
          const sets = [...exercise.workout_logged_sets].sort(
            (a, b) => a.position - b.position,
          );

          return (
            <View
              key={exercise.id}
              className="mb-5 overflow-hidden rounded-[26px] border border-border bg-panel"
            >
              <View className="flex-row items-center px-4 pb-3 pt-5">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-brand/10">
                  <MaterialCommunityIcons
                    name="dumbbell"
                    size={23}
                    color={C.brand}
                  />
                </View>

                <View className="ml-3 flex-1">
                  <Txt weight="bold" className="text-[18px]" numberOfLines={2}>
                    {exercise.exercise_name}
                  </Txt>

                  <Txt className="mt-1 text-xs text-muted">
                    EXERCISE {index + 1} · {sets.length} SETS
                  </Txt>
                </View>
              </View>

              <View className="px-3">
                {sets.map((set, setIndex) => (
                  <SetRow
                    key={set.id}
                    set={set}
                    number={setIndex + 1}
                    restSeconds={exercise.rest_seconds}
                    trackingType={exercise.tracking_type}
                  />
                ))}
              </View>

              <Pressable
                onPress={() => void addSet(exercise.id)}
                disabled={busy}
                className="mx-3 mb-4 mt-2 flex-row items-center justify-center rounded-xl border border-dashed border-border py-4"
              >
                <MaterialCommunityIcons name="plus" size={20} color={C.brand} />

                <Txt weight="semibold" className="ml-2 text-brand">
                  ADD SET
                </Txt>
              </Pressable>
            </View>
          );
        })}

        <Pressable
          onPress={() => router.push("/workout/add-exercise")}
          className="mb-4 flex-row items-center justify-center rounded-2xl bg-brand py-5"
        >
          <MaterialCommunityIcons name="plus" size={22} color={C.bg} />

          <Txt weight="bold" className="ml-2 text-bg">
            ADD EXERCISE
          </Txt>
        </Pressable>

        <Pressable onPress={handleDiscard} className="items-center py-5">
          <Txt weight="semibold" className="text-red-400">
            Discard workout
          </Txt>
        </Pressable>
      </ScrollView>
    </View>
  );
}
