import React, { useRef, useState } from "react";
import { ActivityIndicator, Pressable } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppAlert } from "@/src/components/app-dialog";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { useWorkout } from "@/src/features/workouts/workout-context";
import { useProgram } from "./program-context";
import type { ProgramSlot } from "./api";

export function WorkoutAction({ slot, title, quiet = false }: { slot: ProgramSlot; title?: string; quiet?: boolean }) {
  const workout = useWorkout();
  const { refresh } = useProgram();
  const Alert = useAppAlert();
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const completed = slot.status === "completed";
  const unavailable = completed ? !slot.sessionId : !slot.templateId;
  const label = unavailable ? "Session unavailable" : title ?? (completed ? "View workout log" : slot.status === "active" ? "Resume workout" : "Start workout");
  const run = async () => {
    if (pending.current || workout.busy || unavailable) return;
    if (completed && slot.sessionId) { router.push({ pathname: "/workout/history/[id]", params: { id: slot.sessionId } }); return; }
    if (workout.session) {
      if (workout.session.id === slot.sessionId) router.push("/workout");
      else Alert.alert("You have a workout in progress", "Finish or discard it before starting another session.", [{ text: "Stay here", style: "cancel" }, { text: "Resume workout", onPress: () => router.push("/workout") }]);
      return;
    }
    pending.current = true; setBusy(true);
    try {
      await workout.start(undefined, slot.id);
      void refresh();
      router.push("/workout");
    } catch (cause) {
      Alert.alert("Could not start workout", cause instanceof Error ? cause.message : "Please try again.");
    } finally { pending.current = false; setBusy(false); }
  };
  const color = quiet ? C.ink : C.bg;
  return (
    <Pressable onPress={() => void run()} disabled={busy || workout.busy || unavailable} accessibilityRole="button" accessibilityLabel={label}
      className={`min-h-12 flex-row items-center justify-center gap-2 rounded-full px-5 py-3 ${quiet ? "bg-elevated" : "bg-brand"} ${busy || workout.busy || unavailable ? "opacity-50" : ""}`}>
      {busy ? <ActivityIndicator color={color} /> : <><MaterialCommunityIcons name={completed ? "notebook-outline" : "play"} size={21} color={color} /><Txt weight="bold" className="flex-shrink text-sm" style={{ color }}>{label}</Txt></>}
    </Pressable>
  );
}
