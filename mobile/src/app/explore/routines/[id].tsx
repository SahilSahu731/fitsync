import { useAppAlert } from "@/src/components/app-dialog";
import React, { useCallback, useEffect, useState } from "react";

import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  View,
} from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MaterialCommunityIcons } from "@expo/vector-icons";

import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";

import { catalogApi, type Routine } from "@/src/features/training-catalog/api";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const GREEN = "#4ADE80";
const BLUE = "#60A5FA";
const GOLD = "#FACC15";
const RED = "#F87171";

const LEVEL_COLOR: Record<string, string> = {
  beginner: GREEN,
  intermediate: GOLD,
  advanced: RED,
};

function formatRest(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

function StatTile({
  icon,
  color,
  value,
  label,
}: {
  icon: IconName;
  color: string;
  value: string;
  label: string;
}) {
  return (
    <View className="flex-1 items-center rounded-[20px] bg-panel py-4">
      <View
        className="h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: `${color}26` }}
      >
        <MaterialCommunityIcons name={icon} size={20} color={color} />
      </View>

      <Txt weight="extra" className="mt-2.5 text-xl">
        {value}
      </Txt>

      <Txt className="mt-0.5 text-[10px] tracking-wider text-muted">
        {label}
      </Txt>
    </View>
  );
}

function Tag({
  icon,
  label,
  color,
}: {
  icon: IconName;
  label: string;
  color: string;
}) {
  return (
    <View
      className="flex-row items-center rounded-full px-4 py-2"
      style={{ backgroundColor: `${color}22` }}
    >
      <MaterialCommunityIcons name={icon} size={16} color={color} />
      <Txt
        weight="semibold"
        className="ml-1.5 text-sm capitalize"
        style={{ color }}
      >
        {label}
      </Txt>
    </View>
  );
}

export default function RoutineDetailScreen() {
  const Alert = useAppAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(() => {
    if (!id) return () => {};

    let active = true;
    setLoading(true);
    setFailed(false);

    void catalogApi
      .routine(id)
      .then((data) => {
        if (active) setRoutine(data);
      })
      .catch((e) => {
        console.warn(e);
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => load(), [load]);

  const handleSave = async () => {
    if (!routine || saving) return;

    setSaving(true);

    try {
      await catalogApi.saveRoutine(routine.id);
      setSaved(true);

      Alert.alert(
        "Routine saved",
        "This reusable session is saved in Train. Start it there when you are ready to log a workout.",
        [
          { text: "OK" },
          {
            text: "Open Train",
            onPress: () => router.push("/(tabs)/train"),
          },
        ],
        "success",
      );
    } catch {
      Alert.alert("Error", "Could not save the routine.");
    } finally {
      setSaving(false);
    }
  };

  const BackButton = (
    <Pressable
      onPress={() => router.back()}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      className="h-11 w-11 items-center justify-center rounded-full bg-black/55"
      style={{
        position: "absolute",
        left: 16,
        top: insets.top + 8,
        zIndex: 10,
      }}
    >
      <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
    </Pressable>
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        {BackButton}
        <ActivityIndicator color={C.brand} />
      </View>
    );
  }

  if (failed || !routine) {
    return (
      <View className="flex-1 items-center justify-center bg-bg px-8">
        {BackButton}
        <MaterialCommunityIcons
          name="cloud-off-outline"
          size={44}
          color={C.muted}
        />
        <Txt weight="bold" className="mt-4 text-lg">
          Routine unavailable
        </Txt>
        <Txt className="mt-1 text-center text-sm text-muted">
          We could not load this routine.
        </Txt>
        <Pressable
          onPress={() => load()}
          className="mt-5 rounded-full bg-brand px-6 py-3"
        >
          <Txt weight="bold" className="text-bg">
            Try again
          </Txt>
        </Pressable>
      </View>
    );
  }

  const exercises = [...(routine.training_routine_exercises ?? [])].sort(
    (a, b) => a.position - b.position,
  );
  const totalSets = exercises.reduce((sum, item) => sum + item.sets, 0);
  const showImage = Boolean(routine.image_url) && !imageFailed;
  const levelColor = LEVEL_COLOR[routine.level] ?? C.brand;

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
      >
        {/* Hero */}
        <View style={{ height: 280 }} className="bg-panel">
          {showImage ? (
            <Image
              source={{ uri: routine.image_url as string }}
              resizeMode="cover"
              style={{ width: "100%", height: "100%" }}
              onError={() => setImageFailed(true)}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <MaterialCommunityIcons
                name="dumbbell"
                size={80}
                color={C.brand}
                style={{ opacity: 0.4 }}
              />
            </View>
          )}
        </View>

        {BackButton}

        {/* Content sheet overlapping the image */}
        <View className="-mt-7 rounded-t-[30px] bg-bg px-5 pt-6">
          <View className="flex-row items-center">
            <MaterialCommunityIcons
              name="account-check-outline"
              size={22}
              color={C.brand}
            />
            <Txt
              weight="semibold"
              className="ml-1.5 text-lg tracking-wider text-brand"
            >
              By {routine.author}
            </Txt>
          </View>

          <Txt weight="semibold" className="mt-2 text-[32px] leading-[38px]">
            {routine.name}
          </Txt>

          <View className="mt-4 flex-row flex-wrap gap-2">
            <Tag
              icon="signal-cellular-3"
              label={routine.level}
              color={levelColor}
            />
            <Tag
              icon="dumbbell"
              label={routine.equipment.replace(/_/g, " ")}
              color={BLUE}
            />
            {routine.goal ? (
              <Tag
                icon="target"
                label={routine.goal.replace(/_/g, " ")}
                color={C.brand}
              />
            ) : null}
          </View>

          {routine.description ? (
            <Txt className="mt-4 text-[15px] leading-6 text-muted">
              {routine.description}
            </Txt>
          ) : null}

          {/* Stats */}
          <View className="mt-6 flex-row gap-3">
            <StatTile
              icon="timer-outline"
              color={C.brand}
              value={`${routine.estimated_minutes}`}
              label="MINUTES"
            />
            <StatTile
              icon="format-list-bulleted"
              color={BLUE}
              value={`${exercises.length}`}
              label="EXERCISES"
            />
            <StatTile
              icon="layers-triple-outline"
              color={GREEN}
              value={`${totalSets}`}
              label="TOTAL SETS"
            />
          </View>

          {/* Exercises */}
          <View className="mb-4 mt-9 flex-row items-center justify-between">
            <Txt weight="bold" className="text-[22px]">
              Exercises
            </Txt>
            <Txt className="text-sm text-white/80">{exercises.length} total</Txt>
          </View>

          {exercises.map((item, index) => (
            <View
              key={item.id}
              className="mb-3 rounded-[22px] bg-panel p-4"
            >
              <View className="flex-row items-center">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-green-600/20">
                  <Txt weight="extra" className="text-brand">
                    {index + 1}
                  </Txt>
                </View>

                <View className="ml-3 flex-1">
                  <Txt weight="bold" className="text-[16px]" numberOfLines={2}>
                    {item.exercises.name}
                  </Txt>

                  <View className="mt-1 flex-row items-center">
                    <MaterialCommunityIcons
                      name="timer-sand"
                      size={13}
                      color={C.muted}
                    />
                    <Txt className="ml-1 text-xs text-muted">
                      Rest {formatRest(item.rest_seconds)}
                    </Txt>
                  </View>
                </View>

                <View className="ml-2 rounded-full bg-elevated px-3 py-1.5">
                  <Txt weight="bold" className="text-[13px]">
                    {item.sets} ×{" "}
                    {item.min_reps === item.max_reps
                      ? item.min_reps
                      : `${item.min_reps}–${item.max_reps}`}
                  </Txt>
                </View>
              </View>

              {Boolean(item.notes) && (
                <View className="mt-3 flex-row rounded-xl bg-elevated p-3">
                  <MaterialCommunityIcons
                    name="lightbulb-on-outline"
                    size={15}
                    color={GOLD}
                    style={{ marginTop: 2 }}
                  />
                  <Txt className="ml-2 flex-1 text-sm leading-5 text-muted">
                    {item.notes}
                  </Txt>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Sticky save bar */}
      <View
        className="absolute bottom-0 left-0 right-0 border-t border-border bg-bg px-5 pt-4"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <Pressable
          onPress={() => void handleSave()}
          disabled={saving || saved}
          accessibilityRole="button"
          accessibilityLabel={saved ? "Routine saved" : "Save routine"}
          className={`h-14 flex-row items-center justify-center rounded-full ${
            saved ? "bg-green-500/15" : "bg-brand"
          }`}
        >
          {saving ? (
            <ActivityIndicator color={C.bg} />
          ) : (
            <>
              <MaterialCommunityIcons
                name={saved ? "check-circle" : "bookmark-plus-outline"}
                size={22}
                color={saved ? GREEN : C.bg}
              />
              <Txt
                weight="bold"
                className="ml-2 text-base"
                style={{ color: saved ? GREEN : C.bg }}
              >
                {saved ? "Saved to Train" : "Save routine"}
              </Txt>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}
