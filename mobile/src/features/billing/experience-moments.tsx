import React, { useMemo, useState } from "react";
import { useSession } from "@/src/context/session";
import { useBilling } from "./billing-context";
import { useCoaching } from "../coaching/use-coaching";
import { localDate, type ProgressWorkout } from "../progress/model";
import { MomentCard } from "./moment-card";
import {
  missedMoment,
  progressWorkout,
  recentWorkoutMoments,
  weeklyMoment,
  workoutMoment,
} from "./moments";
import { useUpgradeMoment } from "./use-moment";
import type { WorkoutSession } from "../workouts/api";

export function WorkoutUpgradeMoment({
  workout,
  history,
  ready,
}: {
  workout: WorkoutSession;
  history: ProgressWorkout[];
  ready: boolean;
}) {
  const { user, settings } = useSession();
  const billing = useBilling();
  const unit = settings?.weightUnit ?? "kg";
  const candidate = useMemo(
    () => workoutMoment(progressWorkout(workout), history, localDate(new Date()), unit),
    [workout, history, unit],
  );
  const { moment, dismiss } = useUpgradeMoment(
    user?.id ?? "",
    candidate,
    ready && !billing.loading && !billing.isPro,
  );
  return moment ? <MomentCard moment={moment} unit={unit} onDismiss={dismiss} /> : null;
}

export function HomeUpgradeMoments({
  history,
  ready,
  today,
}: {
  history: ProgressWorkout[];
  ready: boolean;
  today: string;
}) {
  const { user, settings } = useSession();
  const billing = useBilling();
  const coaching = useCoaching();
  const [dismissedRecovery, setDismissedRecovery] = useState("");
  const unit = settings?.weightUnit ?? "kg";
  const recovery =
    !coaching.loading && (!coaching.error || billing.isPro)
      ? missedMoment(coaching.data?.plan ?? null)
      : null;
  const achievements = useMemo(
    () => recentWorkoutMoments(history, today, unit),
    [history, today, unit],
  );
  const weekly = weeklyMoment(history, user?.createdAt ?? "", today, unit);
  const candidates = [...achievements, weekly, recovery];
  const { moment, dismiss } = useUpgradeMoment(
    user?.id ?? "",
    candidates,
    ready && !billing.loading && !billing.isPro,
  );
  const memberRecovery = billing.isPro && recovery?.key !== dismissedRecovery ? recovery : null;
  const shown = billing.isPro
    ? memberRecovery
    : moment?.source === "missed_session" && recovery?.key !== moment.key
      ? null
      : moment;
  if (!ready || !shown) return null;
  return (
    <MomentCard
      moment={shown}
      unit={unit}
      member={billing.isPro}
      busy={coaching.busy}
      error={coaching.error}
      onDismiss={() => (billing.isPro ? setDismissedRecovery(shown.key) : dismiss())}
      onRecover={() => {
        const move = shown.recovery;
        if (!move) return;
        void coaching
          .mutate(
            `recover:${move.day.id}:${move.date}`,
            (requestId) => coaching.api.reschedule(move.day, requestId, move.date),
            (plan) => plan,
          )
          .catch(() => undefined);
      }}
    />
  );
}
