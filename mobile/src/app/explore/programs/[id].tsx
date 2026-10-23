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

import {
  catalogApi,
  type ProgramDetail,
} from "@/src/features/training-catalog/api";

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
      <MaterialCommunityIcons name={icon} size={18} color={color} />
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

export default function ProgramDetailScreen() {
  const Alert = useAppAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [program, setProgram] = useState<ProgramDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [coverFailed, setCoverFailed] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = useCallback(() => {
    if (!id) return () => {};

    let active = true;
    setLoading(true);
    setError("");

    async function run() {
      try {
        const [detail, mine] = await Promise.all([
          catalogApi.program(id),
          catalogApi.myPrograms(),
        ]);

        if (!active) return;

        setProgram(detail);
        setSaved(mine.some((item) => item.training_programs?.id === id));
      } catch {
        if (active) setError("Could not load this program.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void run();

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => load(), [load]);

  const handleSave = async () => {
    if (!program || saving || saved) return;

    setSaving(true);

    try {
      await catalogApi.saveProgram(program.id);
      setSaved(true);

      Alert.alert(
        "Program saved!",
        "Your program and its routines are saved in Train. Choose a routine there to start a workout.",
        [
          { text: "Stay here" },
          {
            text: "Go to Train",
            onPress: () => router.push("/(tabs)/train"),
          },
        ],
        "success",
      );
    } catch (error) {
      Alert.alert(
        "Could not save",
        error instanceof Error ? error.message : "Please try again.",
      );
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
      style={{ position: "absolute", left: 16, top: insets.top + 8, zIndex: 10 }}
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

  if (!program) {
    return (
      <View className="flex-1 items-center justify-center bg-bg px-8">
        {BackButton}
        <MaterialCommunityIcons
          name="cloud-off-outline"
          size={44}
          color={C.muted}
        />
        <Txt weight="bold" className="mt-4 text-lg">
          Program unavailable
        </Txt>
        <Txt className="mt-1 text-center text-sm text-muted">
          {error || "Program not found."}
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

  const days = [...program.training_program_days].sort(
    (a, b) => a.day_number - b.day_number,
  );
  const workoutDays = days.filter((day) => day.training_routines).length;
  const showCover = Boolean(program.cover_url) && !coverFailed;
  const levelColor = LEVEL_COLOR[program.level] ?? C.brand;

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
      >
        {/* Hero */}
        <View style={{ height: 280 }} className="bg-panel">
          {showCover ? (
            <Image
              source={{ uri: program.cover_url as string }}
              resizeMode="cover"
              style={{ width: "100%", height: "100%" }}
              onError={() => setCoverFailed(true)}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <MaterialCommunityIcons
                name="weight-lifter"
                size={84}
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
              name="check-decagram"
              size={20}
              color={C.brand}
            />
            <Txt
              weight="semibold"
              className="ml-1.5 text-sm tracking-wider text-brand"
            >
              By {program.author}
            </Txt>
          </View>

          <Txt weight="semibold" className="mt-2 text-[32px] leading-[38px]">
            {program.name}
          </Txt>

          {program.tagline ? (
            <Txt className="mt-2 text-base leading-6 text-white/80">
              {program.tagline}
            </Txt>
          ) : null}

          <View className="mt-4 flex-row flex-wrap gap-2">
            <Tag
              icon="signal-cellular-3"
              label={program.level}
              color={levelColor}
            />
            <Tag
              icon="target"
              label={program.goal.replace(/_/g, " ")}
              color={C.brand}
            />
            <Tag
              icon="dumbbell"
              label={program.equipment.replace(/_/g, " ")}
              color={BLUE}
            />
          </View>

          {/* Stats */}
          <View className="mt-6 flex-row gap-3">
            <StatTile
              icon="calendar-week"
              color={C.brand}
              value={`${program.days_per_week}`}
              label="DAYS / WEEK"
            />
            <StatTile
              icon="calendar-range"
              color={BLUE}
              value={`${program.duration_weeks}`}
              label="WEEKS"
            />
            <StatTile
              icon="fire"
              color={GREEN}
              value={`${program.duration_weeks * workoutDays}`}
              label="WORKOUTS"
            />
          </View>

          {/* About */}
          {program.description ? (
            <>
              <Txt weight="bold" className="mb-2 mt-9 text-[22px]">
                About this program
              </Txt>

              <Txt className="text-[15px] leading-6 text-muted">
                {program.description}
              </Txt>
            </>
          ) : null}

          {/* Weekly schedule */}
          <Txt weight="bold" className="mt-9 text-[22px]">
            Weekly schedule
          </Txt>

          <Txt className="mb-5 mt-1 text-sm text-muted">
            Your training week, day by day.
          </Txt>

          {days.map((day) => {
            const routine = day.training_routines;
            const exercises = routine?.training_routine_exercises
              ? [...routine.training_routine_exercises].sort(
                  (a, b) => a.position - b.position,
                )
              : [];
            const open = Boolean(expanded[day.id]);

            // Recovery day
            if (!routine) {
              return (
                <View
                  key={day.id}
                  className="mb-3 flex-row items-center rounded-[22px] border-border p-4"
                >
                  <View className="h-12 w-12 items-center justify-center rounded-2xl bg-blue-400/15">
                    <MaterialCommunityIcons
                      name="weather-night"
                      size={26}
                      color={BLUE}
                    />
                  </View>

                  <View className="ml-3 flex-1">
                    <Txt className="text-[11px] tracking-wider text-muted">
                      Day {day.day_number}
                    </Txt>
                    <Txt weight="bold" className="text-lg">
                      {day.label}
                    </Txt>
                    <Txt className="mt-0.5 text-sm text-muted">
                      Recovery day
                    </Txt>
                  </View>
                </View>
              );
            }

            return (
              <View
                key={day.id}
                className="mb-3 overflow-hidden rounded-[22px] bg-panel"
              >
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/explore/routines/[id]",
                      params: { id: routine.id },
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${day.label}`}
                  className="flex-row items-center p-4"
                >
                  <View className="h-12 w-12 items-center justify-center rounded-2xl bg-green-400/30">
                    <Txt weight="extra" className="text-lg text-green-500">
                      {day.day_number}
                    </Txt>
                  </View>

                  <View className="ml-3 flex-1">
                    <Txt className="text-[11px] tracking-wider text-muted">
                      Day {day.day_number}
                    </Txt>
                    <Txt weight="bold" className="text-lg" numberOfLines={1}>
                      {day.label}
                    </Txt>

                    <View className="mt-1 flex-row items-center">
                      <MaterialCommunityIcons
                        name="timer-outline"
                        size={16}
                        color={C.muted}
                      />
                      <Txt className="ml-1 text-sm text-muted">
                        {routine.estimated_minutes} min
                      </Txt>

                      <View
                        className="ml-3 h-1.5 w-1.5 rounded-full"
                        style={{
                          backgroundColor:
                            LEVEL_COLOR[routine.level] ?? C.muted,
                        }}
                      />
                      <Txt className="ml-1.5 text-sm capitalize text-muted">
                        {routine.level}
                      </Txt>
                    </View>
                  </View>

                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={24}
                    color={"white"}
                  />
                </Pressable>

                {exercises.length > 0 ? (
                  <>
                    <Pressable
                      onPress={() =>
                        setExpanded((current) => ({
                          ...current,
                          [day.id]: !current[day.id],
                        }))
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`${open ? "Hide" : "Show"} exercises for ${day.label}`}
                      className="flex-row items-center justify-between border-t border-border px-4 py-3"
                    >
                      <View className="flex-row items-center">
                        <MaterialCommunityIcons
                          name="format-list-bulleted"
                          size={18}
                          color={"white"}
                        />
                        <Txt className="ml-2 text-sm text-muted">
                          {exercises.length}{" "}
                          {exercises.length === 1 ? "exercise" : "exercises"}
                        </Txt>
                      </View>

                      <MaterialCommunityIcons
                        name={open ? "chevron-up" : "chevron-down"}
                        size={22}
                        color={C.ink}
                      />
                    </Pressable>

                    {open ? (
                      <View className="px-4 pb-3">
                        {exercises.map((item, index) => (
                          <View
                            key={item.id}
                            className={`flex-row items-center py-2.5 ${
                              index === exercises.length - 1
                                ? ""
                                : "border-b border-border"
                            }`}
                          >
                            <View className="h-6 w-6 items-center justify-center rounded-full bg-elevated">
                              <Txt
                                weight="bold"
                                className="text-[11px] text-muted"
                              >
                                {index + 1}
                              </Txt>
                            </View>

                            <Txt
                              className="ml-3 flex-1 text-[13px]"
                              numberOfLines={1}
                            >
                              {item.exercises.name}
                            </Txt>

                            <View className="ml-2 rounded-full bg-elevated px-2.5 py-1">
                              <Txt weight="bold" className="text-xs">
                                {item.sets} ×{" "}
                                {item.min_reps === item.max_reps
                                  ? item.min_reps
                                  : `${item.min_reps}–${item.max_reps}`}
                              </Txt>
                            </View>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </>
                ) : null}
              </View>
            );
          })}
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
          accessibilityLabel={saved ? "Program saved" : "Save program"}
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
                {saved ? "Saved to Train" : "Save program"}
              </Txt>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}