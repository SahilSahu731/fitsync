import React, { useEffect, useRef, useState } from "react";

import { Pressable, View } from "react-native";

import { usePathname, useRouter, useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { Txt } from "@/src/components/ui";
import { useAppAlert } from "@/src/components/app-dialog";
import { TabGlassSurface } from "@/src/components/glass-tabs";
// import { C } from "@/src/constants/theme";
import { useWorkout } from "../workout-context";

function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${minutes}:${String(secs).padStart(2, "0")}`;
}

export function ActiveWorkoutBar({ inline = false }: { inline?: boolean }) {
  const Alert = useAppAlert();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const hidden = pathname.startsWith("/workout") || (!inline && segments[0] === "(tabs)");
  const { session, discard, busy } = useWorkout();
  const discardRequested = useRef(false);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!session || hidden) return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [session, hidden]);

  if (!session || hidden) {
    return null;
  }

  const elapsed = Math.max(0, Math.floor((now - new Date(session.started_at).getTime()) / 1000));

  const currentExercise = [...session.workout_session_exercises]
    .sort((a, b) => a.position - b.position)
    .find((exercise) =>
      !exercise.workout_logged_sets.length ||
      exercise.workout_logged_sets.some((set) => !set.completed_at),
    );
  const currentSetIndex = [...(currentExercise?.workout_logged_sets ?? [])]
    .sort((a, b) => a.position - b.position)
    .findIndex((set) => !set.completed_at);
  const exerciseExcerpt = currentExercise
    ? `${currentExercise.exercise_name} · ${currentSetIndex >= 0 ? `Set ${currentSetIndex + 1}` : "Add a set"}`
    : session.workout_session_exercises.length
      ? "All sets completed"
      : "Add an exercise to begin";

  const confirmDiscard = () => {
    if (busy || discardRequested.current) return;
    discardRequested.current = true;
    Alert.alert("Discard workout?", "This workout will not appear in your completed history.", [
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => { discardRequested.current = false; },
      },
      {
        text: "Discard",
        style: "destructive",
        onPress: async () => {
          try {
            await discard();
          } catch (error) {
            Alert.alert(
              "Could not discard workout",
              error instanceof Error ? error.message : "Please try again.",
            );
          } finally {
            discardRequested.current = false;
          }
        },
      },
    ]);
  };

  return (
    <View
      pointerEvents="box-none"
      className={inline ? "" : "absolute left-4 right-4"}
      style={inline ? undefined : { bottom: Math.max(insets.bottom, 16) }}
    >
      <View
        className="overflow-hidden rounded-[28px]"
        style={{
          elevation: 12,
          shadowColor: "#000",
          shadowOpacity: 0.3,
          shadowRadius: 15,
        }}
      >
        <TabGlassSurface />
        <View className="flex-row items-center px-3 py-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Resume ${session.name}`}
            onPress={() => router.push("/workout")}
            className="flex-1 flex-row items-center"
          >
           <View className="items-end bg-orange-600/60 rounded-full p-2">
            <MaterialCommunityIcons name="chevron-up" size={22} color={"white"} />
          </View>

          <View className="ml-3 flex-1">
            <Txt weight="semibold" className="" numberOfLines={1}>
              {session.name}
            </Txt>

            <Txt className="text-xs text-muted" numberOfLines={1}>
              {exerciseExcerpt}
            </Txt>
          </View>

          <Txt weight="semibold" className="text-[#3edc4b] text-sm mr-4">
            {formatTime(elapsed)}
          </Txt>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Discard ${session.name}`}
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={confirmDiscard}
            className="items-end bg-red-700/40 rounded-full p-2"
          >
            <MaterialCommunityIcons name="trash-can" size={20} color={"white"} />
          </Pressable>
        </View>
        <View
          pointerEvents="none"
          className="absolute inset-0 rounded-[28px]"
          style={{ borderWidth: 0.5, borderColor: "rgba(255,255,255,0.1)" }}
        />
      </View>
    </View>
  );
}
