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

export function CoachHomeCard() {
  const { data, loading, error } = useCoaching();
  const { isPro } = useBilling();
  const next = nextSession(data?.plan ?? null);
  return <MotionPressable accessibilityRole="button" accessibilityLabel="Open your personal plan" onPress={() => router.push("/coach")} className="mb-5 overflow-hidden rounded-[26px] border border-brand/30 bg-panel p-5">
    <View className="mb-4 flex-row items-center gap-2"><MaterialCommunityIcons name="star-four-points-outline" size={18} color={C.brand} /><Txt weight="semibold" className="flex-1 text-xs tracking-[1.5px] text-brand">YOUR PERSONAL PLAN</Txt>{isPro && <Txt weight="semibold" className="text-[10px] text-brand">PRO</Txt>}</View>
    <View className="flex-row items-center gap-4"><View className="flex-1"><Txt weight="bold" className="text-[23px] leading-7">{next?.name ?? (data?.plan ? "Every session counts." : "Your next step starts here.")}</Txt><Txt className="mt-2 text-sm leading-5 text-muted">{error ? "Open your plan to reconnect." : next ? `${next.prescription.minutes} min · ${next.status === "active" ? "Ready to resume" : displayDate(next.date)}` : loading ? "Loading your plan…" : data?.plan ? "Review your progress and choose your next plan." : "Build a starting plan around your goal, time and equipment."}</Txt></View><View className="h-11 w-11 items-center justify-center rounded-full bg-brand"><MaterialCommunityIcons name="arrow-top-right" size={23} color={C.bg} /></View></View>
  </MotionPressable>;
}
