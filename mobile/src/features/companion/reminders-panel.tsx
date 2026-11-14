import React, { useState } from "react";
import { Linking, Switch, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Txt } from "@/src/components/ui";
import { MotionPressable } from "@/src/components/motion";
import { useSession } from "@/src/context/session";
import { useBilling } from "../billing/billing-context";
import { useProgram } from "../program-follow/program-context";
import { GlassCard, ProButton, PRO } from "../pro/ui";
import { defaultReminders, type CompanionRecord, type ReminderPreferences } from "./api";
import { useCompanion } from "./companion-context";
import { validReminderPreferences } from "./reminder-model";
import { requestCompanionReminderPermission } from "./reminders";
import { getCompanionNativeAvailability, requestCompanionWidgetPin } from "./widget";
import { useCompanionNativeStatus } from "./native-status";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export function ReminderSettingsPanel() {
  const companion = useCompanion(),
    billing = useBilling(),
    { user } = useSession(),
    program = useProgram();
  const saved = companion.state.records.find(
    (item) => item.kind === "reminders" && item.id === "reminders",
  ) as CompanionRecord<"reminders"> | undefined;
  const [draft, setDraft] = useState<{ prefs: ReminderPreferences; revision: number } | null>(null);
  const prefs = draft?.prefs ?? saved?.data ?? defaultReminders();
  const revision = draft?.revision ?? saved?.revision ?? 0;
  const dirty = draft !== null;
  const [working, setWorking] = useState(false),
    [message, setMessage] = useState("");
  const status = useCompanionNativeStatus(user?.id ?? "");
  const native = getCompanionNativeAvailability();
  const change = (value: Partial<ReminderPreferences>) => {
    setDraft((current) => ({
      prefs: { ...(current?.prefs ?? saved?.data ?? defaultReminders()), ...value },
      revision: current?.revision ?? saved?.revision ?? 0,
    }));
    setMessage("");
  };
  async function run(action: () => Promise<void>) {
    setWorking(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please retry.");
    } finally {
      setWorking(false);
    }
  }
  const disabled = !billing.isPro || companion.loading || companion.busy || working;
  const field = (label: string, key: "time" | "quietStart" | "quietEnd" | "timezone") => (
    <View key={key} className="mt-3">
      <Txt className="mb-2 text-xs text-muted">{label}</Txt>
      <TextInput
        accessibilityLabel={label}
        value={prefs[key]}
        onChangeText={(text) => change({ [key]: text })}
        editable={!disabled}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={PRO.muted}
        className="rounded-2xl bg-white/5 px-4 py-3 text-white"
      />
    </View>
  );
  return (
    <View className="gap-5">
      <GlassCard>
        <Txt weight="medium" className="text-xl">
          Personal reminders
        </Txt>
        <Txt className="mt-2 text-xs leading-5 text-muted">
          Your preferences sync to your account. Each phone schedules its own reminders for the next
          14 days when you open FitSync. Planned rest days stay quiet; completed sessions remove
          their reminders.
        </Txt>
        {program.active?.enrollment.reminder_enabled && (
          <View className="mt-3">
            <Txt className="text-xs leading-5" style={{ color: PRO.gold }}>
              Your followed program already has reminders enabled. Personal reminders are paused to
              avoid duplicates. Program reminders use their existing time and do not include these
              custom quiet hours or Snooze. Turn program reminders off to use the personal
              preferences below.
            </Txt>
            <ProButton
              title="Manage program reminders"
              secondary
              onPress={() => {
                if (program.active)
                  router.push({
                    pathname: "/programs/[id]",
                    params: { id: program.active.enrollment.id },
                  });
              }}
            />
          </View>
        )}
        {!billing.isPro && (
          <View className="mt-3">
            <Txt className="text-xs text-muted">
              Your saved preferences stay available. Pro is required to change them and activate
              companion reminders.
            </Txt>
            <ProButton
              title="View Pro membership"
              onPress={() => router.push("/membership")}
              secondary
            />
          </View>
        )}
        <View className="mt-4 flex-row items-center justify-between">
          <Txt>Training reminders</Txt>
          <Switch
            accessibilityLabel="Training reminders"
            disabled={disabled}
            value={prefs.enabled}
            trackColor={{ false: "#363C40", true: PRO.accent }}
            thumbColor="#FFFFFF"
            onValueChange={(enabled) => {
              if (!enabled) {
                change({ enabled: false });
                return;
              }
              void run(async () => {
                if (!(await requestCompanionReminderPermission()))
                  throw new Error(
                    "Notifications are off. Open your phone settings to enable them.",
                  );
                change({ enabled: true });
              });
            }}
          />
        </View>
        {field("Reminder time · HH:mm", "time")}
        <Txt className="mb-2 mt-4 text-xs text-muted">Reminder weekdays</Txt>
        <View className="flex-row flex-wrap gap-2">
          {days.map((day, index) => {
            const value = index + 1,
              selected = prefs.days.includes(value);
            return (
              <MotionPressable
                key={day}
                accessibilityRole="checkbox"
                accessibilityLabel={day}
                accessibilityState={{ checked: selected, disabled }}
                disabled={disabled}
                onPress={() =>
                  change({
                    days: selected
                      ? prefs.days.filter((item) => item !== value)
                      : [...prefs.days, value].sort(),
                  })
                }
                className={`min-h-11 min-w-11 items-center justify-center rounded-xl px-2 ${selected ? "bg-white/15" : "bg-white/5"}`}
              >
                <Txt className="text-xs" style={{ color: selected ? PRO.accent : PRO.muted }}>
                  {day}
                </Txt>
              </MotionPressable>
            );
          })}
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">{field("Quiet hours start · HH:mm", "quietStart")}</View>
          <View className="flex-1">{field("Quiet hours end · HH:mm", "quietEnd")}</View>
        </View>
        <Txt className="mt-2 text-xs leading-5 text-muted">
          A reminder inside quiet hours is skipped. Matching start and end disables quiet hours.
          Snoozing waits until quiet hours end.
        </Txt>
        <View className="mt-3">
          <Txt className="mb-2 text-xs text-muted">Snooze minutes · 5–180</Txt>
          <TextInput
            accessibilityLabel="Snooze minutes"
            editable={!disabled}
            keyboardType="number-pad"
            value={String(prefs.snoozeMinutes)}
            onChangeText={(value) =>
              change({ snoozeMinutes: Number(value.replace(/[^0-9]/g, "")) })
            }
            className="rounded-2xl bg-white/5 px-4 py-3 text-white"
          />
        </View>
        {field("Timezone · for example Asia/Kolkata", "timezone")}
        <ProButton
          title="Save reminder preferences"
          loading={working || companion.busy}
          disabled={disabled || !dirty}
          onPress={() =>
            void run(async () => {
              if (!validReminderPreferences(prefs) || (prefs.enabled && !prefs.days.length))
                throw new Error(
                  "Choose valid times, a timezone, at least one weekday and a snooze between 5 and 180 minutes.",
                );
              if (prefs.enabled && !(await requestCompanionReminderPermission()))
                throw new Error("Enable phone notifications before saving active reminders.");
              await companion.save("reminders", "reminders", prefs, undefined, revision);
              setDraft(null);
              setMessage("Reminder preferences synced.");
            })
          }
        />
        {dirty && (
          <ProButton
            title="Reload saved preferences (replace draft)"
            secondary
            disabled={working || companion.loading || companion.busy}
            onPress={() =>
              void run(async () => {
                await companion.refresh();
                setDraft(null);
                setMessage("Saved preferences reloaded.");
              })
            }
          />
        )}
        {status.permission === "denied" && (
          <ProButton
            title="Open notification settings"
            secondary
            onPress={() =>
              void Linking.openSettings().catch(() =>
                setMessage("Open your phone settings, then FitSync notifications."),
              )
            }
          />
        )}
        <Txt className="mt-3 text-xs leading-5 text-muted">
          {status.scheduled} upcoming reminders on this phone
          {status.suppressedByQuietHours
            ? ` · ${status.suppressedByQuietHours} skipped during quiet hours`
            : ""}
          .
        </Txt>
        {!!(message || status.error) && (
          <Txt
            accessibilityRole="alert"
            className="mt-3 text-xs leading-5"
            style={{ color: PRO.gold }}
          >
            {message || status.error}
          </Txt>
        )}
      </GlassCard>
      <GlassCard>
        <Txt weight="medium" className="text-xl">
          FitSync on your home screen
        </Txt>
        <Txt className="mt-2 text-xs leading-5 text-muted">
          Your next session, weekly count and resume button use the same plan and workout log. The
          widget shows its sync date and asks you to reopen FitSync when its snapshot is over a day
          old.
        </Txt>
        <ProButton
          title={
            native.widgets === "available"
              ? "Add FitSync widget"
              : native.widgets === "requires-build"
                ? "Widget needs an updated Android build"
                : "Widgets are available on Android"
          }
          disabled={!billing.isPro || native.widgets !== "available" || working}
          onPress={() =>
            void run(async () => {
              const requested = await requestCompanionWidgetPin();
              setMessage(
                requested
                  ? "Confirm the widget on your Android home screen."
                  : "Your launcher does not support adding widgets from an app. Long-press the home screen, choose Widgets, then FitSync Today.",
              );
            })
          }
        />
      </GlassCard>
      <GlassCard>
        <Txt weight="medium" className="text-xl">
          Workout controls on a paired watch
        </Txt>
        <Txt className="mt-2 text-xs leading-5 text-muted">
          {native.wearableControls === "notification-mirroring"
            ? "Android workout notifications offer Log next set and Pause / Resume rest actions. Enable FitSync notification mirroring in your watch companion app. Compatibility depends on the watch and companion settings; actions open the phone app to apply the change. A set can be logged only after all required values have been entered."
            : "Paired-watch notification controls are available on Android."}
        </Txt>
        <Txt className="mt-3 text-xs leading-5 text-muted">
          There is no standalone watch app or watch-side workout editing in this version.
        </Txt>
      </GlassCard>
    </View>
  );
}
