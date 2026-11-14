import { TabScrollView } from "@/src/components/tab-bar-motion";
import { WorkoutSyncNotice } from "@/src/features/workouts/components/workout-sync-notice";
import { CoachHomeButton } from "@/src/features/coaching/home-card";
import { MotionPressable as Pressable, ScreenEntrance } from "@/src/components/motion";
import { ActiveProgramCard } from "@/src/features/program-follow/active-program-card";
import { useProgram } from "@/src/features/program-follow/program-context";
import { useAppAlert } from "@/src/components/app-dialog";
import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Share,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import { useFocusEffect, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { C } from "@/src/constants/theme";
import { PageHeading, Txt } from "@/src/components/ui";

import { workoutApi, type WorkoutTemplate, type HistoryItem } from "@/src/features/workouts/api";

import { useWorkout } from "@/src/features/workouts/workout-context";

import { catalogApi, type SavedProgram } from "@/src/features/training-catalog/api";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSession } from "@/src/context/session";
import {
  TrainActions,
  RenameRoutine,
  ReorderTraining,
} from "@/src/features/workouts/components/train-actions";
import { Image } from "expo-image";
import { TrainingSection } from "@/src/features/workouts/components/training-section";
import { trainingWeek, workoutSummary } from "@/src/features/workouts/summary";
import { RoutineCard } from "@/src/features/workouts/components/routine-card";
import { StartWorkoutDialog } from "@/src/features/workouts/components/start-workout-dialog";

function ordered<T extends { id: string }>(rows: T[], ids: string[]) {
  const rank = new Map(ids.map((id, index) => [id, index]));
  return [...rows].sort((a, b) => (rank.get(a.id) ?? ids.length) - (rank.get(b.id) ?? ids.length));
}
type MenuTarget =
  { kind: "routine"; item: WorkoutTemplate } | { kind: "program"; item: SavedProgram };
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

function formatDuration(seconds: number | null | undefined) {
  const minutes = Math.floor(Math.max(0, seconds ?? 0) / 60);

  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
}

function Skeleton({ height }: { height: number }) {
  return <View className="mb-3 rounded-[22px] bg-panel" style={{ height, opacity: 0.7 }} />;
}

function QuickTile({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      className="min-w-0 flex-1 flex-row items-center gap-2 rounded-[18px] bg-panel p-3.5"
    >
      <MaterialCommunityIcons name={icon} size={20} color={"white"} />
      <Txt weight="medium" className="flex-1 text-[14px]">
        {title}
      </Txt>

      {/* <Txt className="mt-0.5 text-xs text-muted">{subtitle}</Txt> */}
    </Pressable>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-full bg-elevated px-3 py-1.5">
      <Txt className="text-xs capitalize text-muted">{children}</Txt>
    </View>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
  onPress,
}: {
  icon: IconName;
  title: string;
  description: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View className="rounded-[28px] bg-panel p-6">
      <MaterialCommunityIcons name={icon} size={30} color={C.muted} />
      <Txt weight="medium" className="mt-6 text-xl leading-7 tracking-[-0.5px]">
        {title}
      </Txt>
      <Txt className="mt-3 max-w-sm text-sm leading-6 text-muted">{description}</Txt>
      {action && onPress && (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          className="mt-5 min-h-12 flex-row items-center justify-between rounded-full bg-elevated px-5"
        >
          <Txt weight="medium" className="text-xs">
            {action}
          </Txt>
          <MaterialCommunityIcons name="arrow-top-right" size={17} color={C.ink} />
        </Pressable>
      )}
    </View>
  );
}

function coverUri(url?: string | null) {
  const value = url?.trim();

  if (!value) return null;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("http://")) return value.replace("http://", "https://");

  return value;
}

function ProgramCard({
  item,
  width,
  onPress,
  onOptions,
}: {
  item: SavedProgram;
  width: number;
  onPress: () => void;
  onOptions: () => void;
}) {
  const [coverFailed, setCoverFailed] = useState(false);

  const program = item.training_programs;

  if (!program) return null;

  const count = item.user_saved_program_routines?.length ?? 0;
  const uri = coverUri(program.cover_url);
  const showCover = Boolean(uri) && !coverFailed;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${program.name}`}
      style={{ width }}
      className="justify-between overflow-hidden rounded-[26px] bg-panel"
    >
      <View>
        {/* Cover */}

        <View className="w-full overflow-hidden bg-white/5" style={{ height: 140 }}>
          {showCover ? (
            <Image
              source={{ uri: uri as string }}
              resizeMode="cover"
              style={{ width: "100%", height: 140 }}
              onError={() => {
                console.warn("Program cover failed to load:", uri);
                setCoverFailed(true);
              }}
            />
          ) : (
            <View className="items-center justify-center">
              <MaterialCommunityIcons
                name="calendar-check"
                size={64}
                color={C.ink}
                style={{ opacity: 0.35 }}
              />
            </View>
          )}

          {/* Soft shade so badges stay readable on any photo */}
          {showCover ? <View pointerEvents="none" /> : null}

          <View className="absolute left-3 right-3 top-3 flex-row items-center justify-between">
            <View className="flex-row items-center rounded-full bg-black/60 px-3 py-1.5">
              <MaterialCommunityIcons name="calendar-week" size={14} color="#FFFFFF" />

              <Txt weight="semibold" className="ml-1.5 text-xs text-white">
                {program.days_per_week} days a week
              </Txt>
            </View>

            <Pressable
              accessibilityLabel={`Options for ${program.name}`}
              accessibilityRole="button"
              hitSlop={8}
              onPress={(event) => {
                event.stopPropagation();
                onOptions();
              }}
              className="h-9 w-9 items-center justify-center rounded-full bg-black/60"
            >
              <MaterialCommunityIcons name="dots-horizontal" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* Details */}

        <View className="px-4 pt-4">
          <Txt weight="semibold" className="text-[19px] leading-6" numberOfLines={2}>
            {program.name}
          </Txt>

          <View className="mt-3 flex-row flex-wrap gap-2">
            <Pill>{program.level}</Pill>
            <Pill>{program.goal.replace(/_/g, " ")}</Pill>
          </View>
        </View>
      </View>

      <View className="mx-4 mb-4 mt-4 flex-row items-center justify-between pt-3">
        <View className="flex-row items-center">
          <MaterialCommunityIcons name="dumbbell" size={16} color={C.muted} />

          <Txt className="ml-1.5 text-xs text-muted">
            {count} {count === 1 ? "routine" : "routines"}
          </Txt>
        </View>

        <View className="flex-row items-center">
          <Txt weight="semibold" className="text-xs text-ink">
            View
          </Txt>

          <MaterialCommunityIcons name="chevron-right" size={20} color={C.ink} />
        </View>
      </View>
    </Pressable>
  );
}

function HistoryCard({ item, onPress }: { item: HistoryItem; onPress: () => void }) {
  const date = new Date(item.finished_at ?? item.started_at);

  return (
    <Pressable onPress={onPress} className="mb-3 flex-row items-center rounded-[22px] bg-panel p-4">
      <View className="h-14 w-14 items-center justify-center rounded-2xl bg-elevated">
        <Txt weight="semibold" className="text-lg text-ink leading-[22px]">
          {date.getDate()}
        </Txt>

        <Txt className="text-[11px] text-muted">
          {date.toLocaleDateString(undefined, { month: "short" })}
        </Txt>
      </View>

      <View className="ml-3 flex-1">
        <Txt weight="semibold" className="text-[15px]" numberOfLines={1}>
          {item.name}
        </Txt>

        <View className="mt-1 flex-row items-center">
          <MaterialCommunityIcons name="clock-outline" size={14} color={C.muted} />

          <Txt className="ml-1 text-xs text-muted">{formatDuration(item.elapsed_seconds)}</Txt>
        </View>
      </View>

      <MaterialCommunityIcons name="chevron-right" size={22} color={C.muted} />
    </Pressable>
  );
}

export default function TrainScreen() {
  const { user } = useSession();
  return <TrainAccountScreen key={user?.id ?? "signed-out"} />;
}

function TrainAccountScreen() {
  const Alert = useAppAlert();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();

  const {
    session,
    start,
    busy,
    loading: workoutLoading,
    pendingCompletion,
    completedWorkout,
    dataRevision,
    refresh: refreshWorkout,
  } = useWorkout();

  const {
    active: activeProgram,
    loading: programLoading,
    error: programError,
    refresh: refreshProgram,
  } = useProgram();

  const { user } = useSession();
  const orderKey = `fitsync.train-order.v1.${user?.id ?? "signed-out"}`;
  const [menu, setMenu] = useState<MenuTarget | null>(null);
  const [renaming, setRenaming] = useState<WorkoutTemplate | null>(null);
  const [reordering, setReordering] = useState<"programs" | "routines" | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [programs, setPrograms] = useState<SavedProgram[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [routineSearch, setRoutineSearch] = useState("");
  const [historyLimit, setHistoryLimit] = useState(5);
  const sequence = useRef(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const request = ++sequence.current;
    setError("");

    const results = await Promise.allSettled([
      workoutApi.templates(),
      workoutApi.history(),
      catalogApi.myPrograms(),
      AsyncStorage.getItem(orderKey),
    ]);

    if (request !== sequence.current) return;
    const [templatesResult, historyResult, programsResult, orderResult] = results;
    let savedOrder: { programs?: string[]; routines?: string[] } = {};
    if (orderResult.status === "fulfilled" && orderResult.value) {
      try {
        savedOrder = JSON.parse(orderResult.value) ?? {};
      } catch {
        /* Ignore corrupt local preferences. */
      }
    }

    if (templatesResult.status === "fulfilled") {
      setTemplates(
        ordered(
          templatesResult.value,
          Array.isArray(savedOrder.routines) ? savedOrder.routines : [],
        ),
      );
    }

    if (historyResult.status === "fulfilled") {
      setHistory(historyResult.value);
    }

    if (programsResult.status === "fulfilled") {
      setPrograms(
        ordered(
          programsResult.value,
          Array.isArray(savedOrder.programs) ? savedOrder.programs : [],
        ),
      );
    }

    if (results.some((result) => result.status === "rejected")) {
      setError("Some training data could not be loaded.");
    }
  }, [orderKey]);

  // Skeletons only on first load. Coming back to this tab refreshes quietly.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      void refreshWorkout().catch(() => {});
      void refreshProgram();
      void load().finally(() => {
        if (active) setLoading(false);
      });

      return () => {
        active = false;
      };
    }, [load, refreshWorkout, refreshProgram]),
  );

  useEffect(() => {
    if (dataRevision > 0) void Promise.resolve().then(load);
  }, [dataRevision, load]);

  const onRefresh = async () => {
    setRefreshing(true);

    try {
      await Promise.all([refreshWorkout().catch(() => {}), refreshProgram()]);
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const handleStart = async (templateId?: string) => {
    if (busy || workoutLoading || pendingCompletion) return;
    if (session) {
      router.push("/workout");
      return;
    }

    try {
      await start(templateId);
      router.push("/workout");
    } catch (err) {
      Alert.alert(
        "Could not start workout",
        err instanceof Error ? err.message : "Please try again.",
      );
    }
  };

  const handleDelete = (templateId: string) => {
    Alert.alert(
      "Delete routine?",
      "This removes the saved routine but keeps your workout history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setActionBusy(true);
            try {
              await workoutApi.deleteTemplate(templateId);

              await load();
            } catch {
              Alert.alert("Error", "Could not delete this routine.");
            } finally {
              setActionBusy(false);
            }
          },
        },
      ],
    );
  };

  const shareItem = async (target: MenuTarget) => {
    setActionBusy(true);
    try {
      if (target.kind === "program") {
        const p = await catalogApi.program(target.item.training_programs.id);
        await Share.share({
          title: p.name,
          message: `${p.name} — FitSync program\n${p.days_per_week} days/week · ${p.duration_weeks} weeks\n${p.description}\n\n${[
            ...p.training_program_days,
          ]
            .sort((a, b) => a.day_number - b.day_number)
            .map((day) => `Day ${day.day_number}: ${day.training_routines?.name ?? "Rest"}`)
            .join("\n")}`,
        });
      } else {
        const routine = await workoutApi.template(target.item.id);
        await Share.share({
          title: routine.name,
          message: `${routine.name} — FitSync routine\n${routine.description}\n\n${[
            ...routine.workout_template_exercises,
          ]
            .sort((a, b) => a.position - b.position)
            .map(
              (exercise, index) =>
                `${index + 1}. ${exercise.exercises?.name ?? "Exercise"} — ${exercise.workout_template_sets?.length ?? 0} sets`,
            )
            .join("\n")}`,
        });
      }
    } catch (e) {
      Alert.alert("Could not share", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setActionBusy(false);
    }
  };
  const deleteProgram = (item: SavedProgram) =>
    Alert.alert(
      "Delete saved program?",
      "This removes the program and its copied routines from your library. Completed workout history is kept.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setActionBusy(true);
            try {
              await catalogApi.deleteSavedProgram(item.id);
              await load();
            } catch (e) {
              Alert.alert(
                "Could not delete program",
                e instanceof Error ? e.message : "Please try again.",
              );
              await load();
            } finally {
              setActionBusy(false);
            }
          },
        },
      ],
    );
  const saveOrder = async (ids: string[]) => {
    if (!reordering) return;
    const data = {
      routines: templates.map((row) => row.id),
      programs: programs.map((row) => row.id),
      [reordering]: ids,
    };
    await AsyncStorage.setItem(orderKey, JSON.stringify(data));
    if (reordering === "routines") setTemplates((rows) => ordered(rows, ids));
    else setPrograms((rows) => ordered(rows, ids));
  };

  const programWidth =
    programs.length > 1
      ? Math.min(300, (Math.min(screenWidth, 672) - 48) * 0.9)
      : Math.min(screenWidth, 672) - 48;

  const visibleHistory =
    completedWorkout && !history.some((item) => item.id === completedWorkout.id)
      ? [
          {
            id: completedWorkout.id,
            name: completedWorkout.name,
            started_at: completedWorkout.started_at,
            finished_at: completedWorkout.finished_at!,
            elapsed_seconds: completedWorkout.elapsed_seconds ?? 0,
          },
          ...history,
        ]
      : history;
  const week = trainingWeek(visibleHistory);
  const activeSummary = workoutSummary(session);
  const startDisabled = busy || workoutLoading || pendingCompletion;
  const matchingTemplates = templates.filter((item) =>
    item.name.toLowerCase().includes(routineSearch.trim().toLowerCase()),
  );
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <>
      <ScreenEntrance style={{ flex: 1 }}>
        <TabScrollView
          className="flex-1 bg-bg"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={C.brand}
            />
          }
          contentContainerClassName="w-full max-w-2xl self-center px-6 pt-2 pb-48"
        >
          {/* Header */}

          <PageHeading eyebrow={today} title="Let's train." subtitle="Your session, your pace." />
          <WorkoutSyncNotice />
          <CoachHomeButton />
          {!loading && !error && (
            <View className="mb-3">
              <View className="mb-2 flex-row gap-1.5">
                <MaterialCommunityIcons
                  name="update"
                  size={14}
                  color={"white"}
                  accessible={false}
                />
                <Txt weight="medium" className="text-[10px]">
                  This Week
                </Txt>
              </View>
              <View className="flex-row gap-2">
                {[
                  {
                    value: week.workouts,
                    label: "Workouts",
                    icon: "dumbbell" as const,
                    color: "#C5F460",
                    background: "#171D10",
                  },
                  {
                    value: week.minutes,
                    label: "Minutes",
                    icon: "timer-outline" as const,
                    color: "#7DCFFF",
                    background: "#101B24",
                  },
                  {
                    value: week.days,
                    label: "Active days",
                    icon: "calendar-check-outline" as const,
                    color: "#FFB38A",
                    background: "#211812",
                  },
                ].map((stat, index) => (
                  <ScreenEntrance
                    key={stat.label}
                    delay={80 + index * 80}
                    style={{ flex: 1, minWidth: 0 }}
                  >
                    <View
                      accessible
                      accessibilityLabel={`${stat.value} ${stat.label.toLowerCase()} this week`}
                      className="overflow-hidden rounded-[22px] border p-3"
                      style={{
                        backgroundColor: stat.background,
                      }}
                    >
                      <View className="flex-row items-center gap-2">
                        <View
                          className="rounded-xl"
                          style={{
                            shadowColor: stat.color,
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.18,
                            shadowRadius: 8,
                          }}
                        >
                          <MaterialCommunityIcons
                            name={stat.icon}
                            size={18}
                            color={stat.color}
                            accessible={false}
                          />
                        </View>
                        <Txt
                          weight="semibold"
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.65}
                          className="text-[20px] leading-[34px]"
                          style={{ color: stat.color }}
                        >
                          {stat.value}
                        </Txt>
                      </View>
                      <Txt
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                        className="mt-0.5 text-[9px] leading-4 text-white/70"
                      >
                        {stat.label}
                      </Txt>
                    </View>
                  </ScreenEntrance>
                ))}
              </View>
            </View>
          )}

          {/* Hero: active session, active program, or start */}

          {session ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/workout")}
              className="mb-3 overflow-hidden bg-[#1c4565] rounded-3xl border p-4"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2 rounded-full bg-white/5 px-3 py-1.5">
                  <View className=" items-center justify-center rounded-full bg-brand/30">
                    <View className="h-1.5 w-1.5 rounded-full bg-green-400" />
                  </View>
                  <Txt weight="medium" className="text-[10px] text-green-500">
                    In Progress
                  </Txt>
                </View>
                <Txt weight="medium" className="text-xs text-muted">
                  {activeSummary.totalSets > 0
                    ? Math.round((activeSummary.completedSets / activeSummary.totalSets) * 100)
                    : 0}
                  %
                </Txt>
              </View>

              <View className="flex-row items-center justify-between">
                <Txt
                  weight="medium"
                  numberOfLines={2}
                  className="mt-2 text-[28px] leading-[34px] tracking-[-1px]"
                >
                  {session.name}
                </Txt>

                <View className="mt-4 ml-1 flex-row gap-8">
                  <View>
                    <Txt weight="medium" className="text-lg tracking-[-0.5px]">
                      {activeSummary.completedSets}
                      <Txt className="text-base text-muted">/{activeSummary.totalSets}</Txt>
                    </Txt>
                    <Txt className="mt-0.5 text-[9px] text-muted">Sets done</Txt>
                  </View>
                  <View>
                    <Txt weight="medium" className="text-lg tracking-[-0.5px]">
                      {activeSummary.exercises}
                    </Txt>
                    <Txt className="mt-0.5 text-[9px] text-muted">Exercises</Txt>
                  </View>
                </View>
              </View>

              <View className="mt-5 flex-row gap-1">
                {Array.from({ length: Math.min(Math.max(activeSummary.totalSets, 1), 24) }).map(
                  (_, i) => (
                    <View
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${
                        i < Math.min(activeSummary.completedSets, 24) ? "bg-brand" : "bg-white/10"
                      }`}
                    />
                  ),
                )}
              </View>

              <View className="mt-6 min-h-14 flex-row items-center justify-between rounded-full bg-ink pl-6 pr-2">
                <Txt weight="semibold" className="text-sm text-black">
                  Resume workout
                </Txt>
                <View className="h-10 w-10 items-center justify-center rounded-full bg-black">
                  <MaterialCommunityIcons name="play" size={20} color={C.ink} />
                </View>
              </View>
            </Pressable>
          ) : workoutLoading ? (
            <Skeleton height={170} />
          ) : activeProgram || programLoading || programError ? (
            <ActiveProgramCard hideEmpty />
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: startDisabled, busy: busy || workoutLoading }}
              onPress={() => setShowStartDialog(true)}
              disabled={startDisabled}
              className={`mb-3 overflow-hidden rounded-3xl bg-ink p-4 ${startDisabled ? "opacity-60" : ""}`}
            >
              <View pointerEvents="none" className="absolute -right-6 -top-4 opacity-[0.07]">
                <MaterialCommunityIcons
                  name="dumbbell"
                  size={190}
                  color="#000"
                  style={{ transform: [{ rotate: "-24deg" }] }}
                />
              </View>

              <View className="self-start rounded-full bg-black/10 px-3 py-1.5">
                <Txt weight="medium" className="text-[12px] text-black/70">
                  Ready when you are
                </Txt>
              </View>

              <Txt
                weight="medium"
                className="mt-2 text-[34px] leading-[38px] tracking-[-1.5px] text-black"
              >
                Start a workout
              </Txt>
              <Txt className="mt-1 ml-1 max-w-[260px] text-sm leading-5 text-black/60">
                Pick exercises as you go, or open a saved routine below.
              </Txt>

              <View className="mt-5 min-h-14 flex-row items-center justify-between rounded-full bg-black pl-6 pr-2">
                <Txt weight="semibold" className="text-sm text-white">
                  {pendingCompletion
                    ? "Waiting for workout sync"
                    : workoutLoading
                      ? "Restoring your workout…"
                      : "Start empty workout"}
                </Txt>
                <View className="h-10 w-10 items-center justify-center rounded-full bg-brand">
                  {busy || workoutLoading ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <MaterialCommunityIcons name="play-speed" size={24} color="#000" />
                  )}
                </View>
              </View>
            </Pressable>
          )}

          {/* Quick actions */}

          <View className="mb-6 flex-row gap-3">
            <QuickTile
              icon="animation"
              title="Explore"
              subtitle="Programs and routines"
              onPress={() => router.push("/explore")}
            />

            <QuickTile
              icon="plus"
              title="New routine"
              subtitle="Build your own"
              onPress={() => router.push("/workout/create")}
            />
          </View>

          {/* Error */}

          {Boolean(error) && !loading ? (
            <Pressable
              onPress={() => void onRefresh()}
              className="mb-6 flex-row items-center rounded-2xl bg-panel p-4"
            >
              <MaterialCommunityIcons name="cloud-off-outline" size={22} color={C.muted} />

              <Txt className="ml-3 flex-1 text-sm text-muted">{error} Tap to try again.</Txt>
            </Pressable>
          ) : null}

          {/* Loading skeletons */}

          {loading ? (
            <View>
              <Skeleton height={170} />
              <Skeleton height={80} />
              <Skeleton height={80} />
            </View>
          ) : (
            <>
              {/* Programs */}

              <TrainingSection
                key={`programs-${user?.id}`}
                title="Saved Programs"
                count={programs.length}
                icon="calendar-week"
                accent="#7DCFFF"
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push("/explore/programs")}
                  className="mb-3 min-h-11 flex-row items-center justify-between px-1"
                >
                  <Txt className="text-sm text-muted">Find a program</Txt>
                  <MaterialCommunityIcons name="plus" size={20} color={C.ink} />
                </Pressable>

                {programs.length === 0 ? (
                  <EmptyState
                    icon="calendar-check-outline"
                    title="Find your rhythm."
                    description="Pick a plan that matches your goals and schedule."
                    action="Explore programs"
                    onPress={() => router.push("/explore")}
                  />
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    decelerationRate="fast"
                    snapToInterval={programWidth + 12}
                    className="-mx-6"
                    contentContainerClassName="gap-3 px-6"
                  >
                    {programs.map((item) => (
                      <ProgramCard
                        key={item.id}
                        item={item}
                        width={programWidth}
                        onOptions={() => {
                          if (!actionBusy) setMenu({ kind: "program", item });
                        }}
                        onPress={() => {
                          if (!item.training_programs?.id) return;

                          router.push({
                            pathname: "/explore/programs/[id]",
                            params: { id: item.training_programs.id },
                          });
                        }}
                      />
                    ))}
                  </ScrollView>
                )}
              </TrainingSection>

              {/* Routines */}

              <TrainingSection
                key={`routines-${user?.id}`}
                title="Saved Routines"
                count={templates.length}
                icon="dumbbell"
              >
                {templates.length > 0 && (
                  <View className="mb-4 flex-row items-center gap-2 rounded-2xl bg-panel px-4">
                    <MaterialCommunityIcons name="magnify" size={20} color={C.muted} />
                    <TextInput
                      accessibilityLabel="Search saved routines"
                      value={routineSearch}
                      onChangeText={setRoutineSearch}
                      placeholder="Search routines"
                      placeholderTextColor={C.muted}
                      className="min-h-12 flex-1 font-poppins-regular text-ink"
                    />
                    {!!routineSearch && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Clear routine search"
                        onPress={() => setRoutineSearch("")}
                        className="h-11 w-11 items-center justify-center"
                      >
                        <MaterialCommunityIcons name="close" size={18} color={C.muted} />
                      </Pressable>
                    )}
                  </View>
                )}

                {templates.length === 0 ? (
                  <EmptyState
                    icon="dumbbell"
                    title="Your routine starts here."
                    description="Create your own workout or save one from Explore."
                    action="Create routine"
                    onPress={() => router.push("/workout/create")}
                  />
                ) : (
                  matchingTemplates.map((template) => (
                    <RoutineCard
                      key={template.id}
                      template={template}
                      onStart={() => void handleStart(template.id)}
                      onOptions={() => {
                        if (!actionBusy) setMenu({ kind: "routine", item: template });
                      }}
                      disabled={startDisabled || Boolean(session)}
                    />
                  ))
                )}
                {templates.length > 0 && matchingTemplates.length === 0 && (
                  <Txt className="px-2 py-5 text-sm text-muted">
                    No routines match “{routineSearch}”.
                  </Txt>
                )}
              </TrainingSection>

              {/* History */}

              <TrainingSection
                key={`history-${user?.id}`}
                title="Recent workouts"
                count={visibleHistory.length}
                icon="history"
                accent="#FFB38A"
              >
                {visibleHistory.length === 0 ? (
                  <EmptyState
                    icon="history"
                    title="A place for the work."
                    description="Finish a session and it will show up in your history."
                  />
                ) : (
                  visibleHistory.slice(0, historyLimit).map((item) => (
                    <HistoryCard
                      key={item.id}
                      item={item}
                      onPress={() =>
                        router.push({
                          pathname: "/workout/history/[id]",
                          params: { id: item.id },
                        })
                      }
                    />
                  ))
                )}
                {visibleHistory.length > historyLimit && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setHistoryLimit((value) => value + 10)}
                    className="min-h-12 items-center justify-center rounded-2xl bg-panel"
                  >
                    <Txt weight="medium" className="text-sm">
                      Show more workouts ({visibleHistory.length - historyLimit})
                    </Txt>
                  </Pressable>
                )}
              </TrainingSection>
            </>
          )}
        </TabScrollView>
      </ScreenEntrance>
      {showStartDialog && (
        <StartWorkoutDialog
          disabled={startDisabled}
          onStart={start}
          onStarted={() => {
            setShowStartDialog(false);
            router.push("/workout");
          }}
          onClose={() => setShowStartDialog(false)}
        />
      )}
      {actionBusy && (
        <View
          pointerEvents="auto"
          className="absolute inset-0 items-center justify-center bg-black/40"
        >
          <ActivityIndicator color={C.ink} />
        </View>
      )}
      {menu && (
        <TrainActions
          title={menu.kind === "routine" ? menu.item.name : menu.item.training_programs.name}
          onClose={() => setMenu(null)}
          actions={[
            ...(menu.kind === "routine" && menu.item.can_rename
              ? [
                  {
                    label: "Rename routine",
                    icon: "pencil-outline" as const,
                    run: () => setRenaming(menu.item as WorkoutTemplate),
                  },
                ]
              : []),
            {
              label: "Reorder",
              icon: "sort",
              run: () => setReordering(menu.kind === "routine" ? "routines" : "programs"),
            },
            {
              label: "Share",
              icon: "share-variant-outline",
              run: () => void shareItem(menu),
            },
            {
              label: "Delete",
              icon: "trash-can-outline",
              danger: true,
              run: () =>
                menu.kind === "routine" ? handleDelete(menu.item.id) : deleteProgram(menu.item),
            },
          ]}
        />
      )}
      {renaming && (
        <RenameRoutine
          name={renaming.name}
          onClose={() => setRenaming(null)}
          onSave={async (name) => {
            await workoutApi.renameTemplate(renaming.id, name);
            setTemplates((rows) =>
              rows.map((row) => (row.id === renaming.id ? { ...row, name } : row)),
            );
          }}
        />
      )}
      {reordering && (
        <ReorderTraining
          title={reordering}
          items={
            reordering === "routines"
              ? templates
              : programs.map((row) => ({
                  id: row.id,
                  name: row.training_programs.name,
                }))
          }
          onClose={() => setReordering(null)}
          onSave={saveOrder}
        />
      )}
    </>
  );
}
