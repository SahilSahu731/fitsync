import React, { useLayoutEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Platform, Switch, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { useSession } from "@/src/context/session";
import { useBilling } from "../billing/billing-context";
import { useCompanion } from "../companion/companion-context";
import { defaultReminders, type CompanionRecord } from "../companion/api";
import { inReminderQuietHours, reminderWallTime, reminderDate } from "../companion/reminder-model";
import { requestCompanionReminderPermission } from "../companion/reminders";
import { useCompanionNativeStatus } from "../companion/native-status";
import { useProgram } from "../program-follow/program-context";
import { programFollowApi } from "../program-follow/api";
import { registerProgramNotifications } from "../program-follow/notifications";
import { Sheet } from "../progress/editors";
import {
  homeReminderDraft,
  homeReminderPreferences,
  validHomeReminderDraft,
  type HomeReminderDraft,
} from "./reminder-settings";

type Kind = "workout" | "water" | "diet";
type Draft = {
  values: HomeReminderDraft;
  base: ReturnType<typeof defaultReminders>;
  revision: number;
  programId: string | null;
  workoutEdited: boolean;
};
const ITEMS = [
  {
    kind: "workout",
    title: "Workout",
    icon: "dumbbell",
    detail: "A nudge to make time for training",
  },
  { kind: "water", title: "Water", icon: "water-outline", detail: "A daily hydration check-in" },
  {
    kind: "diet",
    title: "Diet",
    icon: "silverware-fork-knife",
    detail: "A daily nudge for food & nutrition",
  },
] as const;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const timeDate = (time: string) => {
  const value = new Date();
  const [hour, minute] = time.split(":").map(Number);
  value.setHours(hour, minute, 0, 0);
  return value;
};
const timeText = (time: string) =>
  timeDate(time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const changed = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b);

export function HomeReminderSheet({ onClose }: { onClose: () => void }) {
  const { user } = useSession();
  return (
    <AccountReminderSheet
      key={user?.id ?? "signed-out"}
      ownerId={user?.id ?? ""}
      onClose={onClose}
    />
  );
}

function AccountReminderSheet({ ownerId, onClose }: { ownerId: string; onClose: () => void }) {
  const { settings, reloadMe } = useSession();
  const billing = useBilling();
  const companion = useCompanion();
  const program = useProgram();
  const status = useCompanionNativeStatus(ownerId);
  const saved = companion.state.records.find(
    (record) => record.id === "reminders" && record.kind === "reminders",
  ) as CompanionRecord<"reminders"> | undefined;
  const activeEnrollment =
    program.active?.enrollment.status === "active" ? program.active.enrollment : null;
  // An enabled program reminder already owns workout alerts. Otherwise retain
  // the existing personal schedule, including for people following a program.
  const enrollment = activeEnrollment?.reminder_enabled ? activeEnrollment : null;
  const base = saved?.data ?? defaultReminders();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [picker, setPicker] = useState<Kind | null>(null);
  const [showDays, setShowDays] = useState(false);
  const [openedAt] = useState(() => Date.now());
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [permissionDenied, setPermissionDenied] = useState(false);
  const lock = useRef(false);
  const current = useRef({
    ownerId,
    isPro: billing.isPro,
    programId: activeEnrollment?.id ?? null,
    workoutReady: !program.loading && !program.error,
  });
  useLayoutEffect(() => {
    current.current = {
      ownerId,
      isPro: billing.isPro,
      programId: activeEnrollment?.id ?? null,
      workoutReady: !program.loading && !program.error,
    };
    return () => {
      current.current = { ownerId: "", isPro: false, programId: null, workoutReady: false };
    };
  }, [ownerId, billing.isPro, activeEnrollment?.id, program.loading, program.error]);
  const source = homeReminderDraft(base, enrollment, settings?.workoutReminders ?? false);
  const values = draft?.values ?? source;
  const loading = billing.loading || (!companion.stateLoaded && companion.loading);
  const sourceError = companion.stateError;
  const programChanged = draft !== null && draft.programId !== (activeEnrollment?.id ?? null);
  const workoutUnavailable = program.loading || Boolean(program.error) || programChanged;
  const disabled =
    loading || !companion.stateLoaded || working || companion.busy || !billing.isPro || !ownerId;
  const disabledFor = (kind: Kind) => disabled || (kind === "workout" && workoutUnavailable);
  const personal = homeReminderPreferences(draft?.base ?? base, values, Boolean(enrollment));
  const quietKinds = ITEMS.filter((item) => {
    if (!values[item.kind].enabled || (item.kind === "workout" && enrollment)) return false;
    try {
      const at = reminderWallTime(
        reminderDate(openedAt, personal.timezone),
        values[item.kind].time,
        personal.timezone,
      );
      return at !== null && inReminderQuietHours(at, personal);
    } catch {
      return false;
    }
  });

  function change(kind: Kind, update: (value: HomeReminderDraft) => HomeReminderDraft) {
    if (disabledFor(kind) || lock.current) return;
    setDraft((previous) => ({
      values: update(previous?.values ?? source),
      base: previous?.base ?? base,
      revision: previous?.revision ?? saved?.revision ?? 0,
      programId: previous ? previous.programId : (activeEnrollment?.id ?? null),
      workoutEdited: previous?.workoutEdited === true || kind === "workout",
    }));
    setError("");
  }
  function chooseTime(kind: Kind) {
    if (disabledFor(kind) || !values[kind].enabled) return;
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        mode: "time",
        value: timeDate(values[kind].time),
        onValueChange: (_, value) => {
          if (!current.current.isPro || current.current.ownerId !== ownerId || lock.current) return;
          const time = `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
          change(kind, (previous) => ({ ...previous, [kind]: { ...previous[kind], time } }));
        },
      });
    } else setPicker((currentKind) => (currentKind === kind ? null : kind));
  }
  function close() {
    if (!lock.current) onClose();
  }
  async function save() {
    if (disabled || lock.current || !draft) return;
    const snapshot = draft;
    if (snapshot.workoutEdited && workoutUnavailable) {
      setError("Refresh your workout reminder before saving its changes. Your edits are kept.");
      return;
    }
    const mapped = homeReminderPreferences(snapshot.base, snapshot.values, Boolean(enrollment));
    // Water/diet changes never rewrite workout settings using an unavailable
    // or changed program snapshot.
    const next = snapshot.workoutEdited
      ? mapped
      : {
          ...mapped,
          enabled: snapshot.base.enabled,
          time: snapshot.base.time,
          days: snapshot.base.days,
        };
    const checkedValues = snapshot.workoutEdited
      ? snapshot.values
      : {
          ...snapshot.values,
          workout: { enabled: snapshot.base.enabled, time: snapshot.base.time },
          days: snapshot.base.days,
        };
    if (
      !validHomeReminderDraft(
        snapshot.base,
        checkedValues,
        snapshot.workoutEdited && Boolean(enrollment),
      )
    ) {
      setError("Choose valid times and at least one workout day.");
      return;
    }
    const account = ownerId;
    const enrollmentId = activeEnrollment?.id ?? null;
    const valid = () =>
      current.current.ownerId === account &&
      current.current.isPro &&
      (!snapshot.workoutEdited ||
        (current.current.workoutReady && current.current.programId === enrollmentId));
    const personalChanged = changed(snapshot.base, next);
    const activatingPersonal =
      (next.enabled &&
        (!snapshot.base.enabled ||
          next.time !== snapshot.base.time ||
          changed(next.days, snapshot.base.days))) ||
      (["hydration", "meals"] as const).some(
        (kind) =>
          next.habits?.[kind]?.enabled && changed(next.habits[kind], snapshot.base.habits?.[kind]),
      );
    const workoutChanged =
      snapshot.workoutEdited &&
      !!enrollment &&
      changed(
        snapshot.values.workout,
        homeReminderDraft(snapshot.base, enrollment, settings?.workoutReminders ?? false).workout,
      );
    let personalSaved = false;
    lock.current = true;
    setWorking(true);
    setError("");
    setPicker(null);
    try {
      if (activatingPersonal || (workoutChanged && snapshot.values.workout.enabled)) {
        if (!(await requestCompanionReminderPermission())) {
          setPermissionDenied(true);
          throw new Error(
            "Notifications are off. Enable FitSync in your phone settings, then save again.",
          );
        }
      }
      if (!valid()) return;
      if (workoutChanged && snapshot.values.workout.enabled)
        await registerProgramNotifications(true);
      if (!valid()) return;
      if (personalChanged) {
        const result = await companion.save(
          "reminders",
          "reminders",
          next,
          undefined,
          snapshot.revision,
        );
        personalSaved = true;
        if (!valid()) return;
        setDraft({ ...snapshot, base: result.data, revision: result.revision });
      }
      if (workoutChanged && enrollment) {
        const [hour, minute] = snapshot.values.workout.time.split(":").map(Number);
        await programFollowApi.reminders(enrollment.id, {
          reminderEnabled: snapshot.values.workout.enabled,
          hour,
          minute,
          timezone: enrollment.timezone,
        });
        if (!valid()) return;
        await Promise.allSettled([program.refresh(), reloadMe()]);
      }
      if (valid()) onClose();
    } catch (failure) {
      if (current.current.ownerId === account) {
        const message =
          failure instanceof Error ? failure.message : "Could not save reminders. Try again.";
        setError(
          personalSaved && workoutChanged
            ? `Daily reminders saved. The workout reminder could not save: ${message}`
            : message,
        );
      }
    } finally {
      lock.current = false;
      if (current.current.ownerId === account) setWorking(false);
    }
  }
  return (
    <Sheet
      eyebrow="A LITTLE NUDGE"
      title="Your reminders"
      subtitle="Three small ways to stay in sync."
      busy={working}
      onClose={close}
      footer={
        <>
          {!!error && (
            <Txt accessibilityRole="alert" className="mb-3 text-xs leading-5 text-red-300">
              {error}
            </Txt>
          )}
          {!billing.isPro && !billing.loading ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Explore Pro reminders"
              onPress={() => {
                onClose();
                router.push("/membership");
              }}
              className="min-h-14 items-center justify-center rounded-full bg-white px-5"
            >
              <Txt weight="medium" className="text-sm text-black">
                Explore Pro
              </Txt>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save reminders"
              accessibilityState={{ disabled: disabled || !draft, busy: working }}
              disabled={disabled || !draft}
              onPress={() => void save()}
              className="min-h-14 flex-row items-center justify-center gap-2 rounded-full bg-white px-5"
              style={{ opacity: disabled || !draft ? 0.4 : 1 }}
            >
              {working && <ActivityIndicator color="#000000" />}
              <Txt weight="medium" className="text-sm text-black">
                {working ? "Saving…" : "Save reminders"}
              </Txt>
            </Pressable>
          )}
        </>
      }
    >
      {loading && (
        <View className="mb-4 flex-row items-center gap-3">
          <ActivityIndicator color="#FFFFFF" />
          <Txt className="flex-1 text-xs text-muted">Opening your saved reminders…</Txt>
        </View>
      )}
      {!billing.isPro && !billing.loading && (
        <Txt className="mb-4 text-xs leading-6 text-muted">
          Custom workout, water and diet reminders are included with Pro.
        </Txt>
      )}
      {!!sourceError && (
        <View className="mb-4 rounded-2xl bg-white/5 p-4">
          <Txt className="text-xs leading-5 text-muted">
            {companion.stateLoaded
              ? "Showing your last loaded reminder settings."
              : "Your reminder settings haven’t loaded yet."}{" "}
            {sourceError}
          </Txt>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry reminders"
            disabled={working || loading}
            onPress={() => void companion.refresh()}
            className="min-h-11 justify-center"
          >
            <Txt weight="medium" className="text-xs">
              Try again
            </Txt>
          </Pressable>
        </View>
      )}
      {!!program.error && (
        <View className="mb-4 rounded-2xl bg-white/5 p-4">
          <Txt className="text-xs leading-5 text-muted">
            Workout reminders couldn’t refresh. You can still change water and diet reminders.
          </Txt>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry workout reminders"
            disabled={working || program.loading}
            onPress={() => void program.refresh()}
            className="min-h-11 justify-center"
          >
            <Txt weight="medium" className="text-xs">
              Try again
            </Txt>
          </Pressable>
        </View>
      )}
      {programChanged && (
        <Txt accessibilityRole="alert" className="mb-4 text-xs leading-5 text-muted">
          Your training program changed. Reopen this sheet to edit workout reminders. Water and diet
          are still available.
        </Txt>
      )}
      <View className="gap-3">
        {ITEMS.map((item) => {
          const setting = values[item.kind];
          const itemDisabled = disabledFor(item.kind);
          const timezone =
            item.kind === "workout" && enrollment ? enrollment.timezone : personal.timezone;
          return (
            <View
              key={item.kind}
              className="rounded-[24px] border border-white/5 bg-white/[0.04] p-4"
            >
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-white/5">
                  <MaterialCommunityIcons name={item.icon} size={22} color="#FFFFFF" />
                </View>
                <View className="min-w-0 flex-1">
                  <Txt weight="medium" className="text-sm">
                    {item.title}
                  </Txt>
                  <Txt className="mt-1 text-[10px] leading-4 text-muted">
                    {item.kind === "workout" && enrollment
                      ? "Your daily program reminder"
                      : item.detail}
                  </Txt>
                </View>
                <Switch
                  accessibilityLabel={`${item.title} reminders`}
                  value={setting.enabled}
                  disabled={itemDisabled}
                  onValueChange={(enabled) =>
                    change(item.kind, (previous) => ({
                      ...previous,
                      [item.kind]: { ...previous[item.kind], enabled },
                    }))
                  }
                  trackColor={{ false: "#333333", true: "#FFFFFF" }}
                  thumbColor={setting.enabled ? "#111111" : "#A3A3A3"}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Choose ${item.title.toLowerCase()} reminder time`}
                accessibilityState={{ disabled: itemDisabled || !setting.enabled }}
                disabled={itemDisabled || !setting.enabled}
                onPress={() => chooseTime(item.kind)}
                className="mt-3 min-h-12 flex-row items-center gap-2 rounded-full bg-white/5 px-4"
                style={{ opacity: setting.enabled ? 1 : 0.4 }}
              >
                <MaterialCommunityIcons name="clock-outline" size={17} color="#A3A3A3" />
                <Txt weight="medium" className="min-w-0 flex-1 text-sm">
                  {timeText(setting.time)}
                </Txt>
                <MaterialCommunityIcons name="chevron-down" size={18} color="#A3A3A3" />
              </Pressable>
              {picker === item.kind && Platform.OS !== "android" && (
                <DateTimePicker
                  mode="time"
                  display="spinner"
                  themeVariant="dark"
                  value={timeDate(setting.time)}
                  onValueChange={(_, value) => {
                    const time = `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
                    change(item.kind, (previous) => ({
                      ...previous,
                      [item.kind]: { ...previous[item.kind], time },
                    }));
                  }}
                />
              )}
              {item.kind === "workout" && !enrollment && setting.enabled && (
                <View className="mt-1">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Change workout reminder days"
                    disabled={itemDisabled}
                    onPress={() => setShowDays((value) => !value)}
                    className="min-h-11 flex-row items-center gap-2"
                  >
                    <Txt className="min-w-0 flex-1 text-[10px] leading-5 text-muted">
                      {values.days.length === 7
                        ? "Every day"
                        : values.days.length
                          ? values.days.map((day) => DAYS[day - 1]).join(" · ")
                          : "Choose workout days"}
                    </Txt>
                    <MaterialCommunityIcons
                      name={showDays ? "chevron-up" : "chevron-down"}
                      size={17}
                      color="#A3A3A3"
                    />
                  </Pressable>
                  {showDays && (
                    <View className="flex-row flex-wrap gap-2">
                      {DAYS.map((day, index) => {
                        const number = index + 1,
                          selected = values.days.includes(number);
                        return (
                          <Pressable
                            key={day}
                            accessibilityRole="checkbox"
                            accessibilityLabel={day}
                            accessibilityState={{ checked: selected, disabled: itemDisabled }}
                            disabled={itemDisabled}
                            onPress={() =>
                              change("workout", (previous) => ({
                                ...previous,
                                days: selected
                                  ? previous.days.filter((value) => value !== number)
                                  : [...previous.days, number].sort((a, b) => a - b),
                              }))
                            }
                            className={`min-h-11 min-w-14 items-center justify-center rounded-full px-3 ${selected ? "bg-white" : "bg-white/5"}`}
                          >
                            <Txt
                              className={`text-[11px] ${selected ? "text-black" : "text-muted"}`}
                            >
                              {day}
                            </Txt>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}
              {setting.enabled && (
                <Txt className="mt-2 text-[9px] leading-4 text-muted">
                  {item.kind !== "workout" ? "Every day · " : enrollment ? "Daily · " : ""}
                  {timezone}
                </Txt>
              )}
            </View>
          );
        })}
      </View>
      {!!quietKinds.length && (
        <Txt className="mt-4 text-[11px] leading-5 text-muted">
          {quietKinds.map((item) => item.title).join(" & ")} falls inside your saved quiet hours (
          {personal.quietStart}–{personal.quietEnd}) and will be skipped. Choose another time.
        </Txt>
      )}
      <Txt className="mt-4 text-[10px] leading-5 text-muted">
        Workout nudges follow your training schedule. Water and diet are daily check-ins.
      </Txt>
      {(permissionDenied || status.permission === "denied") && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open phone notification settings"
          onPress={() =>
            void Linking.openSettings().catch(() =>
              setError("Open your phone settings, then FitSync notifications."),
            )
          }
          className="mt-2 min-h-11 justify-center"
        >
          <Txt weight="medium" className="text-xs">
            Open phone notification settings
          </Txt>
        </Pressable>
      )}
    </Sheet>
  );
}
