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
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
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
    accent: "#FF7A59",
  },
  {
    kind: "water",
    title: "Water",
    icon: "water-outline",
    detail: "A daily hydration check-in",
    accent: "#4FC3F7",
  },
  {
    kind: "diet",
    title: "Diet",
    icon: "silverware-fork-knife",
    detail: "A daily nudge for food & nutrition",
    accent: "#7CE08A",
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

/* ----------------------------- presentation only ----------------------------- */

const rgba = (hex: string, alpha: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
};

/** A tappable field row: icon, label, current value, chevron. */
function FieldRow({
  icon,
  accent,
  label,
  value,
  chevron = "chevron-down",
  disabled,
  dimmed,
  accessibilityLabel,
  onPress,
}: {
  icon: IconName;
  accent: string;
  label: string;
  value: string;
  chevron?: IconName;
  disabled: boolean;
  dimmed?: boolean;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className="mt-3 min-h-12 flex-row items-center gap-2.5 rounded-xl px-3.5"
      style={{
        opacity: dimmed ? 0.4 : 1,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: rgba(accent, 0.16),
      }}
    >
      <MaterialCommunityIcons name={icon} size={17} color={accent} />
      <Txt className="text-sm text-muted">{label}</Txt>
      <Txt weight="medium" numberOfLines={1} className="min-w-0 flex-1 text-right text-sm">
        {value}
      </Txt>
      <MaterialCommunityIcons name={chevron} size={18} color="#A3A3A3" />
    </Pressable>
  );
}

/** A quiet inline notice with a tinted icon. */
function Notice({
  icon = "information-outline",
  tint = "#A3A3A3",
  children,
  action,
}: {
  icon?: IconName;
  tint?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <View
      className="mb-3 flex-row gap-3 rounded-2xl p-4"
      style={{ backgroundColor: rgba(tint, 0.09), borderWidth: 1, borderColor: rgba(tint, 0.25) }}
    >
      <MaterialCommunityIcons name={icon} size={18} color={tint} style={{ marginTop: 1 }} />
      <View className="min-w-0 flex-1">
        <Txt className="text-xs leading-5 text-muted">{children}</Txt>
        {action}
      </View>
    </View>
  );
}

const PREVIEWS: { icon: IconName; accent: string; title: string; body: string; when: string }[] = [
  {
    icon: "water-outline",
    accent: "#4FC3F7",
    title: "Time to hydrate",
    body: "You’re 2 glasses behind today. Tap to log one.",
    when: "now",
  },
  {
    icon: "silverware-fork-knife",
    accent: "#7CE08A",
    title: "Lunch check-in",
    body: "Add your meal and keep your calories on track.",
    when: "12:30 PM",
  },
  {
    icon: "weather-night",
    accent: "#B39DFF",
    title: "Wind down",
    body: "Log your sleep and close out the day.",
    when: "9:30 PM",
  },
];
const CARD_H = 78;
const STEP = 46;
const CARD_BG = ["#2A2A2D", "#202022", "#171718"];
const CARD_FADE = [1, 0.7, 0.45];
const PRO_FEATURES = ["Water & hydration", "Meals & calories", "Weigh-in check-ins", "Sleep wind-down"];

/** Notification-style cards stacked like a phone lock screen, fading back. */
function ProNotificationStack() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ height: CARD_H + STEP * (PREVIEWS.length - 1) }}
    >
      {PREVIEWS.map((item, i) => (
        <View
          key={item.title}
          style={{
            position: "absolute",
            top: i * STEP,
            left: i * 10,
            right: i * 10,
            height: CARD_H,
            zIndex: PREVIEWS.length - i,
            borderRadius: 20,
            backgroundColor: CARD_BG[i],
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.08)",
            shadowColor: "#000000",
            shadowOpacity: 0.45,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6 - i,
          }}
        >
          <View className="flex-1 flex-row gap-3 p-3" style={{ opacity: CARD_FADE[i] }}>
            <View
              className="h-9 w-9 items-center justify-center rounded-[10px]"
              style={{ backgroundColor: item.accent }}
            >
              <MaterialCommunityIcons name={item.icon} size={19} color="#0B0B0B" />
            </View>
            <View className="min-w-0 flex-1">
              <View className="flex-row items-center">
                <Txt className="min-w-0 flex-1 text-[11px] text-muted">FitSync</Txt>
                <Txt className="text-[11px] text-muted">{item.when}</Txt>
              </View>
              <Txt weight="semibold" numberOfLines={1} className="mt-0.5 text-[13px]">
                {item.title}
              </Txt>
              <Txt numberOfLines={1} className="mt-0.5 text-xs text-muted">
                {item.body}
              </Txt>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

/* ---------------------------------- logic ---------------------------------- */

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
  const disabled = loading || !companion.stateLoaded || working || companion.busy || !ownerId;
  const disabledFor = (kind: Kind) =>
    disabled || (kind === "workout" ? workoutUnavailable : !billing.isPro);
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
          if (
            (kind !== "workout" && !current.current.isPro) ||
            current.current.ownerId !== ownerId ||
            lock.current
          )
            return;
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
    const nextWithHabits = snapshot.workoutEdited
      ? mapped
      : {
          ...mapped,
          enabled: snapshot.base.enabled,
          time: snapshot.base.time,
          days: snapshot.base.days,
        };
    const next = billing.isPro ? nextWithHabits : { ...nextWithHabits, habits: {} };
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
    const requiresPro = Object.values(next.habits ?? {}).some((habit) => habit?.enabled);
    const valid = () =>
      current.current.ownerId === account &&
      (!requiresPro || current.current.isPro) &&
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

  const visibleItems = ITEMS.filter((item) => billing.isPro || item.kind === "workout");

  return (
    <Sheet
      eyebrow="A LITTLE NUDGE"
      title="Your reminders"
      subtitle="Make time for training. Build your daily routine."
      busy={working}
      onClose={close}
      footer={
        <>
          {!!error && (
            <Txt accessibilityRole="alert" className="mb-3 text-xs leading-5 text-red-300">
              {error}
            </Txt>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save reminders"
            accessibilityState={{ disabled: disabled || !draft, busy: working }}
            disabled={disabled || !draft}
            onPress={() => void save()}
            className="min-h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-white px-5"
            style={{ opacity: disabled || !draft ? 0.4 : 1 }}
          >
            {working && <ActivityIndicator color="#000000" />}
            <Txt weight="semibold" className="text-[15px] text-black">
              {working ? "Saving…" : "Save reminders"}
            </Txt>
          </Pressable>
        </>
      }
    >
      {loading && (
        <View className="mb-4 flex-row items-center gap-3">
          <ActivityIndicator color="#FFFFFF" />
          <Txt className="flex-1 text-xs text-muted">Opening your saved reminders…</Txt>
        </View>
      )}
      {!!sourceError && (
        <Notice
          icon="alert-circle-outline"
          tint="#FF8A80"
          action={
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
          }
        >
          {companion.stateLoaded
            ? "Showing your last loaded reminder settings."
            : "Your reminder settings haven’t loaded yet."}{" "}
          {sourceError}
        </Notice>
      )}
      {!!program.error && (
        <Notice
          icon="alert-circle-outline"
          tint="#FF8A80"
          action={
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
          }
        >
          Workout reminders couldn’t refresh. You can still change water and diet reminders.
        </Notice>
      )}
      {programChanged && (
        <View accessibilityRole="alert">
          <Notice icon="swap-horizontal" tint="#4FC3F7">
            Your training program changed. Reopen this sheet to edit workout reminders. Water and
            diet are still available.
          </Notice>
        </View>
      )}

      <View className="overflow-hidden rounded-3xl border bg-white/[0.035]">
        {visibleItems.map((item, index) => {
          const setting = values[item.kind];
          const itemDisabled = disabledFor(item.kind);
          const timezone =
            item.kind === "workout" && enrollment ? enrollment.timezone : personal.timezone;
          return (
            <View
              key={item.kind}
              className={`px-4 py-2 ${index > 0 ? "border-t border-white/[0.07]" : ""}`}
            >
              <View className="flex-row items-center gap-3.5">
                <View
                  className="h-11 w-11 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: rgba(item.accent, setting.enabled ? 0.22 : 0.12),
                    borderWidth: 1,
                    borderColor: rgba(item.accent, setting.enabled ? 0.5 : 0.18),
                  }}
                >
                  <MaterialCommunityIcons name={item.icon} size={22} color={item.accent} />
                </View>
                <View className="min-w-0 flex-1">
                  <View className="flex-row items-center gap-2">
                    <Txt weight="semibold" className="text-[15px]">
                      {item.title}
                    </Txt>
                    {item.kind === "workout" && (
                      <View className="rounded-md bg-white/10 px-1.5 py-0.5">
                        <Txt className="text-[9px] text-muted">Free</Txt>
                      </View>
                    )}
                  </View>
                  <Txt className="mt-0.5 text-xs leading-4 text-muted">
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
                  trackColor={{ false: "#333333", true: item.accent }}
                  thumbColor={setting.enabled ? "#FFFFFF" : "#A3A3A3"}
                />
              </View>

              {setting.enabled && (
                <>
                  <FieldRow
                    icon="clock-outline"
                    accent={item.accent}
                    label="Time"
                    value={timeText(setting.time)}
                    disabled={itemDisabled || !setting.enabled}
                    accessibilityLabel={`Choose ${item.title.toLowerCase()} reminder time`}
                    onPress={() => chooseTime(item.kind)}
                  />
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
                  {item.kind === "workout" && !enrollment && (
                    <>
                      <FieldRow
                        icon="calendar-outline"
                        accent={item.accent}
                        label="Repeat"
                        value={
                          values.days.length === 7
                            ? "Every day"
                            : values.days.length
                              ? values.days.map((day) => DAYS[day - 1]).join(" · ")
                              : "Choose workout days"
                        }
                        chevron={showDays ? "chevron-up" : "chevron-down"}
                        disabled={itemDisabled}
                        accessibilityLabel="Change workout reminder days"
                        onPress={() => setShowDays((value) => !value)}
                      />
                      {showDays && (
                        <View className="mt-3 flex-row gap-1.5">
                          {DAYS.map((day, dayIndex) => {
                            const number = dayIndex + 1,
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
                                className="h-11 flex-1 items-center justify-center rounded-xl"
                                style={{
                                  backgroundColor: selected ? item.accent : "rgba(255,255,255,0.06)",
                                }}
                              >
                                <Txt
                                  weight="medium"
                                  className={`text-xs ${selected ? "text-black" : "text-muted"}`}
                                >
                                  {day.charAt(0)}
                                </Txt>
                              </Pressable>
                            );
                          })}
                        </View>
                      )}
                    </>
                  )}
                  <Txt className="mt-3 text-[10px] leading-4 text-muted">
                    {item.kind !== "workout" ? "Every day · " : enrollment ? "Daily · " : ""}
                    {timezone}
                  </Txt>
                </>
              )}
            </View>
          );
        })}
      </View>

      <Txt className="mb-1 mt-3 px-1 text-[11px] leading-5 text-muted">
        Workout reminders follow your training schedule. Water and diet are daily check-ins.
      </Txt>

      {!!quietKinds.length && (
        <View className="mt-3">
          <Notice icon="weather-night" tint="#B39DFF">
            {quietKinds.map((item) => item.title).join(" & ")} falls inside your saved quiet hours (
            {personal.quietStart}–{personal.quietEnd}) and will be skipped. Choose another time.
          </Notice>
        </View>
      )}

      {(permissionDenied || status.permission === "denied") && (
        <View className="mt-3">
          <Notice
            icon="bell-off-outline"
            tint="#FFB74D"
            action={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open phone notification settings"
                onPress={() =>
                  void Linking.openSettings().catch(() =>
                    setError("Open your phone settings, then FitSync notifications."),
                  )
                }
                className="min-h-11 justify-center"
              >
                <Txt weight="medium" className="text-xs">
                  Open phone notification settings
                </Txt>
              </Pressable>
            }
          >
            Notifications are off for FitSync.
          </Notice>
        </View>
      )}

      {!billing.isPro && !billing.loading && (
        <View className="mt-8 overflow-hidden rounded-3xl border-none bg-[#121212] p-2">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View
                className="items-center justify-center rounded-[10px]"
               >
                <MaterialCommunityIcons name="crown-circle" size={24} color={"yellow"} />
              </View>
              <Txt weight="semibold" className="text-[15px]">
                FITSYNC Pro
              </Txt>
            </View>
            <MaterialCommunityIcons name="lock-outline" size={17} color="#737373" />
          </View>

          <View className="mt-5">
            <ProNotificationStack />
          </View>

          <Txt
            accessibilityRole="header"
            weight="semibold"
            className="mt-6 text-2xl leading-8 tracking-[-0.6px]"
          >
            Every nudge, right on time.
          </Txt>
          <Txt className="mt-1.5 text-sm leading-6 text-muted">
            Do it all with Pro. One routine for training, food and recovery.
          </Txt>

          <View className="mt-4 flex-row flex-wrap">
            {PRO_FEATURES.map((label) => (
              <View key={label} className="w-1/2 flex-row items-center gap-2 py-1.5 pr-2">
                <MaterialCommunityIcons name="check-circle" size={16} color={"yellow"} />
                <Txt className="min-w-0 flex-1 text-xs">{label}</Txt>
              </View>
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Explore Pro reminders"
            onPress={() => {
              onClose();
              router.push("/membership");
            }}
            className="mt-5 min-h-14 flex-row items-center justify-center gap-2 rounded-2xl px-5"
            style={{ backgroundColor: "yellow" }}
          >
            <Txt weight="semibold" className="text-[15px] text-black">
              Unlock all reminders with Pro
            </Txt>
            <MaterialCommunityIcons name="arrow-right" size={18} color="#000000" />
          </Pressable>
        </View>
      )}
    </Sheet>
  );
}
