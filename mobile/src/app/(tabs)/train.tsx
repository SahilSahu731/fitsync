import { WorkoutSyncNotice } from "@/src/features/workouts/components/workout-sync-notice";
import { CoachHomeCard } from "@/src/features/coaching/home-card";
import { MotionPressable as Pressable, ScreenEntrance } from "@/src/components/motion";
import { ActiveProgramCard } from "@/src/features/program-follow/active-program-card";
import { useAppAlert } from "@/src/components/app-dialog";
import React, { useCallback, useState } from "react";

import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Share,
  View,
  useWindowDimensions,
} from "react-native";

import { useFocusEffect, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { C } from "@/src/constants/theme";
import { PageHeading, SectionHeading, Txt } from "@/src/components/ui";

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
import { RoutineCard } from "@/src/features/workouts/components/routine-card";

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
      className="min-w-0 flex-1 flex-row items-center gap-2 rounded-[18px] bg-panel p-3.5"
    >
      <MaterialCommunityIcons name={icon} size={20} color={C.ink} />
      <Txt weight="semibold" className="flex-1 text-[14px]">
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

// Drop-in replacement for ProgramCard in your Train screen.
// Imports needed in the screen:
//   import { ..., Image, StyleSheet, ... } from "react-native";

// Fixes the URL shapes that commonly fail to render on devices.
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
              onError={(event) => {
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
  const date = new Date(item.started_at);

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
  const Alert = useAppAlert();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();

  const { session, start, busy } = useWorkout();

  const { user } = useSession();
  const orderKey = `fitsync.train-order.v1.${user?.id ?? "signed-out"}`;
  const [menu, setMenu] = useState<MenuTarget | null>(null);
  const [renaming, setRenaming] = useState<WorkoutTemplate | null>(null);
  const [reordering, setReordering] = useState<"programs" | "routines" | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [programs, setPrograms] = useState<SavedProgram[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");

    const results = await Promise.allSettled([
      workoutApi.templates(),
      workoutApi.history(),
      catalogApi.myPrograms(),
      AsyncStorage.getItem(orderKey),
    ]);

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

      void load().finally(() => {
        if (active) setLoading(false);
      });

      return () => {
        active = false;
      };
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);

    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const handleStart = async (templateId?: string) => {
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

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <>
      <ScreenEntrance style={{ flex: 1 }}>
        <ScrollView
          className="flex-1 bg-bg"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={C.brand}
            />
          }
          contentContainerClassName="w-full max-w-2xl self-center px-6 pt-6 pb-48"
        >
          {/* Header */}

          <PageHeading
            eyebrow={today}
            title="Your next rep."
            subtitle="A little structure. A little room for real life."
          />
          <WorkoutSyncNotice />

          {/* Hero: resume or start */}

          {session ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/workout")}
              className="mb-4 rounded-[28px] bg-panel p-6"
            >
              <View className="flex-row items-center gap-2">
                <View className="h-1.5 w-1.5 rounded-full bg-brand" />
                <Txt weight="medium" className="text-[11px] tracking-[1px] text-muted">
                  WORKOUT IN PROGRESS
                </Txt>
              </View>
              <Txt
                weight="medium"
                numberOfLines={2}
                className="mt-5 text-2xl leading-8 tracking-[-0.7px]"
              >
                {session.name}
              </Txt>
              <View className="mt-6 flex-row items-center justify-between">
                <Txt className="text-xs text-muted">Right where you left it.</Txt>
                <View className="min-h-12 flex-row items-center gap-2 rounded-full bg-ink px-5">
                  <Txt weight="semibold" className="text-xs text-black">
                    Resume
                  </Txt>
                  <MaterialCommunityIcons name="play" size={18} color={C.bg} />
                </View>
              </View>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: busy, busy }}
              onPress={() => void handleStart()}
              disabled={busy}
              className="mb-4 overflow-hidden rounded-[28px] bg-ink p-7"
            >
              <View className="flex-row items-center justify-between">
                <Txt weight="medium" className="text-[11px] tracking-[1.5px] text-black/60">
                  MAKE TIME FOR YOU
                </Txt>
                <MaterialCommunityIcons name="dumbbell" size={25} color={C.bg} />
              </View>
              <Txt
                weight="medium"
                className="mt-6 text-[30px] leading-[37px] tracking-[-1px] text-black"
              >
                Start with{"\n"}the next set.
              </Txt>
              <Txt className="mt-4 max-w-xs text-sm leading-6 text-black/60">
                Begin a session and add your exercises as you go.
              </Txt>
              <View className="mt-6 flex-row items-center justify-between">
                <Txt weight="semibold" className="text-sm text-black">
                  Start a workout
                </Txt>
                {busy ? (
                  <ActivityIndicator color={C.bg} size="small" />
                ) : (
                  <View className="h-11 w-11 items-center justify-center rounded-full bg-black">
                    <MaterialCommunityIcons name="arrow-top-right" size={21} color={C.ink} />
                  </View>
                )}
              </View>
            </Pressable>
          )}

          {/* Quick actions */}

          <View className="mb-9 flex-row gap-3">
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

          <View className="mb-5">
            <SectionHeading title="Training with direction" />
            <CoachHomeCard />
            <ActiveProgramCard />
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

              <View className="mb-9">
                <SectionHeading
                  title="Programs"
                  action={programs.length ? "Find more" : undefined}
                  onAction={() => router.push("/explore")}
                />

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
              </View>

              {/* Routines */}

              <View className="mb-9">
                <SectionHeading title="Routines" />

                {templates.length === 0 ? (
                  <EmptyState
                    icon="dumbbell"
                    title="Your routine starts here."
                    description="Create your own workout or save one from Explore."
                    action="Create routine"
                    onPress={() => router.push("/workout/create")}
                  />
                ) : (
                  templates.map((template) => (
                    <RoutineCard
                      key={template.id}
                      template={template}
                      onStart={() => void handleStart(template.id)}
                      onOptions={() => {
                        if (!actionBusy) setMenu({ kind: "routine", item: template });
                      }}
                      disabled={busy || Boolean(session)}
                    />
                  ))
                )}
              </View>

              {/* History */}

              <View>
                <SectionHeading title="Recent workouts" />

                {history.length === 0 ? (
                  <EmptyState
                    icon="history"
                    title="A place for the work."
                    description="Finish a session and it will show up in your history."
                  />
                ) : (
                  history.slice(0, 10).map((item) => (
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
              </View>
            </>
          )}
        </ScrollView>
      </ScreenEntrance>
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
