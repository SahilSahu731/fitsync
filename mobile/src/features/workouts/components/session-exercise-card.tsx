import React from "react";
import { Pressable, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import type { SessionExercise } from "../api";
import { ExerciseImage } from "./exercise-image";
import { WorkoutGlassSurface } from "./workout-glass";
import { SetRow } from "./set-row";

export const SessionExerciseCard = React.memo(function SessionExerciseCard({
  exercise,
  index,
  nextSetId,
  collapsed,
  busy,
  onToggle,
  onMenu,
  onAddSet,
  onFocus,
  onSetMount,
  onSetLayout,
  adding = false,
}: {
  exercise: SessionExercise;
  index: number;
  nextSetId?: string;
  collapsed: boolean;
  busy: boolean;
  onToggle: (id: string) => void;
  onMenu: (exercise: SessionExercise) => void;
  onAddSet: (id: string) => void;
  onFocus: (id: string) => void;
  onSetMount: (setId: string, node: View | null) => void;
  onSetLayout: (setId: string) => void;
  adding?: boolean;
}) {
  const sets = [...exercise.workout_logged_sets].sort((a, b) => a.position - b.position);
  const logged = sets.filter((set) => !!set.completed_at).length;
  const complete = sets.length > 0 && logged === sets.length;
  const current = sets.some((set) => set.id === nextSetId);
  const timed =
    exercise.tracking_type === "duration" || exercise.tracking_type === "distance_duration";
  return (
    <View
      className={`mb-4 overflow-hidden rounded-3xl border ${complete ? "border-[#94DBB2]/50" : current ? "border-[#ADC7F0]/40" : "border-white/10"}`}
    >
      <WorkoutGlassSurface />
      <View className="flex-row items-center p-3">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: !collapsed }}
          accessibilityLabel={`${exercise.exercise_name}, ${logged} of ${sets.length} sets logged`}
          onPress={() => onToggle(exercise.id)}
          className="min-w-0 flex-1 flex-row items-center gap-3"
        >
          <ExerciseImage uri={exercise.image_url} name={exercise.exercise_name} size={44} round />
          <View className="min-w-0 flex-1">
            <View className="mb-1 flex-row flex-wrap items-center gap-x-2 gap-y-0.5">
              <Txt className="text-[10px] tracking-wider text-muted">
                EXERCISE {String(index + 1).padStart(2, "0")}
              </Txt>
              {(current || complete) && (
                <Txt
                  weight="medium"
                  className={`text-[10px] ${complete ? "text-[#BFECD0]" : "text-ink"}`}
                >
                  {complete ? "✓ Done" : "• Up next"}
                </Txt>
              )}
            </View>
            <Txt
              weight="semibold"
              numberOfLines={2}
              className="text-[15px] leading-[22px] tracking-[-0.3px]"
            >
              {exercise.exercise_name}
            </Txt>
            <Txt className="mt-1 text-[11px] text-muted">
              {logged}/{sets.length} sets logged
            </Txt>
          </View>
          <MaterialCommunityIcons
            name={collapsed ? "chevron-down" : "chevron-up"}
            size={18}
            color={C.muted}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Options for ${exercise.exercise_name}`}
          disabled={busy}
          onPress={() => onMenu(exercise)}
          className="ml-1 h-11 w-11 items-center justify-center rounded-xl"
        >
          <MaterialCommunityIcons name="dots-horizontal" size={22} color={C.muted} />
        </Pressable>
      </View>
      {!collapsed && (
        <>
          {!!exercise.notes && (
            <Txt className="mx-4 mb-3 text-xs leading-5 text-muted">{exercise.notes}</Txt>
          )}
          {sets.length > 0 && (
            <View className="mx-3 mb-2 flex-row items-center gap-2 px-2">
              <Txt className="w-11 text-center text-[10px] tracking-wider text-muted">TYPE</Txt>
              <Txt className="flex-1 text-center text-[10px] tracking-wider text-muted">
                {timed ? "SECONDS" : exercise.tracking_type === "reps" ? "ADDED KG" : "KG"}
              </Txt>
              {exercise.tracking_type !== "duration" && (
                <Txt className="flex-1 text-center text-[10px] tracking-wider text-muted">
                  {timed ? "METERS" : "REPS"}
                </Txt>
              )}
              <Txt className="w-12 text-center text-[10px] tracking-wider text-muted">LOG</Txt>
            </View>
          )}
          <View className="px-3">
            {sets.map((set, setIndex) => (
              <View
                key={set.id}
                ref={(node) => onSetMount(set.id, node)}
                collapsable={false}
                onLayout={() => onSetLayout(set.id)}
              >
                <SetRow
                  set={set}
                  number={setIndex + 1}
                  restSeconds={exercise.rest_seconds}
                  trackingType={exercise.tracking_type}
                  exerciseId={exercise.id}
                  onFocus={onFocus}
                  isNext={set.id === nextSetId}
                />
              </View>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add set to ${exercise.exercise_name}`}
            disabled={busy || adding}
            onPress={() => onAddSet(exercise.id)}
            className={`mx-3 mb-3 mt-1 min-h-11 flex-row items-center justify-center gap-2 rounded-xl bg-white/5 ${busy || adding ? "opacity-50" : ""}`}
          >
            <MaterialCommunityIcons name="plus" size={17} color={C.muted} />
            <Txt weight="medium" className="text-xs text-muted">
              {adding ? "Adding set…" : "Add set"}
            </Txt>
          </Pressable>
        </>
      )}
    </View>
  );
});
