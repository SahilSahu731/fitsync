import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useSession } from "@/src/context/session";
import { useBilling } from "../billing/billing-context";
import { useWorkout } from "../workouts/workout-context";
import { restAfterWorkoutSet } from "../workouts/session-progress";
import { useProgram } from "../program-follow/program-context";
import { coachingForOwner, type CoachingPlan } from "../coaching/api";
import { subscribeCoachingChange } from "../coaching/updates";
import { readJournal, subscribeJournal, syncWorkouts } from "../progress/journal";
import { addDays, currentGoals, emptyJournal, type Journal } from "../progress/model";
import { useCompanion } from "./companion-context";
import { defaultReminders, type CompanionRecord } from "./api";
import {
  clearCompanionReminders,
  handleCompanionReminderResponse,
  reconcileCompanionReminders,
} from "./reminders";
import { reminderDate } from "./reminder-model";
import { clearCompanionWidget, publishCompanionWidget } from "./widget";
import {
  clearCompanionWorkoutControls,
  parseCompanionWorkoutControl,
  publishCompanionWorkoutControls,
} from "./native-controls";
import { workoutControlsSnapshot } from "./native-model";
import { setCompanionNativeStatus } from "./native-status";

export function CompanionNativeBridge() {
  const { user } = useSession();
  return <AccountNativeBridge key={user?.id ?? "signed-out"} ownerId={user?.id ?? ""} />;
}
function AccountNativeBridge({ ownerId }: { ownerId: string }) {
  const { profile } = useSession(),
    billing = useBilling(),
    workout = useWorkout(),
    companion = useCompanion(),
    program = useProgram();
  const alive = useRef(true),
    actionBusy = useRef(false),
    processed = useRef(new Set<string>());
  const [journal, setJournal] = useState<Journal>(emptyJournal),
    [plan, setPlan] = useState<CoachingPlan | null>(null);
  const [loaded, setLoaded] = useState(false),
    [tick, setTick] = useState(0);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [clock, setClock] = useState(Date.now);
  const [paused, setPaused] = useState<{ sessionId: string; seconds: number } | null>(null);
  const current = useRef({
    workout,
    prefs: defaultReminders(),
    controls: workoutControlsSnapshot("", null, null),
    isPro: false,
  });
  const prefs =
    (
      companion.state.records.find(
        (item) => item.id === "reminders" && item.kind === "reminders",
      ) as CompanionRecord<"reminders"> | undefined
    )?.data ?? defaultReminders();
  const timezone = prefs.timezone || plan?.timezone || "UTC";
  const pauseKey = `fitsync.companion.paused-rest.v1.${ownerId}`;
  useEffect(() => {
    alive.current = true;
    // Remove the previous account before any new asynchronous snapshot arrives.
    void Promise.allSettled([
      clearCompanionReminders(),
      clearCompanionWidget(),
      clearCompanionWorkoutControls(),
    ]);
    setCompanionNativeStatus({
      ownerId,
      permission: "undetermined",
      scheduled: 0,
      suppressedByQuietHours: 0,
      error: null,
    });
    return () => {
      alive.current = false;
      void Promise.allSettled([
        clearCompanionReminders(),
        clearCompanionWidget(),
        clearCompanionWorkoutControls(),
      ]);
    };
  }, [ownerId]);
  useEffect(() => {
    if (!ownerId) return;
    let active = true,
      sequence = 0;
    const valid = () => active && alive.current;
    const refresh = async () => {
      const request = ++sequence;
      try {
        const [state, saved] = await Promise.all([
          coachingForOwner(ownerId).get(),
          syncWorkouts(ownerId, valid),
        ]);
        if (valid() && sequence === request) {
          setPlan(state.plan);
          setJournal(saved);
          setLoaded(true);
          setFetchedAt(new Date().toISOString());
          setTick((value) => value + 1);
        }
      } catch (error) {
        if (valid())
          setCompanionNativeStatus({
            ownerId,
            permission: "undetermined",
            scheduled: 0,
            suppressedByQuietHours: 0,
            error: `Companion sync paused: ${error instanceof Error ? error.message : "reconnect to refresh your plan and reminders."}`,
          });
      }
    };
    void readJournal(ownerId)
      .then((saved) => {
        if (valid()) setJournal(saved);
      })
      .catch(() => {});
    void refresh();
    const journalSubscription = subscribeJournal((account, saved) => {
      if (account === ownerId && valid()) setJournal(saved);
    });
    const coachingSubscription = subscribeCoachingChange(() => {
      void refresh();
    });
    const foreground = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    const interval = setInterval(() => {
      if (AppState.currentState === "active") void refresh();
    }, 60_000);
    return () => {
      active = false;
      sequence++;
      journalSubscription();
      coachingSubscription();
      foreground.remove();
      clearInterval(interval);
    };
  }, [ownerId, workout.dataRevision, companion.state]);
  useEffect(() => {
    if (!ownerId || workout.loading) return;
    let active = true;
    void AsyncStorage.getItem(pauseKey).then((raw) => {
      if (!active || !raw) return;
      try {
        const value = JSON.parse(raw);
        if (
          value.sessionId === workout.session?.id &&
          Number.isFinite(value.seconds) &&
          value.seconds > 0 &&
          value.seconds <= 86400
        )
          setPaused(value);
        else void AsyncStorage.removeItem(pauseKey);
      } catch {
        void AsyncStorage.removeItem(pauseKey);
      }
    });
    return () => {
      active = false;
    };
  }, [ownerId, pauseKey, workout.session?.id, workout.loading]);
  const activeRest =
    workout.restTimer && workout.restTimer.endsAt > clock
      ? { paused: false, remainingSeconds: Math.ceil((workout.restTimer.endsAt - clock) / 1000) }
      : paused && paused.sessionId === workout.session?.id
        ? { paused: true, remainingSeconds: paused.seconds }
        : null;
  useEffect(() => {
    if (!workout.restTimer) return;
    void Promise.resolve().then(() => setClock(Date.now()));
    const timeout = setTimeout(
      () => {
        setClock(Date.now());
        setTick((value) => value + 1);
      },
      Math.max(0, workout.restTimer.endsAt - Date.now()) + 100,
    );
    return () => clearTimeout(timeout);
  }, [workout.restTimer]);
  const controls = workoutControlsSnapshot(
    ownerId,
    workout.session,
    activeRest,
    workout.focusedExerciseId,
  );
  useLayoutEffect(() => {
    current.current = { workout, prefs, controls, isPro: billing.isPro };
  }, [workout, prefs, controls, billing.isPro]);
  const controlsKey = JSON.stringify(controls);
  useEffect(() => {
    if (!ownerId || !billing.isPro) {
      void clearCompanionWorkoutControls().catch(() => {});
      return;
    }
    void publishCompanionWorkoutControls(current.current.controls).catch((error) => {
      if (alive.current)
        setCompanionNativeStatus({
          ownerId,
          permission: "undetermined",
          scheduled: 0,
          suppressedByQuietHours: 0,
          error: error instanceof Error ? error.message : "Workout controls could not update.",
        });
    });
  }, [ownerId, billing.isPro, controlsKey, tick]);
  const completed = useMemo(() => {
    const all = [
      ...journal.workouts,
      ...(workout.completedWorkout ? [workout.completedWorkout] : []),
    ];
    return [
      ...new Map(
        all
          .filter((item) => item.status === "completed" && item.finished_at)
          .map((item) => [item.id, item]),
      ).values(),
    ];
  }, [journal.workouts, workout.completedWorkout]);
  const snapshotKey = JSON.stringify({
    prefs,
    plan,
    program: program.active,
    complete: completed.map((item) => [item.id, item.finished_at]),
    active: workout.session?.id,
    tick,
    loaded,
    fetchedAt,
  });
  useEffect(() => {
    if (Platform.OS === "web" || !ownerId) return;
    if (!billing.isPro) {
      void Promise.allSettled([clearCompanionReminders(), clearCompanionWidget()]);
      return;
    }
    if (!loaded || companion.loading || program.loading) return;
    let valid = true;
    void (async () => {
      const completedIds = new Set(completed.map((item) => item.id));
      const followed = program.active?.enrollment.status === "active" ? program.active : null;
      const sessions = followed
        ? followed.slots.map((slot) => ({
            id: slot.id,
            date: slot.date,
            title: slot.routineName,
            completed:
              slot.status === "completed" || (!!slot.sessionId && completedIds.has(slot.sessionId)),
          }))
        : (plan?.sessions.map((day) => ({
            id: day.id,
            date: day.date,
            title: day.name,
            completed:
              day.status === "completed" || (!!day.workoutId && completedIds.has(day.workoutId)),
          })) ?? []);
      const today = reminderDate(Date.now(), timezone);
      const weekday = new Date(`${today}T12:00:00Z`).getUTCDay() || 7;
      const weekStart = addDays(today, 1 - weekday);
      const weekly = completed.filter((item) => {
        const date = reminderDate(Date.parse(item.finished_at!), timezone);
        return date >= weekStart && date <= today;
      }).length;
      const next = sessions
        .filter((day) => !day.completed && day.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))[0];
      const personalPrefs = followed?.enrollment.reminder_enabled
        ? { ...prefs, enabled: false }
        : prefs;
      const result = await reconcileCompanionReminders({
        ownerId,
        prefs: personalPrefs,
        sessions,
        completedDates:
          followed || plan
            ? []
            : completed.map((item) => reminderDate(Date.parse(item.finished_at!), timezone)),
      });
      if (!valid || !alive.current) return;
      await publishCompanionWidget({
        ownerId,
        nextSessionTitle: next?.title ?? null,
        nextSessionDate: next?.date ?? null,
        weeklyCompleted: weekly,
        weeklyTarget: currentGoals(journal.events, profile?.trainingDays ?? 3).weeklyWorkouts,
        activeSessionId: workout.session?.id ?? null,
        updatedAt: fetchedAt ?? new Date().toISOString(),
        timezone,
      });
      if (valid && alive.current) setCompanionNativeStatus({ ownerId, ...result, error: null });
    })().catch((error) => {
      if (valid && alive.current)
        setCompanionNativeStatus({
          ownerId,
          permission: "undetermined",
          scheduled: 0,
          suppressedByQuietHours: 0,
          error:
            error instanceof Error
              ? error.message
              : "Your companion could not update on this phone.",
        });
    });
    return () => {
      valid = false;
    };
    // snapshotKey includes every authoritative value used by this reconciliation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ownerId,
    billing.isPro,
    companion.loading,
    program.loading,
    snapshotKey,
    timezone,
    profile?.trainingDays,
  ]);
  useEffect(() => {
    if (!ownerId || Platform.OS === "web") return;
    let mounted = true;
    const handle = async (response: Notifications.NotificationResponse | null) => {
      if (
        !mounted ||
        !response ||
        !current.current.isPro ||
        actionBusy.current ||
        workout.loading ||
        companion.loading
      )
        return;
      const request = response.notification.request;
      if (
        !["companion-reminder", "companion-workout-controls"].includes(
          String(request.content.data?.type),
        )
      )
        return;
      const key = `${request.identifier}:${response.notification.date}:${response.actionIdentifier}:${String(request.content.data?.nextSetId)}`;
      if (processed.current.has(key)) return;
      actionBusy.current = true;
      try {
        const { workout: latest, controls: snapshot, prefs: preferences } = current.current;
        const action = parseCompanionWorkoutControl(response, snapshot);
        if (action) {
          if (action.action === "pause-rest" && latest.restTimer) {
            const seconds = Math.max(1, Math.ceil((latest.restTimer.endsAt - Date.now()) / 1000));
            const value = { sessionId: action.sessionId, seconds };
            await AsyncStorage.setItem(pauseKey, JSON.stringify(value));
            if (!mounted) return;
            setPaused(value);
            latest.stopRest();
          } else if (action.action === "resume-rest" && snapshot?.rest?.paused) {
            await AsyncStorage.removeItem(pauseKey);
            if (!mounted) return;
            setPaused(null);
            latest.startRest(snapshot.rest.remainingSeconds);
          } else if (
            action.action === "complete-set" &&
            !latest.busy &&
            !latest.pendingSetIds.includes(action.setId)
          ) {
            const exercises = latest.session?.workout_session_exercises ?? [];
            const exercise = exercises.find((item) =>
              item.workout_logged_sets.some((set) => set.id === action.setId),
            );
            const rest = exercise ? restAfterWorkoutSet(exercises, exercise.id, action.setId) : 0;
            await latest.updateSet(action.setId, { completed: true });
            if (!mounted || current.current.workout.session?.id !== action.sessionId) return;
            await AsyncStorage.removeItem(pauseKey);
            if (!mounted) return;
            setPaused(null);
            if (rest > 0) latest.startRest(rest);
          }
          if (mounted) router.push("/workout");
        } else {
          const reminder = await handleCompanionReminderResponse(response, ownerId, preferences);
          if (reminder === "open" && mounted) router.push("/(tabs)/train");
        }
        processed.current.add(key);
        await Notifications.clearLastNotificationResponseAsync();
      } catch (error) {
        if (mounted)
          setCompanionNativeStatus({
            ownerId,
            permission: "undetermined",
            scheduled: 0,
            suppressedByQuietHours: 0,
            error: error instanceof Error ? error.message : "Open FitSync to retry this action.",
          });
      } finally {
        actionBusy.current = false;
      }
    };
    void Notifications.getLastNotificationResponseAsync()
      .then(handle)
      .catch(() => {});
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      void handle(response);
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [ownerId, pauseKey, billing.isPro, workout.loading, companion.loading]);
  return null;
}
