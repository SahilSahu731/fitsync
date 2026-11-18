import React, { useImperativeHandle, useLayoutEffect, useRef, useState, type Ref } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Txt } from "@/src/components/ui";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { C } from "@/src/constants/theme";
import { useSession } from "@/src/context/session";
import { useBilling } from "../billing/billing-context";
import { useCoaching } from "../coaching/use-coaching";
import type { CoachingDay, CoachingPlan } from "../coaching/api";
import { useProgram } from "../program-follow/program-context";
import { focusAction, programFocus } from "../program-follow/program-view";
import { WorkoutAction } from "../program-follow/workout-action";
import { dateLabel, localDate } from "../progress/model";
import { useWorkout } from "../workouts/workout-context";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
export type HomeWorkoutCardHandle = { refresh: () => Promise<void> };
type Props = {
  onStart: () => void;
  today?: string;
  refreshRef?: Ref<HomeWorkoutCardHandle>;
};

/** Upcoming sessions stay previews on rest days; only today's or active sessions can start. */
export function homeCoachingFocus(plan: CoachingPlan | null, today: string) {
  const sessions = [...(plan?.sessions ?? [])].sort(
    (a, b) => a.date.localeCompare(b.date) || a.week - b.week || a.day - b.day,
  );
  return {
    day:
      sessions.find((day) => day.status === "active") ??
      sessions.find((day) => day.date === today && day.status !== "completed") ??
      null,
    completed: sessions.find((day) => day.date === today && day.status === "completed") ?? null,
    next: sessions.find((day) => day.date > today && day.status === "planned") ?? null,
  };
}

export function HomeWorkoutCard(props: Props) {
  const { user } = useSession();
  return <AccountWorkoutCard key={user?.id ?? "signed-out"} {...props} ownerId={user?.id} />;
}

function AccountWorkoutCard({
  onStart,
  today = localDate(),
  refreshRef,
  ownerId,
}: Props & { ownerId?: string }) {
  const workout = useWorkout();
  const billing = useBilling();
  const program = useProgram();
  const coaching = useCoaching();
  const [working, setWorking] = useState(false);
  const [failure, setFailure] = useState("");
  const pending = useRef(false);
  const current = useRef({ ownerId, isPro: billing.isPro, blocked: false });
  useLayoutEffect(() => {
    current.current = {
      ownerId,
      isPro: billing.isPro,
      blocked:
        Boolean(workout.session) ||
        workout.pendingCompletion ||
        workout.loading ||
        workout.busy ||
        billing.loading ||
        coaching.loading ||
        coaching.busy,
    };
    return () => {
      current.current = { ownerId: undefined, isPro: false, blocked: true };
    };
  }, [
    ownerId,
    billing.isPro,
    billing.loading,
    workout.session,
    workout.pendingCompletion,
    workout.loading,
    workout.busy,
    coaching.loading,
    coaching.busy,
  ]);
  const refreshCoaching = coaching.refresh;
  useImperativeHandle(refreshRef, () => ({ refresh: refreshCoaching }), [refreshCoaching]);
  const blocked = workout.busy || workout.loading || workout.pendingCompletion || working;
  const canStart = Boolean(ownerId) && !blocked;
  const quickStart = () => {
    if (!canStart || pending.current) return;
    if (workout.session) router.push("/workout");
    else onStart();
  };
  const run = async (action: () => Promise<void>) => {
    if (pending.current || workout.busy || workout.loading || !ownerId) return;
    const account = ownerId;
    pending.current = true;
    setWorking(true);
    setFailure("");
    try {
      await action();
    } catch (error) {
      if (current.current.ownerId === account)
        setFailure(error instanceof Error ? error.message : "Could not connect. Try again.");
    } finally {
      pending.current = false;
      if (current.current.ownerId === account) setWorking(false);
    }
  };
  const startCoaching = (day: CoachingDay) =>
    void run(async () => {
      const account = ownerId;
      if (
        !billing.isPro ||
        billing.loading ||
        coaching.loading ||
        coaching.busy ||
        workout.pendingCompletion
      )
        return;
      await workout.ensureSynced();
      if (current.current.ownerId !== account || !current.current.isPro || current.current.blocked)
        return;
      const result = await coaching.mutate(`home-start:${day.id}`, (requestId) =>
        coaching.api.start(day.id, requestId),
      );
      if (!result || current.current.ownerId !== account) return;
      await Promise.allSettled([workout.refresh(), coaching.refresh()]);
      if (current.current.ownerId === account && result.status === "active")
        router.push("/workout");
    });
  const error = failure ? <ErrorMessage message={failure} /> : null;

  // A workout always takes priority over membership, programs and loading plan data.
  if (workout.session) {
    const session = workout.session;
    const movements = [...session.workout_session_exercises].sort(
      (a, b) => a.position - b.position,
    );
    const sets = movements.flatMap((movement) => movement.workout_logged_sets);
    const completed = sets.filter((set) => Boolean(set.completed_at)).length;
    return (
      <WorkoutShell
        eyebrow="WORKOUT IN PROGRESS"
        title={session.name}
        description="Your session is right where you left it."
        icon="dumbbell"
        meta={[
          `${movements.length} ${movements.length === 1 ? "exercise" : "exercises"}`,
          `${completed} / ${sets.length} sets logged`,
        ]}
      >
        <MovementPreview names={movements.map((movement) => movement.exercise_name)} />
        <HomeButton title="Resume workout" icon="play" onPress={() => router.push("/workout")} />
      </WorkoutShell>
    );
  }

  // A queued finish hides the active session; do not offer another start until it syncs.
  if (workout.pendingCompletion)
    return (
      <WorkoutShell
        eyebrow="WORKOUT SAVED ON THIS DEVICE"
        title="Finish syncing. Then go again."
        description="Sync your completed workout before starting another session."
        icon="cloud-upload-outline"
      >
        {error}
        <HomeButton
          title={working ? "Syncing workout…" : "Sync workout"}
          icon="sync"
          loading={working}
          disabled={workout.busy || workout.loading || working || !ownerId}
          onPress={() =>
            void run(async () => {
              await workout.ensureSynced();
              if (current.current.ownerId === ownerId)
                await Promise.allSettled([
                  workout.refresh(),
                  program.refresh(),
                  coaching.refresh(),
                ]);
            })
          }
        />
      </WorkoutShell>
    );

  if (workout.loading || billing.loading || (billing.isPro && program.loading))
    return (
      <WorkoutShell
        eyebrow="TODAY’S WORKOUT"
        title="Your next move."
        description="Opening your workout and training plan…"
        icon="dumbbell"
      >
        <HomeButton title="Loading your workout…" loading disabled onPress={() => {}} />
      </WorkoutShell>
    );

  if (!billing.isPro)
    return (
      <WorkoutShell
        eyebrow="YOUR NEXT WORKOUT"
        title="A little stronger, today."
        description="Pick a ready-made routine or start empty. Every rep is yours."
        icon="dumbbell"
      >
        <HomeButton title="Start a workout" icon="plus" onPress={quickStart} disabled={!canStart} />
        <SecondaryLink title="My routines" onPress={() => router.push("/(tabs)/train")} />
      </WorkoutShell>
    );

  if (program.active?.enrollment.status === "active") {
    const detail = program.active;
    const focus = programFocus(detail);
    const preview = focus.kind === "rest" || focus.kind === "upcoming";
    const openProgram = () =>
      router.push({ pathname: "/programs/[id]", params: { id: detail.enrollment.id } });
    return (
      <WorkoutShell
        eyebrow={focus.eyebrow}
        title={focus.title}
        description={focus.description}
        icon={
          focus.kind === "rest"
            ? "moon-waning-crescent"
            : focus.kind === "done"
              ? "check"
              : "dumbbell"
        }
        meta={[
          detail.enrollment.program_name,
          `Week ${detail.week} of ${detail.enrollment.duration_weeks}`,
        ]}
      >
        {detail.analytics.planned > 0 && (
          <View className="mb-5 mt-4">
            <View className="mb-2 flex-row justify-between gap-3">
              <Txt className="flex-1 text-[10px] text-muted">Program sessions</Txt>
              <Txt weight="medium" className="text-[10px]">
                {detail.analytics.completed} / {detail.analytics.planned}
              </Txt>
            </View>
            <View className="h-1 overflow-hidden rounded-full bg-white/10">
              <View
                className="h-full rounded-full bg-white"
                style={{
                  width: `${Math.max(0, Math.min(100, (detail.analytics.completed / detail.analytics.planned) * 100))}%`,
                }}
              />
            </View>
          </View>
        )}
        {program.error ? (
          <>
            <ErrorMessage message="Your program couldn’t refresh. Reconnect to load the latest session." />
            <HomeButton
              title="Refresh program"
              icon="refresh"
              onPress={() => void program.refresh()}
            />
          </>
        ) : focus.slot && !preview && !blocked ? (
          <WorkoutAction slot={focus.slot} title={focusAction(focus) ?? undefined} />
        ) : focus.kind === "unavailable" ? (
          <HomeButton
            title="Refresh program"
            icon="refresh"
            onPress={() => void program.refresh()}
          />
        ) : (
          <HomeButton
            title={blocked ? "Updating workout…" : preview ? "View my program" : "Open my program"}
            icon="arrow-right"
            disabled={blocked}
            onPress={openProgram}
          />
        )}
        <SecondaryLink
          title={preview ? "Start a different workout" : "View my program"}
          onPress={preview ? quickStart : openProgram}
          disabled={preview && !canStart}
        />
      </WorkoutShell>
    );
  }

  const plan = coaching.data?.plan ?? null;
  const { day, next, completed } = homeCoachingFocus(plan, today);
  const planFailure = program.error || coaching.error;
  const retry = () =>
    void run(async () => {
      await Promise.all([program.refresh(), coaching.refresh()]);
    });
  const planLoading = coaching.loading && !coaching.data;
  const openCoach = () => router.push("/coach");
  if (day)
    return (
      <WorkoutShell
        eyebrow={day.status === "active" ? "YOUR PLAN · IN PROGRESS" : "TODAY’S WORKOUT"}
        title={day.name}
        description={plan?.name ?? "Your personal training plan"}
        icon="dumbbell"
        meta={[
          `${day.prescription.minutes} min`,
          `${day.prescription.exercises.length} exercises`,
          `Week ${day.week} · Day ${day.day}`,
        ]}
      >
        <MovementPreview names={day.prescription.exercises.map((movement) => movement.name)} />
        {error}
        {planFailure ? (
          <>
            <ErrorMessage message="Your plan couldn’t refresh. Reconnect to load the latest session." />
            <HomeButton
              title="Refresh my plan"
              icon="refresh"
              onPress={retry}
              disabled={working}
              loading={working}
            />
          </>
        ) : (
          <HomeButton
            title={
              working
                ? "Preparing workout…"
                : coaching.loading
                  ? "Refreshing plan…"
                  : coaching.busy
                    ? "Updating plan…"
                    : day.status === "active"
                      ? "Resume workout"
                      : "Start today’s workout"
            }
            icon="play"
            disabled={!canStart || coaching.busy || coaching.loading}
            loading={working || coaching.loading || coaching.busy}
            onPress={() => startCoaching(day)}
          />
        )}
        <SecondaryLink title="View my plan" onPress={openCoach} />
      </WorkoutShell>
    );

  return (
    <WorkoutShell
      eyebrow={plan ? "TODAY’S WORKOUT" : "YOUR NEXT WORKOUT"}
      title={
        completed ? "Today’s session, done." : plan ? "Room to recover." : "Make your next move."
      }
      description={
        planLoading
          ? "Checking today’s training plan…"
          : planFailure
            ? "Your plan couldn’t refresh. You can still choose a workout."
            : completed
              ? `${completed.name} is logged. Keep your momentum at your pace.`
              : plan
                ? next
                  ? `Next up: ${next.name}, ${dateLabel(next.date)}.`
                  : "No session is scheduled today. Review your plan or choose your own workout."
                : "Choose a workout for today, or follow a program built around your goal."
      }
      icon={completed ? "check" : plan ? "moon-waning-crescent" : "dumbbell"}
    >
      {error}
      <HomeButton
        title="Start a workout"
        icon="plus"
        onPress={quickStart}
        disabled={!canStart || planLoading}
      />
      <SecondaryLink
        title={planFailure ? "Retry my plan" : plan ? "View my plan" : "Choose a program"}
        onPress={planFailure ? retry : plan ? openCoach : () => router.push("/explore/programs")}
        disabled={working || planLoading}
      />
    </WorkoutShell>
  );
}

function WorkoutShell({
  eyebrow,
  title,
  description,
  icon,
  meta = [],
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: IconName;
  meta?: string[];
  children: React.ReactNode;
}) {
  return (
    <View className="rounded-[30px] border border-white/10 bg-panel p-5">
      <View className="mb-3 flex-row items-center justify-between gap-4">
        <Txt
          weight="medium"
          className="min-w-0 flex-1 text-[9px] leading-5 tracking-[1.6px] text-muted"
        >
          {eyebrow}
        </Txt>
        <View className="h-11 w-11 items-center justify-center rounded-full bg-white/5">
          <MaterialCommunityIcons name={icon} size={22} color={C.ink} />
        </View>
      </View>
      <Txt
        accessibilityRole="header"
        weight="medium"
        className="text-[28px] leading-9 tracking-[-1px]"
      >
        {title}
      </Txt>
      <Txt className="mb-5 mt-2 text-xs leading-6 text-muted">{description}</Txt>
      {meta.length > 0 && (
        <View className="mb-1 flex-row flex-wrap gap-x-3 gap-y-2">
          {meta.filter(Boolean).map((item, index) => (
            <View key={`${index}:${item}`} className="flex-row items-center gap-2">
              {index > 0 && <View className="h-0.5 w-0.5 rounded-full bg-white/40" />}
              <Txt className="text-[10px] leading-5 text-muted">{item}</Txt>
            </View>
          ))}
        </View>
      )}
      {children}
    </View>
  );
}

function MovementPreview({ names }: { names: string[] }) {
  if (!names.length) return <View className="h-4" />;
  return (
    <View className="mb-5 mt-4 rounded-[18px] bg-white/[0.04] px-3.5 py-2.5">
      {names.slice(0, 2).map((name, index) => (
        <View key={`${index}:${name}`} className="flex-row items-center gap-2.5 py-1.5">
          <Txt className="w-4 text-[10px] text-muted">{String(index + 1).padStart(2, "0")}</Txt>
          <Txt numberOfLines={1} className="min-w-0 flex-1 text-[11px]">
            {name}
          </Txt>
        </View>
      ))}
      {names.length > 2 && (
        <Txt className="pb-1 pl-[26px] pt-1 text-[10px] text-muted">
          +{names.length - 2} more exercises
        </Txt>
      )}
    </View>
  );
}

function HomeButton({
  title,
  icon,
  onPress,
  disabled = false,
  loading = false,
}: {
  title: string;
  icon?: IconName;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      className={`min-h-14 flex-row items-center justify-center gap-2 rounded-full bg-white px-4 py-3.5 ${disabled || loading ? "opacity-50" : ""}`}
    >
      {loading ? (
        <ActivityIndicator color={C.bg} />
      ) : icon ? (
        <MaterialCommunityIcons name={icon} size={21} color={C.bg} />
      ) : null}
      <Txt weight="semibold" className="flex-shrink text-xs text-black">
        {title}
      </Txt>
    </Pressable>
  );
}

function SecondaryLink({
  title,
  onPress,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`mt-1 min-h-11 flex-row items-center justify-center gap-2 px-3 ${disabled ? "opacity-40" : ""}`}
    >
      <Txt weight="medium" className="flex-shrink text-[11px] text-muted">
        {title}
      </Txt>
      <MaterialCommunityIcons name="arrow-right" size={15} color={C.muted} />
    </Pressable>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <Txt accessibilityRole="alert" className="mb-4 text-xs leading-5 text-muted">
      {message}
    </Txt>
  );
}
