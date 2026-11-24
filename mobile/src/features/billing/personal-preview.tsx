import React from "react";
import { ActivityIndicator, View } from "react-native";
import { useSession } from "@/src/context/session";
import { Txt } from "@/src/components/ui";
import { useProgress } from "../progress/use-progress";
import { localDate } from "../progress/model";
import { nextTargets, weeklyMoment, workoutMoment } from "./moments";
import { completedInsightWorkouts } from "../pro/companion-insights";
import { MomentCard, targetText } from "./moment-card";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { C } from "@/src/constants/theme";

export function WeeklyReviewPreview({ unlocked = false }: { unlocked?: boolean } = {}) {
  const { user, settings } = useSession();
  const progress = useProgress();
  const unit = settings?.weightUnit ?? "kg";
  if (progress.loading || progress.refreshing)
    return (
      <View className="mb-6 items-center p-5">
        <ActivityIndicator color={C.brand} />
        <Txt className="mt-3 text-xs text-muted">Loading your completed workouts…</Txt>
      </View>
    );
  if (progress.workoutError || progress.storageError)
    return (
      <View className="mb-6 rounded-2xl bg-panel p-5">
        <Txt>Your weekly preview needs your saved workouts.</Txt>
        <Pressable
          accessibilityRole="button"
          onPress={() => void progress.refresh()}
          className="mt-2 min-h-11 justify-center"
        >
          <Txt className="text-brand">Retry workout sync</Txt>
        </Pressable>
      </View>
    );
  const moment =
    !progress.loading && !progress.refreshing && !progress.workoutError && !progress.storageError
      ? weeklyMoment(progress.journal.workouts, user?.createdAt ?? "", localDate(new Date()), unit)
      : null;
  if (unlocked)
    return moment ? (
      <View className="mb-6 rounded-2xl bg-panel p-5">
        <Txt weight="semibold">Your completed week · {moment.detail}</Txt>
        {moment.insights?.map((insight) => (
          <View key={insight.title} className="mt-4">
            <Txt weight="semibold">{insight.title}</Txt>
            <Txt className="mt-1 text-sm leading-6 text-muted">{insight.text}</Txt>
          </View>
        ))}
      </View>
    ) : null;
  return moment ? (
    <MomentCard moment={moment} unit={unit} />
  ) : (
    <View className="mb-6 rounded-2xl bg-panel p-5">
      <Txt weight="semibold">Your first insight starts with your logs.</Txt>
      <Txt className="mt-2 text-sm leading-6 text-muted">
        After your first seven days, completed workouts will build your weekly preview here. Keep
        logging for free.
      </Txt>
    </View>
  );
}

export function PaywallEvidence({ source }: { source: string }) {
  const { user, settings } = useSession();
  const progress = useProgress();
  if (progress.loading || progress.refreshing || progress.workoutError || progress.storageError)
    return null;
  const today = localDate(new Date());
  const unit = settings?.weightUnit ?? "kg";
  if (source === "weekly_review") {
    const moment = weeklyMoment(progress.journal.workouts, user?.createdAt ?? "", today, unit);
    const insight = moment?.insights?.[0];
    return insight ? (
      <View className="mb-4 rounded-2xl bg-brand/5 p-4">
        <Txt className="text-xs text-brand">From your completed week</Txt>
        <Txt className="mt-2 text-sm leading-6">{insight.text}</Txt>
        <Txt className="mt-2 text-xs text-muted">
          Unlock the remaining review and next steps with Pro.
        </Txt>
      </View>
    ) : null;
  }
  if (!["personal_best", "workout_three", "workout_summary", "progress"].includes(source))
    return null;
  const latest = completedInsightWorkouts(progress.journal.workouts, today).at(-1);
  const target =
    (latest ? workoutMoment(latest, progress.journal.workouts, today, unit)?.targets?.[0] : null) ??
    nextTargets(progress.journal.workouts, today, unit)[0];
  return target ? (
    <View className="mb-4 rounded-2xl bg-brand/5 p-4">
      <Txt className="text-xs text-brand">Your next session · {target.name}</Txt>
      <Txt weight="semibold" className="mt-2 text-xl">
        {targetText(target, unit)}
      </Txt>
      <Txt className="mt-2 text-xs leading-5 text-muted">{target.target.reason}</Txt>
      <Txt className="mt-2 text-xs text-muted">Unlock the full progression review with Pro.</Txt>
    </View>
  ) : null;
}
