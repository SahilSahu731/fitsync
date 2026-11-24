import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Txt } from "@/src/components/ui";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { C } from "@/src/constants/theme";
import { weightText } from "@/src/lib/weight";
import { trackEvent } from "@/src/services/telemetry";
import type { TargetPreview, UpgradeMoment } from "./moments";

export function targetText(row: TargetPreview, unit: "kg" | "lb") {
  const t = row.target.suggested;
  return `${t.weightKg === null ? "" : `${weightText(t.weightKg, unit)} ${unit} × `}${t.reps} reps`;
}
export function MomentCard({
  moment,
  unit,
  onDismiss,
  member = false,
  onRecover,
  busy = false,
  error,
}: {
  moment: UpgradeMoment;
  unit: "kg" | "lb";
  onDismiss?: () => void;
  member?: boolean;
  onRecover?: () => void;
  busy?: boolean;
  error?: string | null;
}) {
  const first = moment.targets?.[0];
  const open = () => {
    trackEvent("upgrade_moment_opened", { source: moment.source });
    router.push({ pathname: "/pro", params: { source: moment.source } });
  };
  return (
    <View className="mb-5 rounded-3xl border border-brand/25 bg-panel p-5">
      <View className="flex-row items-center justify-between gap-3">
        <Txt weight="semibold" className="text-[10px] tracking-wider text-brand">
          {moment.source === "weekly_review"
            ? "FROM YOUR WEEK"
            : moment.source === "missed_session"
              ? "A FRESH START"
              : "BUILT FROM YOUR WORKOUTS"}
        </Txt>
        {onDismiss && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={member ? "Dismiss session move" : "Dismiss Pro preview"}
            disabled={busy}
            onPress={onDismiss}
            className="h-11 w-11 items-center justify-center"
          >
            <MaterialCommunityIcons name="close" color={C.muted} size={20} />
          </Pressable>
        )}
      </View>
      <Txt weight="semibold" className="text-2xl leading-8">
        {moment.title}
      </Txt>
      <Txt className="mt-2 text-sm leading-6 text-muted">{moment.detail}</Txt>
      {moment.stats && (
        <View className="mt-4 flex-row gap-3">
          {[
            [moment.stats.workouts, "workouts"],
            [moment.stats.sets, "working sets"],
            [moment.stats.minutes, "minutes"],
          ].map(([value, label]) => (
            <View key={label} className="flex-1 rounded-xl bg-white/5 p-3">
              <Txt weight="semibold" className="text-lg">
                {value}
              </Txt>
              <Txt className="text-[10px] text-muted">{label}</Txt>
            </View>
          ))}
        </View>
      )}
      {moment.insights?.[0] && (
        <View className="mt-4 rounded-2xl bg-brand/5 p-4">
          <Txt weight="semibold">{moment.insights[0].title}</Txt>
          <Txt className="mt-2 text-sm leading-6">{moment.insights[0].text}</Txt>
        </View>
      )}
      {first && moment.source !== "weekly_review" && (
        <View className="mt-4 rounded-2xl bg-brand/5 p-4">
          <Txt className="text-xs text-muted">One next-session target · {first.name}</Txt>
          <Txt weight="semibold" className="mt-2 text-xl">
            {targetText(first, unit)}
          </Txt>
          <Txt className="mt-2 text-xs leading-5 text-muted">{first.target.reason}</Txt>
        </View>
      )}
      {(
        moment.insights?.slice(1).map((insight) => insight.title) ??
        moment.targets?.slice(1).map((target) => `${target.name} · next target`) ??
        []
      ).map((title, index) => (
        <View
          key={index}
          accessible
          accessibilityLabel={`${title}, unlock with Pro`}
          className="mt-3 flex-row items-center gap-3 rounded-xl bg-white/5 p-4"
        >
          <MaterialCommunityIcons name="lock-outline" size={17} color={C.muted} />
          <Txt className="flex-1 text-sm text-muted">{title}</Txt>
          <Txt className="text-xs text-brand">Pro</Txt>
        </View>
      ))}
      {!member && (
        <View className="mt-3 flex-row items-center gap-3 p-2">
          <MaterialCommunityIcons name="lock-outline" size={17} color={C.muted} />
          <Txt className="flex-1 text-xs leading-5 text-muted">
            Full progression review, plan adjustments and the rest of your insights with Pro.
          </Txt>
        </View>
      )}
      {!!error && (
        <Txt accessibilityRole="alert" className="mt-3 text-sm text-muted">
          {error}
        </Txt>
      )}
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={member && onRecover ? onRecover : open}
        className="mt-4 min-h-14 items-center justify-center rounded-2xl bg-brand px-4"
      >
        <Txt weight="semibold" className="text-center text-sm text-bg">
          {busy ? "Moving session…" : member ? "Confirm this move" : moment.action}
        </Txt>
      </Pressable>
      {!member && (
        <Txt className="mt-3 text-center text-xs text-muted">
          Workout logging and previous-session hints stay free.
        </Txt>
      )}
    </View>
  );
}
