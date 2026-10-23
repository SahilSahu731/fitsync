import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import {
  workoutApi,
  type SetType,
  type TemplateExercise,
  type TemplateSet,
  type WorkoutTemplate,
} from "../api";

/* ---------------------------- helpers ---------------------------- */

function coverUri(url?: string | null) {
  const value = url?.trim();
  if (!value) return null;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("http://")) return value.replace("http://", "https://");
  return value;
}

const SET_BADGE: Record<SetType, { label: string; color: string }> = {
  normal: { label: "", color: C.muted },
  warmup: { label: "W", color: "#FACC15" },
  heavy: { label: "H", color: "#F87171" },
  failure: { label: "F", color: "#FB7185" },
  drop: { label: "D", color: "#60A5FA" },
};

function sortedSets(exercise: TemplateExercise): TemplateSet[] {
  return [...(exercise.workout_template_sets ?? [])].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0),
  );
}

function repsSummary(sets: TemplateSet[]) {
  const reps = sets
    .map((s) => s.target_reps)
    .filter((n): n is number => typeof n === "number");
  if (reps.length) {
    const min = Math.min(...reps);
    const max = Math.max(...reps);
    return min === max ? `${min} reps` : `${min}–${max} reps`;
  }
  const secs = sets
    .map((s) => s.target_duration_seconds)
    .filter((n): n is number => typeof n === "number");
  if (secs.length) return `${Math.max(...secs)}s`;
  return null;
}

function formatRest(seconds?: number) {
  if (!seconds) return null;
  if (seconds < 60) return `${seconds}s rest`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}m ${s}s rest` : `${m}m rest`;
}

function setTarget(set: TemplateSet) {
  if (typeof set.target_reps === "number") return `${set.target_reps}`;
  if (typeof set.target_duration_seconds === "number")
    return `${set.target_duration_seconds}s`;
  return "—";
}

function previewNames(template: WorkoutTemplate) {
  const names = [...template.workout_template_exercises]
    .sort((a, b) => a.position - b.position)
    .map((e) => e.exercises?.name)
    .filter(Boolean) as string[];
  if (!names.length) return "";
  const shown = names.slice(0, 2).join(", ");
  const extra = names.length - 2;
  return extra > 0 ? `${shown} +${extra} more` : shown;
}

/* ------------------- cover image with fallback ------------------- */

function Cover({
  url,
  height,
  width,
  radius,
  iconSize,
}: {
  url?: string | null;
  height: number;
  width?: number | `${number}%`;
  radius?: number;
  iconSize: number;
}) {
  const [failed, setFailed] = useState(false);
  const uri = coverUri(url);
  const show = Boolean(uri) && !failed;

  return (
    <View
      className="items-center justify-center overflow-hidden bg-elevated"
      style={{ height, width: width ?? "100%", borderRadius: radius ?? 0 }}
    >
      {show ? (
        <Image
          source={{ uri: uri as string }}
          contentFit="cover"
          transition={200}
          style={{ width: "100%", height: "100%" }}
          onError={() => setFailed(true)}
        />
      ) : (
        <MaterialCommunityIcons
          name="dumbbell"
          size={iconSize}
          color={C.brand}
          style={{ opacity: 0.45 }}
        />
      )}
    </View>
  );
}

/* ------------------------- routine card -------------------------- */

export function RoutineCard({
  template,
  onStart,
  onOptions,
  disabled,
}: {
  template: WorkoutTemplate;
  onStart: () => void;
  onOptions: () => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const count = template.workout_template_exercises?.length ?? 0;

  return (
    <>
      <View className="mb-3 flex-row items-center overflow-hidden rounded-[22px] bg-panel pr-3">
        {/* Image, flush to the far left */}
        <Cover url={template.image_url} width={76} height={76} iconSize={28} />

        {/* Name + exercise count */}
        <View className="ml-3 flex-1">
          <Txt weight="semibold" className="text-xl" numberOfLines={1}>
            {template.name}
          </Txt>
          <Txt className="mt-0.5 text-sm text-muted">
            {count} {count === 1 ? "exercise" : "exercises"}
          </Txt>
        </View>

        {/* Arrow down: opens the drawer */}
        <Pressable
          onPress={() => setOpen(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Show exercises in ${template.name}`}
          className="h-9 w-9 items-center justify-center"
        >
          <MaterialCommunityIcons
            name="chevron-down"
            size={28}
            color={C.brand}
          />
        </Pressable>

        {/* 3 dots */}
        <Pressable
          onPress={onOptions}
          hitSlop={8}
          accessibilityLabel="Routine options"
          className="h-9 w-9 items-center justify-center"
        >
          <MaterialCommunityIcons
            name="dots-horizontal"
            size={24}
            color={"yellow"}
          />
        </Pressable>

        {/* Play icon only */}
        <Pressable
          onPress={onStart}
          disabled={disabled}
          accessibilityLabel={`Start ${template.name}`}
          className={`ml-1 h-10 w-10 items-center justify-center rounded-full ${
            disabled ? "bg-elevated" : "bg-white"
          }`}
        >
          <MaterialCommunityIcons
            name="play"
            size={22}
            color={disabled ? C.muted : C.bg}
          />
        </Pressable>
      </View>

      {open ? (
        <RoutineDrawer
          template={template}
          disabled={disabled}
          onClose={() => setOpen(false)}
          onStart={() => {
            setOpen(false);
            onStart();
          }}
        />
      ) : null}
    </>
  );
}

/* ---------------------------- drawer ----------------------------- */

function repsRange(sets: TemplateSet[]) {
  const reps = sets
    .map((s) => s.target_reps)
    .filter((n): n is number => typeof n === "number");
  if (reps.length) {
    const min = Math.min(...reps);
    const max = Math.max(...reps);
    return min === max ? `${min}` : `${min}–${max}`;
  }
  const secs = sets
    .map((s) => s.target_duration_seconds)
    .filter((n): n is number => typeof n === "number");
  if (secs.length) return `${Math.max(...secs)}s`;
  return "—";
}

function topWeight(sets: TemplateSet[]) {
  const weights = sets
    .map((s) => s.target_weight)
    .filter((n): n is number => typeof n === "number" && n > 0);
  return weights.length ? `${Math.max(...weights)} kg` : null;
}

function ExerciseRow({
  exercise,
  index,
  last,
}: {
  exercise: TemplateExercise;
  index: number;
  last: boolean;
}) {
  const sets = sortedSets(exercise);
  const rest = formatRest(exercise.rest_seconds);
  const weight = topWeight(sets);

  return (
    <View
      className={`flex-row items-center px-4 py-3.5 ${
        last ? "" : "border-b border-border"
      }`}
    >
      <View className="h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
        <Txt weight="bold" className="text-xs text-green-300">
          {index + 1}
        </Txt>
      </View>

      <View className="ml-3 flex-1">
        <Txt weight="semibold" className="text-[15px]" numberOfLines={1}>
          {exercise.exercises?.name ?? "Exercise"}
        </Txt>
        {rest || weight ? (
          <Txt className="mt-0.5 text-xs text-muted" numberOfLines={1}>
            {[weight, rest].filter(Boolean).join(" · ")}
          </Txt>
        ) : null}
      </View>

      <View className="ml-3 rounded-full bg-elevated px-3 py-1.5">
        <Txt weight="bold" className="text-[13px]">
          {sets.length} × {repsRange(sets)}
        </Txt>
      </View>
    </View>
  );
}

function RoutineDrawer({
  template,
  disabled,
  onClose,
  onStart,
}: {
  template: WorkoutTemplate;
  disabled: boolean;
  onClose: () => void;
  onStart: () => void;
}) {
  const { height } = useWindowDimensions();
  const [detail, setDetail] = useState<WorkoutTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setDetail(await workoutApi.template(template.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load this routine.");
    } finally {
      setLoading(false);
    }
  }, [template.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const exercises = [...(detail?.workout_template_exercises ?? [])].sort(
    (a, b) => a.position - b.position,
  );
  const totalSets = exercises.reduce(
    (sum, e) => sum + (e.workout_template_sets?.length ?? 0),
    0,
  );
  const exerciseCount =
    exercises.length || template.workout_template_exercises.length;
  const description = (detail?.description ?? template.description)?.trim();

  return (
    <Modal
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 justify-end bg-black/70">
        <Pressable
          className="flex-1"
          accessibilityLabel="Close routine preview"
          onPress={onClose}
        />

        <View
          className="overflow-hidden rounded-t-[28px] bg-bg"
          style={{ maxHeight: height * 0.85 }}
        >
          {/* Header: image with the title on top of it */}
          <View>
            <Cover url={template.image_url} height={140} iconSize={56} />
            <View
              pointerEvents="none"
              className="absolute inset-0 bg-black/45"
            />

            <View className="absolute inset-x-0 top-2 items-center">
              <View className="h-1.5 w-11 rounded-full bg-white/60" />
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close"
              className="absolute right-4 top-5 h-9 w-9 items-center justify-center rounded-full bg-black/60"
            >
              <MaterialCommunityIcons
                name="chevron-down"
                size={24}
                color="#FFFFFF"
              />
            </Pressable>

            <View className="absolute inset-x-5 bottom-3">
              <Txt
                weight="bold"
                className="text-[24px] text-white"
                numberOfLines={1}
              >
                {template.name}
              </Txt>
              <Txt className="mt-0.5 text-xs text-white/80">
                {exerciseCount} {exerciseCount === 1 ? "exercise" : "exercises"}
                {detail ? ` · ${totalSets} sets` : ""}
              </Txt>
            </View>
          </View>

          {/* Exercises: one per row */}
          <ScrollView
            style={{ flexShrink: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16 }}
          >
            {description ? (
              <Txt
                className="mb-3 px-1 text-sm leading-5 text-muted"
                numberOfLines={3}
              >
                {description}
              </Txt>
            ) : null}

            {loading ? (
              <View className="items-center py-12">
                <ActivityIndicator color={C.brand} />
              </View>
            ) : error ? (
              <Pressable
                onPress={() => void load()}
                className="flex-row items-center rounded-2xl bg-panel p-4"
              >
                <MaterialCommunityIcons
                  name="cloud-off-outline"
                  size={22}
                  color={C.muted}
                />
                <Txt className="ml-3 flex-1 text-sm text-muted">
                  {error} Tap to try again.
                </Txt>
              </Pressable>
            ) : exercises.length === 0 ? (
              <View className="items-center py-10">
                <MaterialCommunityIcons
                  name="dumbbell"
                  size={32}
                  color={C.muted}
                />
                <Txt className="mt-2 text-sm text-muted">
                  This routine has no exercises yet.
                </Txt>
              </View>
            ) : (
              <View className="overflow-hidden rounded-[20px] bg-panel">
                {exercises.map((exercise, index) => (
                  <ExerciseRow
                    key={exercise.id}
                    exercise={exercise}
                    index={index}
                    last={index === exercises.length - 1}
                  />
                ))}
              </View>
            )}
          </ScrollView>

          {/* Start button */}
          <SafeAreaView edges={["bottom"]} className="px-4 pt-2">
            <Pressable
              onPress={onStart}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={`Start ${template.name}`}
              className={`mb-2 flex-row items-center justify-center rounded-full py-4 ${
                disabled ? "bg-elevated" : "bg-white"
              }`}
            >
              <MaterialCommunityIcons
                name="clock"
                size={24}
                color={disabled ? C.muted : ""}
              />
              <Txt
                weight="bold"
                className={`ml-2 text-lg ${
                  disabled ? "text-muted" : "text-bg"
                }`}
              >
                {disabled ? "Workout in progress" : "Start routine"}
              </Txt>
            </Pressable>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}