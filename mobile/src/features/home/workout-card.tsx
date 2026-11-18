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
    const movements = session.workout_session_exercises;
    const sets = movements.flatMap((movement) => movement.workout_logged_sets);
    const completed = sets.filter((set) => Boolean(set.completed_at)).length;
    return (
      <WorkoutShell
        eyebrow="WORKOUT IN PROGRESS"
        title={session.name}
        description="You’ve made the start. Keep your momentum."
        icon="dumbbell"
        meta={[
          ...(movements.length
            ? [`${movements.length} ${movements.length === 1 ? "exercise" : "exercises"}`]
            : []),
          ...(sets.length ? [`${completed} of ${sets.length} sets logged`] : []),
        ]}
      >
        <HomeButton title="Resume workout" icon="play" onPress={() => router.push("/workout")} />
      </WorkoutShell>
    );
  }

  // A queued finish hides the active session; do not offer another start until it syncs.
  if (workout.pendingCompletion)
    return (
      <WorkoutShell
        eyebrow="Workout Saved"
        title="Your effort counts."
        description="One last sync to save your session to your account."
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
        eyebrow="Today's Workout"
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
        eyebrow="Today's Workout"
        title={"Make today count."}
        description="Start where you are. Build from here."
        icon="dumbbell"
        hero
      >
        <HomeButton
          title="Start a workout"
          icon="arrow-right"
          onPress={quickStart}
          disabled={!canStart}
        />
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
        description={
          focus.kind === "workout"
            ? "Your plan is ready. Take it one set at a time."
            : focus.kind === "inProgress"
              ? "You’ve made the start. Keep your momentum."
              : focus.kind === "done"
                ? "You showed up. Take a moment to enjoy that."
                : focus.description
        }
        icon={
          focus.kind === "rest"
            ? "moon-waning-crescent"
            : focus.kind === "done"
              ? "check"
              : "dumbbell"
        }
        meta={[detail.enrollment.program_name]}
      >
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
        description={
          day.status === "active"
            ? "You’ve made the start. Keep your momentum."
            : "Your plan is ready. Take it one set at a time."
        }
        icon="dumbbell"
        meta={[`${day.prescription.minutes} min`, `${day.prescription.exercises.length} exercises`]}
      >
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
      title={completed ? "You showed up." : plan ? "Room to recover." : "Make today count."}
      description={
        planLoading
          ? "Checking today’s training plan…"
          : planFailure
            ? "Your plan couldn’t refresh. You can still choose a workout."
            : completed
              ? `${completed.name} is logged. Give yourself credit.`
              : plan
                ? next
                  ? `Next up: ${next.name}, ${dateLabel(next.date)}.`
                  : "Recovery is part of getting stronger. Go at your own pace."
                : "Start where you are. Build from here."
      }
      icon={completed ? "check" : plan ? "moon-waning-crescent" : "dumbbell"}
      hero={!plan && !planLoading && !planFailure}
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
  hero = false,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: IconName;
  meta?: string[];
  hero?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View className="rounded-2xl bg-panel p-6">
      <View className="mb-2 flex-row items-center gap-2.5">
        <MaterialCommunityIcons name={icon} size={14} color={C.ink} />
        <Txt
          weight="medium"
          className="min-w-0 flex-1 text-[9px] text-muted"
        >
          {eyebrow}
        </Txt>
      </View>
      <Txt
        accessibilityRole="header"
        weight="semibold"
        className={
          hero
            ? "text-[30px] leading-[46px] tracking-[-1.5px]"
            : "text-[29px] leading-[38px] tracking-[-0.9px]"
        }
      >
        {title}
      </Txt>
      <Txt className="mt-1 text-xs leading-[22px] text-muted">{description}</Txt>
      {meta.length > 0 && (
        <View className="mt-2 flex-row flex-wrap gap-x-2 gap-y-2">
          {meta.filter(Boolean).map((item, index) => (
            <View
              key={`${index}:${item}`}
              className="max-w-full rounded-full bg-white/5 px-3 py-1"
            >
              <Txt weight="medium" className="text-[10px] leading-5">
                {item}
              </Txt>
            </View>
          ))}
        </View>
      )}
      <View className="mt-6">{children}</View>
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
      className={`min-h-[58px] flex-row items-center justify-between gap-3 rounded-full bg-white py-2 pl-5 pr-2 ${disabled || loading ? "opacity-50" : ""}`}
    >
      <Txt weight="semibold" className="min-w-0 flex-1 text-[13px] leading-5 text-black">
        {title}
      </Txt>
      <View className="h-10 w-10 items-center justify-center rounded-full bg-black">
        {loading ? (
          <ActivityIndicator color={C.ink} />
        ) : (
          <MaterialCommunityIcons name={icon ?? "arrow-right"} size={21} color={C.ink} />
        )}
      </View>
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
      className={`mt-2 min-h-11 flex-row items-center justify-center gap-1.5 px-3 ${disabled ? "opacity-40" : ""}`}
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
