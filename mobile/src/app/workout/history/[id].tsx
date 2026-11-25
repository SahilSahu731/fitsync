import { useSession } from "@/src/context/session";
import { fromKg, weightText } from "@/src/lib/weight";
import { useProgress } from "@/src/features/progress/use-progress";
import { useBilling } from "@/src/features/billing/billing-context";
import { WorkoutUpgradeMoment } from "@/src/features/billing/experience-moments";
import {
  workoutRecords,
  recordValue,
  workoutShareText,
} from "@/src/features/workouts/achievements";
import {
  claimReviewInvitation,
  prepareReviewPreference,
} from "@/src/features/experience/review-prompt";
import { reachedReviewMilestone } from "@/src/features/experience/review-model";
import { useAppAlert } from "@/src/components/app-dialog";
import { trackEvent } from "@/src/services/telemetry";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ActivityIndicator, Pressable, ScrollView, Share, View } from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";

import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useWorkout } from "@/src/features/workouts/workout-context";
import { workingSetVolume } from "@/src/features/workouts/summary";
import { setAppearance } from "@/src/features/workouts/set-types";
import { WorkoutSyncNotice } from "@/src/features/workouts/components/workout-sync-notice";
import { C } from "@/src/constants/theme";
import { Txt } from "@/src/components/ui";

import { workoutApi, type WorkoutSession } from "@/src/features/workouts/api";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const GREEN = "#B8B8B8";
const BLUE = "#9C9C9C";
const GOLD = "#C9C9C9";

function formatDuration(seconds: number | null | undefined) {
  const total = Math.max(0, seconds ?? 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${minutes}m`;
}

function formatVolume(kg: number, unit: "kg" | "lb") {
  const rounded = Math.round(fromKg(kg, unit));
  return `${rounded.toLocaleString()} ${unit}`;
}

function StatTile({
  icon,
  color,
  label,
  value,
}: {
  icon: IconName;
  color: string;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-1 rounded-[20px] bg-panel p-4">
      <View
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: `${color}26` }}
      >
        <MaterialCommunityIcons name={icon} size={19} color={color} />
      </View>

      <Txt weight="semibold" className="mt-3 text-xl" numberOfLines={1}>
        {value}
      </Txt>

      <Txt className="mt-0.5 text-[11px] tracking-wider text-muted">{label}</Txt>
    </View>
  );
}

export default function WorkoutHistoryDetail() {
  const router = useRouter();
  const { inviteReview } = useAppAlert();
  const { id, celebrate } = useLocalSearchParams<{ id: string; celebrate?: string }>();
  const { settings } = useSession();
  const unit = settings?.weightUnit ?? "kg";
  const progress = useProgress();
  const { isPro } = useBilling();
  const [shareError, setShareError] = useState("");
  const seen = useRef(false);

  const { completedWorkout, pendingCompletion, dataRevision } = useWorkout();
  const [attempt, setAttempt] = useState(0);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [error, setError] = useState(false);

  const localSession = completedWorkout?.id === id ? completedWorkout : null;
  const displayedSession = localSession ?? (session?.id === id ? session : null);
  const hasLocalSession = !!localSession;
  const records = useMemo(
    () =>
      displayedSession && !progress.loading && !progress.workoutError
        ? workoutRecords(displayedSession, progress.journal.workouts)
        : [],
    [displayedSession, progress.loading, progress.workoutError, progress.journal.workouts],
  );
  useEffect(() => {
    if (celebrate === "1" && displayedSession && !seen.current) {
      seen.current = true;
      trackEvent("workout_summary_viewed");
    }
  }, [celebrate, displayedSession]);
  useEffect(() => {
    if (celebrate === "1") void prepareReviewPreference();
  }, [celebrate]);
  const done = () => {
    router.replace("/(tabs)/train");
    if (
      celebrate === "1" &&
      displayedSession &&
      !pendingCompletion &&
      !progress.loading &&
      !progress.storageError &&
      reachedReviewMilestone(displayedSession, progress.journal.workouts, Date.now()) &&
      claimReviewInvitation()
    )
      inviteReview();
  };
  const share = async () => {
    if (!displayedSession) return;
    setShareError("");
    try {
      trackEvent("workout_share_opened");
      const result = await Share.share({
        message: workoutShareText(displayedSession, records.length),
      });
      if (result.action === Share.sharedAction) trackEvent("workout_share_completed");
    } catch {
      setShareError("Could not open sharing. Please try again.");
    }
  };
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  useEffect(() => {
    if (!id) return;
    let active = true;
    void workoutApi
      .session(id)
      .then((value) => {
        if (active && value.status === "completed") {
          setError(false);
          setSession(value);
        } else if (active && !hasLocalSession) setError(true);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [id, dataRevision, pendingCompletion, attempt, hasLocalSession]);

  const { exercises, stats } = useMemo(() => {
    const rows = [...(displayedSession?.workout_session_exercises ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((exercise) => {
        const sets = [...exercise.workout_logged_sets]
          .filter((set) => Boolean(set.completed_at))
          .sort((a, b) => a.position - b.position);

        const volume = sets.reduce(
          (total, set) => total + workingSetVolume(set, exercise.tracking_type),
          0,
        );

        // Best set = highest weight × reps (only if there is any weight)
        let bestId: string | null = null;
        let bestScore = 0;
        for (const set of sets) {
          const score = workingSetVolume(set, exercise.tracking_type);
          if (score > bestScore) {
            bestScore = score;
            bestId = set.id;
          }
        }

        return { exercise, sets, volume, bestId };
      })
      // Hide exercises where nothing was completed
      .filter((row) => row.sets.length > 0);

    return {
      exercises: rows,
      stats: {
        exercises: rows.length,
        sets: rows.reduce((total, row) => total + row.sets.length, 0),
        volume: rows.reduce((total, row) => total + row.volume, 0),
      },
    };
  }, [displayedSession]);

  if (error && !displayedSession) {
    return (
      <View className="flex-1 items-center justify-center bg-bg px-8">
        <MaterialCommunityIcons name="cloud-off-outline" size={44} color={C.muted} />
        <Txt weight="semibold" className="mt-4 text-lg">
          Could not load workout
        </Txt>
        <Pressable onPress={retry} className="mt-5 rounded-full bg-ink px-6 py-3">
          <Txt weight="semibold" className="text-bg">
            Try again
          </Txt>
        </Pressable>
      </View>
    );
  }

  if (!displayedSession) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color={C.ink} />
      </View>
    );
  }

  const workout = displayedSession;
  const started = new Date(workout.started_at);

  return (
    <ScrollView
      className="flex-1 bg-bg"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 22, paddingBottom: 80 }}
    >
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/train"))}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        className="mb-6 h-11 w-11 items-center justify-center rounded-full bg-panel"
      >
        <MaterialCommunityIcons name="arrow-left" size={24} color={C.ink} />
      </Pressable>

      {pendingCompletion && localSession && <WorkoutSyncNotice />}
      {/* Header */}
      <View className="overflow-hidden rounded-[28px] bg-white/5 p-6">
        <MaterialCommunityIcons
          name="trophy"
          size={150}
          color={C.ink}
          style={{
            position: "absolute",
            right: -20,
            top: -14,
            opacity: 0.12,
            transform: [{ rotate: "12deg" }],
          }}
        />

        <View className="flex-row items-center self-start rounded-full bg-ink/15 px-3 py-1.5">
          <MaterialCommunityIcons name="check-circle" size={14} color={GREEN} />
          <Txt weight="semibold" className="ml-1.5 text-xs text-green-400">
            {pendingCompletion && localSession ? "Saved on this device" : "Workout complete"}
          </Txt>
        </View>

        <Txt weight="semibold" className="mt-4 text-[32px] leading-10">
          {workout.name}
        </Txt>

        <View className="mt-3 flex-row flex-wrap items-center">
          <MaterialCommunityIcons name="calendar-month-outline" size={18} color={C.muted} />
          <Txt className="ml-1.5 text-lg text-white">
            {started.toLocaleDateString(undefined, {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Txt>

          <MaterialCommunityIcons
            name="clock-outline"
            size={18}
            color={C.muted}
            style={{ marginLeft: 10, width: 20 }}
          />
          <Txt className="ml-1.5 text-lg text-ink">
            {started.toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })}
          </Txt>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={done}
        className="mt-4 min-h-12 items-center justify-center rounded-full bg-ink"
      >
        <Txt weight="semibold" className="text-sm text-bg">
          {celebrate === "1" ? "Done · Back to Train" : "Back to Train"}
        </Txt>
      </Pressable>
      {/* Stats */}
      <View className="my-4 flex-row gap-3">
        <StatTile
          icon="timer-outline"
          color={C.ink}
          label="DURATION"
          value={formatDuration(workout.elapsed_seconds)}
        />
        <StatTile
          icon="layers-triple-outline"
          color={BLUE}
          label="LOGGED SETS"
          value={String(stats.sets)}
        />
        <StatTile
          icon="weight-kilogram"
          color={GREEN}
          label="WORKING VOLUME"
          value={formatVolume(stats.volume, unit)}
        />
      </View>

      {celebrate === "1" && (
        <View className="mb-5 rounded-3xl border border-brand/25 bg-brand/5 p-5">
          <MaterialCommunityIcons
            name={records.length ? "trophy-outline" : "check-decagram-outline"}
            size={34}
            color={C.brand}
          />
          <Txt accessibilityRole="header" weight="semibold" className="mt-3 text-2xl">
            {records.length
              ? `${records.length} personal best${records.length === 1 ? "" : "s"}!`
              : "You showed up. It counts."}
          </Txt>
          <Txt className="mt-2 text-sm leading-6 text-muted">
            {pendingCompletion
              ? "Saved on this device. Your workout will sync when you’re back online."
              : "Workout saved. Give yourself credit for the work you put in."}
          </Txt>
          {records.map((record, i) => (
            <View key={i} className="mt-4">
              <Txt weight="semibold">
                {record.exercise} · {recordValue(record, unit)}
              </Txt>
              <Txt className="mt-1 text-xs text-muted">{record.label}</Txt>
            </View>
          ))}
          {!!records.length && (
            <Txt className="mt-3 text-xs leading-5 text-muted">
              Compared with your available saved history. Normal working sets only.
            </Txt>
          )}
          <Txt className="mt-4 text-xs text-muted">
            Share duration, set count and personal-best count. Your notes and measurements stay
            private.
          </Txt>
          <Pressable
            accessibilityRole="button"
            onPress={() => void share()}
            className="mt-3 min-h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-brand"
          >
            <MaterialCommunityIcons name="share-variant-outline" size={20} color={C.bg} />
            <Txt weight="semibold" className="text-bg">
              Share workout
            </Txt>
          </Pressable>
          {!!shareError && (
            <Txt accessibilityLiveRegion="polite" className="mt-2 text-xs text-muted">
              {shareError}
            </Txt>
          )}
        </View>
      )}
      {celebrate === "1" && !isPro && (
        <WorkoutUpgradeMoment
          workout={workout}
          history={progress.journal.workouts}
          ready={
            !pendingCompletion &&
            !progress.loading &&
            !progress.refreshing &&
            !progress.workoutError &&
            !progress.storageError
          }
        />
      )}
      {celebrate === "1" && isPro && (
        <View className="mb-5 rounded-2xl bg-panel p-5">
          <Txt weight="semibold">Make your next session easier</Txt>
          <Txt className="mt-2 text-sm leading-6 text-muted">
            {isPro
              ? "Review your next working-set targets, then build your warm-up and plate setup with Pro tools."
              : "Your previous sets and logging stay free. Pro adds a structured plan, deeper muscle insights and warm-up tools from day one."}
          </Txt>
          <Pressable
            accessibilityRole="button"
            className="mt-3 min-h-12 justify-center"
            onPress={() => {
              trackEvent("pro_preview_opened", {
                source: "workout_summary",
                membership: isPro ? "pro" : "free",
              });
              router.push(
                isPro ? "/pro" : { pathname: "/pro", params: { source: "workout_summary" } },
              );
            }}
          >
            <Txt weight="semibold" className="text-brand">
              {isPro ? "Open Pro workspace" : "See what Pro adds"} →
            </Txt>
          </Pressable>
        </View>
      )}
      {!!workout.notes && (
        <View className="mb-5 rounded-2xl bg-panel p-4">
          <Txt weight="semibold">Workout notes</Txt>
          <Txt className="mt-2 text-muted">{workout.notes}</Txt>
        </View>
      )}
      {/* Exercises */}
      <View className="mb-3 mt-3 flex-row items-center justify-between">
        <Txt weight="semibold" className="text-[20px]">
          Exercises
        </Txt>
        <Txt className="text-sm text-muted">{stats.exercises} done</Txt>
      </View>

      {exercises.length === 0 ? (
        <View className="items-center rounded-[22px] p-8">
          <MaterialCommunityIcons name="dumbbell" size={34} color={C.muted} />
          <Txt className="mt-3 text-sm text-muted">
            No completed sets were logged in this workout.
          </Txt>
        </View>
      ) : (
        exercises.map(({ exercise, sets, volume, bestId }, exerciseIndex) => {
          let working = 0;

          return (
            <View key={exercise.id} className="mb-4 overflow-hidden rounded-[22px] bg-panel">
              {/* Exercise header */}
              <View className="flex-row items-center p-4">
                <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                  <Txt weight="semibold" className="text-ink">
                    {exerciseIndex + 1}
                  </Txt>
                </View>

                <View className="ml-3 flex-1">
                  <Txt weight="semibold" className="text-[16px]" numberOfLines={2}>
                    {exercise.exercise_name}
                  </Txt>
                  <Txt className="mt-0.5 text-xs text-muted">
                    {sets.length} {sets.length === 1 ? "set" : "sets"}
                    {volume > 0 ? ` · ${formatVolume(volume, unit)}` : ""}
                  </Txt>
                </View>
              </View>

              {/* Column labels */}
              <View className="flex-row bg-elevated/60 px-4 py-2">
                <Txt className="w-24 text-[11px] tracking-wider text-muted">SET</Txt>
                <Txt className="flex-1 text-right text-[11px] tracking-wider text-muted">
                  LOGGED PERFORMANCE
                </Txt>
              </View>

              {/* Sets */}
              {sets.map((set, index) => {
                const type = set.set_type ?? "normal";
                const style = setAppearance(type);
                if (type === "normal") working += 1;
                const isBest = set.id === bestId && sets.length > 1;

                return (
                  <View
                    key={set.id}
                    className={`flex-row items-center px-4 py-3 ${
                      index === sets.length - 1 ? "" : " "
                    }`}
                  >
                    <View className="w-24 flex-row items-center">
                      <View
                        className="h-7 min-w-[28px] items-center justify-center rounded-lg px-1.5"
                        style={{ backgroundColor: `${style.color}26` }}
                      >
                        <Txt weight="semibold" className="text-xs" style={{ color: style.color }}>
                          {type === "normal" ? working : style.label.charAt(0)}
                        </Txt>
                      </View>

                      {type !== "normal" ? (
                        <Txt className="ml-2 text-xs" style={{ color: style.color }}>
                          {style.label}
                        </Txt>
                      ) : null}
                    </View>

                    <View className="flex-1 flex-row items-center justify-end">
                      {isBest ? (
                        <MaterialCommunityIcons
                          name="trophy"
                          size={16}
                          color={GOLD}
                          style={{ marginRight: 8 }}
                        />
                      ) : null}

                      <View className="flex-1 items-end">
                        <Txt weight="semibold" className="text-[15px]">
                          {exercise.tracking_type === "duration"
                            ? `${set.duration_seconds ?? "—"} sec`
                            : exercise.tracking_type === "distance_duration"
                              ? `${set.distance_meters ?? "—"} m · ${set.duration_seconds ?? "—"} sec`
                              : exercise.tracking_type === "reps"
                                ? `${set.reps ?? "—"} reps${set.weight_kg ? ` · +${weightText(set.weight_kg, unit)} ${unit}` : ""}`
                                : `${set.weight_kg == null ? "—" : weightText(set.weight_kg, unit)} ${unit} × ${set.reps ?? "—"}`}
                        </Txt>
                        {(set.rpe !== null || set.rir !== null) && (
                          <Txt className="mt-1 text-xs text-muted">
                            {[
                              set.rpe != null ? `RPE ${set.rpe}` : "",
                              set.rir != null ? `RIR ${set.rir}` : "",
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </Txt>
                        )}
                        {!!set.notes && (
                          <Txt className="mt-2 text-right text-xs text-muted">{set.notes}</Txt>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}
