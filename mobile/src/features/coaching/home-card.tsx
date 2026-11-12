import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { useBilling } from "@/src/features/billing/billing-context";
import { nextSession, displayDate } from "./model";
import { useCoaching } from "./use-coaching";

export function CoachHomeCard({ compact = false }: { compact?: boolean }) {
  const { data, loading, error } = useCoaching();
  const { isPro } = useBilling();
  const next = nextSession(data?.plan ?? null);
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel="Open your personal plan"
      onPress={() => router.push("/coach")}
      className={
        compact
          ? "mb-3 overflow-hidden rounded-[22px] bg-panel p-4"
          : "mb-5 overflow-hidden rounded-[26px] bg-panel p-5"
      }
    >
      <View className={`${compact ? "mb-2" : "mb-4"} flex-row items-center gap-2`}>
        <MaterialCommunityIcons name="star-four-points-outline" size={18} color={C.ink} />
        <Txt weight="semibold" className="flex-1 text-xs tracking-[1.5px] text-ink">
          YOUR PERSONAL PLAN
        </Txt>
        {isPro && (
          <Txt weight="semibold" className="text-[11px] text-ink">
            PRO
          </Txt>
        )}
      </View>
      <View className="flex-row items-center gap-4">
        <View className="flex-1">
          <Txt
            weight="semibold"
            className={compact ? "text-base leading-6" : "text-[23px] leading-7"}
          >
            {next?.name ?? (data?.plan ? "Every session counts." : "Your next step starts here.")}
          </Txt>
          <Txt className={`${compact ? "mt-1 text-xs" : "mt-2 text-sm"} leading-5 text-muted`}>
            {error
              ? "Open your plan to reconnect."
              : next
                ? `${next.prescription.minutes} min · ${next.status === "active" ? "Ready to resume" : displayDate(next.date)}`
                : loading
                  ? "Loading your plan…"
                  : data?.plan
                    ? "Review your progress and choose your next plan."
                    : "Build a starting plan around your goal, time and equipment."}
          </Txt>
        </View>
        <View className="h-11 w-11 items-center justify-center rounded-full bg-ink">
          <MaterialCommunityIcons name="arrow-top-right" size={23} color={C.bg} />
        </View>
      </View>
    </MotionPressable>
  );
}
