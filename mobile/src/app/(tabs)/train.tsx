import { useAppAlert } from "@/src/components/app-dialog";
import React, { useCallback, useState } from "react";

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  View,
  useWindowDimensions,
} from "react-native";

import { useFocusEffect, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { C } from "@/src/constants/theme";
import { Txt } from "@/src/components/ui";

import {
  workoutApi,
  type WorkoutTemplate,
  type HistoryItem,
} from "@/src/features/workouts/api";

import { useWorkout } from "@/src/features/workouts/workout-context";

import {
  catalogApi,
  type SavedProgram,
} from "@/src/features/training-catalog/api";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSession } from "@/src/context/session";
import {
  TrainActions,
  RenameRoutine,
  ReorderTraining,
} from "@/src/features/workouts/components/train-actions";
import { Image } from "expo-image";

function ordered<T extends { id: string }>(rows: T[], ids: string[]) {
  const rank = new Map(ids.map((id, index) => [id, index]));
  return [...rows].sort(
    (a, b) => (rank.get(a.id) ?? ids.length) - (rank.get(b.id) ?? ids.length),
  );
}
type MenuTarget =
  | { kind: "routine"; item: WorkoutTemplate }
  | { kind: "program"; item: SavedProgram };
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

function formatDuration(seconds: number | null | undefined) {
  const minutes = Math.floor(Math.max(0, seconds ?? 0) / 60);

  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
}

function SectionHeading({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View className="mb-3 flex-row items-center justify-between">
      <Txt weight="bold" className="text-[20px]">
        {title}
      </Txt>

      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={12}>
          <Txt weight="semibold" className="text-sm text-blue-500 underline">
            {action}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

function Skeleton({ height }: { height: number }) {
  return (
    <View
      className="mb-3 rounded-[22px] bg-panel"
      style={{ height, opacity: 0.7 }}
    />
  );
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
      className="flex-row items-center w-1/2 gap-3 rounded-[18px] bg-panel p-4"
    >
      <MaterialCommunityIcons name={icon} size={22} color={"white"} />
      <Txt weight="semibold" className="text-lg">
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
    <View className="items-center rounded-[24px] border border-dashed border-border p-2">
      <View className="flex-row items-center mb-3 justify-between gap-2">
        <View className="items-center mt-4 justify-center rounded-2xl bg-panel">
          <Image
            source={require("../../../assets/images/no-program.png")}
            style={{ width: 120, height: 80, borderRadius: 30 }}
            contentFit="contain"
            onError={(error) => console.log("Image error:", error)}
          />
        </View>
        <View className="text-left w-1/2">
          <Txt weight="bold" className="mt-4 text-base">
            {title}
          </Txt>

          <Txt className="mt-1 text-center text-sm leading-5 text-muted">
            {description}
          </Txt>
        </View>
      </View>

      {action && onPress ? (
        <Pressable
          onPress={onPress}
          className="mt-5 mb-3 rounded-full bg-brand px-6 py-3"
        >
          <Txt weight="bold" className="text-sm text-bg">
            {action}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

// Drop-in replacement for ProgramCard in your Train screen.
// Imports needed in the screen:
//   import { ..., Image, Pressable, StyleSheet, ... } from "react-native";

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

        <View
          className="w-full overflow-hidden bg-brand/10"
          style={{ height: 140 }}
        >
          {showCover ? (
            <Image
              source={{ uri: uri as string }}
              resizeMode="cover"
              style={{ width: "100%", height: 140 }}
              onError={(event) => {
                console.warn(
                  "Program cover failed to load:",
                  uri,
                );
                setCoverFailed(true);
              }}
            />
          ) : (
            <View
              className="items-center justify-center"
            >
              <MaterialCommunityIcons
                name="calendar-check"
                size={64}
                color={C.brand}
                style={{ opacity: 0.35 }}
              />
            </View>
          )}

          {/* Soft shade so badges stay readable on any photo */}
          {showCover ? (
            <View
              pointerEvents="none"
            />
          ) : null}

          <View className="absolute left-3 right-3 top-3 flex-row items-center justify-between">
            <View className="flex-row items-center rounded-full bg-black/60 px-3 py-1.5">
              <MaterialCommunityIcons
                name="calendar-week"
                size={14}
                color="#FFFFFF"
              />

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
              <MaterialCommunityIcons
                name="dots-horizontal"
                size={20}
                color="#FFFFFF"
              />
            </Pressable>
          </View>
        </View>

        {/* Details */}

        <View className="px-4 pt-4">
          <Txt weight="bold" className="text-[19px] leading-6" numberOfLines={2}>
            {program.name}
          </Txt>

          <View className="mt-3 flex-row flex-wrap gap-2">
            <Pill>{program.level}</Pill>
            <Pill>{program.goal.replace(/_/g, " ")}</Pill>
          </View>
        </View>
      </View>

      <View className="mx-4 mb-4 mt-4 flex-row items-center justify-between border-t border-border pt-3">
        <View className="flex-row items-center">
          <MaterialCommunityIcons name="dumbbell" size={16} color={C.muted} />

          <Txt className="ml-1.5 text-xs text-muted">
            {count} {count === 1 ? "routine" : "routines"}
          </Txt>
        </View>

        <View className="flex-row items-center">
          <Txt weight="semibold" className="text-xs text-brand">
            View
          </Txt>

          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={C.brand}
          />
        </View>
      </View>
    </Pressable>
  );
}

function TemplateCard({
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
  const count = template.workout_template_exercises?.length ?? 0;

  return (
    <View className="mb-3 flex-row items-center rounded-[22px] border border-border bg-panel p-4">
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-elevated">
        <MaterialCommunityIcons name="dumbbell" size={23} color={C.brand} />
      </View>

      <View className="ml-3 flex-1">
        <Txt weight="bold" className="text-base" numberOfLines={1}>
          {template.name}
        </Txt>

        <Txt className="mt-0.5 text-xs text-muted">
          {count} {count === 1 ? "exercise" : "exercises"}
        </Txt>
      </View>

      <Pressable
        onPress={onOptions}
        hitSlop={10}
        accessibilityLabel="Routine options"
        className="mr-2 h-10 w-10 items-center justify-center"
      >
        <MaterialCommunityIcons
          name="dots-horizontal"
          size={22}
          color={C.muted}
        />
      </Pressable>

      <Pressable
        onPress={onStart}
        disabled={disabled}
        accessibilityLabel={`Start ${template.name}`}
        className={`h-11 w-11 items-center justify-center rounded-full ${
          disabled ? "bg-elevated" : "bg-brand"
        }`}
      >
        <MaterialCommunityIcons
          name="play"
          size={22}
          color={disabled ? C.muted : C.bg}
        />
      </Pressable>
    </View>
  );
}

function HistoryCard({
  item,
  onPress,
}: {
  item: HistoryItem;
  onPress: () => void;
}) {
  const date = new Date(item.started_at);

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-row items-center rounded-[22px] border border-border bg-panel p-4"
    >
      <View className="h-14 w-14 items-center justify-center rounded-2xl bg-elevated">
        <Txt weight="extra" className="text-lg leading-[22px]">
          {date.getDate()}
        </Txt>

        <Txt className="text-[11px] text-muted">
          {date.toLocaleDateString(undefined, { month: "short" })}
        </Txt>
      </View>

      <View className="ml-3 flex-1">
        <Txt weight="bold" className="text-[15px]" numberOfLines={1}>
          {item.name}
        </Txt>

        <View className="mt-1 flex-row items-center">
          <MaterialCommunityIcons
            name="clock-outline"
            size={14}
            color={C.muted}
          />

          <Txt className="ml-1 text-xs text-muted">
            {formatDuration(item.elapsed_seconds)}
          </Txt>
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
  const [reordering, setReordering] = useState<"programs" | "routines" | null>(
    null,
  );
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

    const [templatesResult, historyResult, programsResult, orderResult] =
      results;
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
            .map(
              (day) =>
                `Day ${day.day_number}: ${day.training_routines?.name ?? "Rest"}`,
            )
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
      Alert.alert(
        "Could not share",
        e instanceof Error ? e.message : "Please try again.",
      );
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
    programs.length > 1 ? Math.min(300, screenWidth * 0.78) : screenWidth - 40;

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <>
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
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 26,
          paddingBottom: 150,
        }}
      >
        {/* Header */}

        <View className="mb-2">
          <Txt className="text-sm text-muted">{today}</Txt>

          <Txt weight="semibold" className="mt-1 text-[36px] tracking-tight">
            Train
          </Txt>
        </View>

        {/* Hero: resume or start */}

        {session ? (
          <Pressable
            onPress={() => router.push("/workout")}
            className="mb-3 rounded-[28px] bg-brand/10 p-5"
          >
            <View className="flex-row items-center justify-between">
              <View>
                <View className="flex-row items-center">
                  <View className="h-2.5 w-2.5 rounded-full bg-green-500" />

                  <Txt
                    weight="semibold"
                    className="ml-2 text-xs text-green-500"
                  >
                    Workout in progress
                  </Txt>
                </View>
                <Txt
                  weight="bold"
                  className="mt-2 text-[23px]"
                  numberOfLines={1}
                >
                  {session.name}
                </Txt>
              </View>

              <View className="mt-5 flex-row items-center self-start rounded-full bg-white px-5 py-3">
                <MaterialCommunityIcons name="play" size={20} color={"black"} />

                <Txt weight="bold" className="ml-2 text-sm text-bg">
                  Resume
                </Txt>
              </View>
            </View>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => void handleStart()}
            disabled={busy}
            className="mb-3 flex-row items-center justify-between overflow-hidden rounded-[28px] bg-brand p-6"
          >
            <MaterialCommunityIcons
              name="dumbbell"
              size={170}
              color={C.bg}
              style={{
                position: "absolute",
                right: -28,
                bottom: -34,
                opacity: 0.12,
                transform: [{ rotate: "-18deg" }],
              }}
            />
            <View className="w-52">
              <Txt weight="bold" className="text-[22px] leading-8 text-bg">
                Start a workout!
              </Txt>

              <Txt className="mt-1 max-w-[230px] text-xs text-bg/75">
                Begin with an empty session and add exercises as you go.
              </Txt>
            </View>

            <View className="flex-row mt-3 items-center self-start rounded-full bg-bg px-5 py-3">
              {busy ? (
                <ActivityIndicator color={C.brand} size="small" />
              ) : (
                <MaterialCommunityIcons name="play" size={18} color={"white"} />
              )}

              <Txt weight="bold" className="ml-2 text-white">
                Start
              </Txt>
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

        {/* Error */}

        {Boolean(error) && !loading ? (
          <Pressable
            onPress={() => void onRefresh()}
            className="mb-6 flex-row items-center rounded-2xl border border-border bg-panel p-4"
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
                  title="Find your first program"
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
                  style={{ marginHorizontal: -20 }}
                  contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
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
                  title="No routines yet"
                  description="Create your own workout or save one from Explore."
                  action="Create routine"
                  onPress={() => router.push("/workout/create")}
                />
              ) : (
                templates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onStart={() => void handleStart(template.id)}
                    onOptions={() => {
                      if (!actionBusy)
                        setMenu({ kind: "routine", item: template });
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
                  title="Your first workout starts here"
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
      {actionBusy && (
        <View
          pointerEvents="auto"
          className="absolute inset-0 items-center justify-center bg-black/40"
        >
          <ActivityIndicator color={C.brand} />
        </View>
      )}
      {menu && (
        <TrainActions
          title={
            menu.kind === "routine"
              ? menu.item.name
              : menu.item.training_programs.name
          }
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
              run: () =>
                setReordering(
                  menu.kind === "routine" ? "routines" : "programs",
                ),
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
                menu.kind === "routine"
                  ? handleDelete(menu.item.id)
                  : deleteProgram(menu.item),
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
              rows.map((row) =>
                row.id === renaming.id ? { ...row, name } : row,
              ),
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
