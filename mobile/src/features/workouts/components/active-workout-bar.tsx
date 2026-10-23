import React, { useEffect, useState } from "react";

import {
  Pressable,
  View
} from "react-native";

import { usePathname, useRouter, useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
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
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const hidden = pathname.startsWith("/workout") || (!inline && segments[0] === "(tabs)");
  const { session, restTimer } = useWorkout();

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

  const elapsed = Math.max(
    0,
    Math.floor(
      (now - new Date(session.started_at).getTime()) / 1000
    )
  );

  const remaining = restTimer
    ? Math.max(0, Math.ceil((restTimer.endsAt - now) / 1000))
    : 0;

  const completedSets = session.workout_session_exercises.reduce(
    (total, exercise) =>
      total + exercise.workout_logged_sets.filter(
        set => set.completed_at !== null
      ).length,
    0
  );

  return (
    <View
      pointerEvents="box-none"
      className={inline ? "" : "absolute left-4 right-4"}
      style={inline ? undefined : { bottom: Math.max(insets.bottom, 16) }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Resume ${session.name}`}
        onPress={() => router.push("/workout")}
        className="overflow-hidden rounded-[24px] border border-border bg-elevated"
        style={{
          elevation: 12,
          shadowColor: "#000",
          shadowOpacity: 0.3,
          shadowRadius: 15
        }}
      >
        <View className="flex-row items-center px-4 py-4">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand">
            <MaterialCommunityIcons
              name="dumbbell"
              size={24}
              color={C.bg}
            />
          </View>

          <View className="ml-3 flex-1">
            <Txt weight="bold" className="text-[15px]" numberOfLines={1}>
              {session.name}
            </Txt>

            <Txt className="mt-1 text-xs text-muted">
              {completedSets} sets completed
              {remaining > 0 ? ` · Rest ${formatTime(remaining)}` : ""}
            </Txt>
          </View>

          <View className="items-end">
            <Txt weight="bold" className="text-brand">
              {formatTime(elapsed)}
            </Txt>

            <MaterialCommunityIcons
              name="chevron-up"
              size={23}
              color={C.ink}
            />
          </View>
        </View>
      </Pressable>
    </View>
  );
}