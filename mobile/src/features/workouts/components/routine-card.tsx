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
import { workoutApi, type TemplateExercise, type TemplateSet, type WorkoutTemplate } from "../api";

/* ---------------------------- helpers ---------------------------- */

function coverUri(url?: string | null) {
  const value = url?.trim();
  if (!value) return null;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("http://")) return value.replace("http://", "https://");
  return value;
}

function sortedSets(exercise: TemplateExercise): TemplateSet[] {
  return [...(exercise.workout_template_sets ?? [])].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0),
  );
}

function formatRest(seconds?: number) {
  if (!seconds) return null;
  if (seconds < 60) return `${seconds}s rest`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}m ${s}s rest` : `${m}m rest`;
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
          color={C.ink}
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
      <View className="mb-4 overflow-hidden rounded-[26px] bg-panel p-5">
        <View className="flex-row items-center gap-3">
          <Cover url={template.image_url} width={56} height={56} radius={16} iconSize={25} />
          <View className="min-w-0 flex-1">
            <Txt weight="medium" numberOfLines={2} className="text-lg leading-6 tracking-[-0.5px]">
              {template.name}
            </Txt>
            <Txt className="mt-1 text-xs text-muted">
              {count} {count === 1 ? "exercise" : "exercises"}
            </Txt>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Options for ${template.name}`}
            onPress={onOptions}
            className="h-11 w-11 items-center justify-center"
          >
            <MaterialCommunityIcons name="dots-horizontal" size={23} color={C.muted} />
          </Pressable>
        </View>
        {!!previewNames(template) && (
          <Txt numberOfLines={2} className="mt-4 text-xs leading-5 text-muted">
            {previewNames(template)}
          </Txt>
        )}
        <View className="mt-5 flex-row gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Show exercises in ${template.name}`}
            onPress={() => setOpen(true)}
            className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-full bg-elevated px-3"
          >
            <Txt weight="medium" className="text-xs">
              Preview
            </Txt>
            <MaterialCommunityIcons name="chevron-down" size={17} color={C.ink} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Start ${template.name}`}
            accessibilityState={{ disabled }}
            onPress={onStart}
            disabled={disabled}
            className={`min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-full px-3 ${disabled ? "bg-elevated" : "bg-ink"}`}
          >
            <Txt weight="semibold" className={`text-xs ${disabled ? "text-muted" : "text-black"}`}>
              Start
            </Txt>
            <MaterialCommunityIcons name="play" size={17} color={disabled ? C.muted : C.bg} />
          </Pressable>
        </View>
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
  const reps = sets.map((s) => s.target_reps).filter((n): n is number => typeof n === "number");
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
    <View className={`flex-row items-center px-4 py-3.5 ${last ? "" : " "}`}>
      <View className="h-8 w-8 items-center justify-center rounded-full bg-ink/10">
        <Txt weight="semibold" className="text-xs text-green-300">
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
        <Txt weight="semibold" className="text-[13px]">
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
    let active = true;
    queueMicrotask(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [load]);

  const exercises = [...(detail?.workout_template_exercises ?? [])].sort(
    (a, b) => a.position - b.position,
  );
  const totalSets = exercises.reduce((sum, e) => sum + (e.workout_template_sets?.length ?? 0), 0);
  const exerciseCount = exercises.length || template.workout_template_exercises.length;
  const description = (detail?.description ?? template.description)?.trim();

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
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
            <View pointerEvents="none" className="absolute inset-0 bg-black/45" />

            <View className="absolute inset-x-0 top-2 items-center">
              <View className="h-1.5 w-11 rounded-full bg-white/50" />
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close"
              className="absolute right-4 top-5 h-9 w-9 items-center justify-center rounded-full bg-black/60"
            >
              <MaterialCommunityIcons name="chevron-down" size={24} color="#FFFFFF" />
            </Pressable>

            <View className="absolute inset-x-5 bottom-3">
              <Txt weight="semibold" className="text-[24px] text-white" numberOfLines={1}>
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
              <Txt className="mb-3 px-1 text-sm leading-5 text-muted" numberOfLines={3}>
                {description}
              </Txt>
            ) : null}

            {loading ? (
              <View className="items-center py-12">
                <ActivityIndicator color={C.ink} />
              </View>
            ) : error ? (
              <Pressable
                onPress={() => void load()}
                className="flex-row items-center rounded-2xl bg-panel p-4"
              >
                <MaterialCommunityIcons name="cloud-off-outline" size={22} color={C.muted} />
                <Txt className="ml-3 flex-1 text-sm text-muted">{error} Tap to try again.</Txt>
              </Pressable>
            ) : exercises.length === 0 ? (
              <View className="items-center py-10">
                <MaterialCommunityIcons name="dumbbell" size={32} color={C.muted} />
                <Txt className="mt-2 text-sm text-muted">This routine has no exercises yet.</Txt>
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
              <MaterialCommunityIcons name="clock" size={24} color={disabled ? C.muted : C.bg} />
              <Txt
                weight="semibold"
                className={`ml-2 text-lg ${disabled ? "text-muted" : "text-bg"}`}
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
