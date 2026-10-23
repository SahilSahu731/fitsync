import React, { useCallback } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { useProgram } from "./program-context";
import { shortDate } from "./api";

export function ActiveProgramCard() {
  const { active, loading, error, refresh } = useProgram();
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  if (!active) return <View className="mb-4 mt-3 rounded-[22px] border border-border bg-panel p-4">
    {loading ? <View className="flex-row items-center gap-3"><ActivityIndicator color={C.brand} /><Txt className="text-sm text-muted">Loading your program…</Txt></View> : error ? <Pressable accessibilityRole="button" onPress={() => void refresh()}><Txt weight="semibold">Could not load your program</Txt><Txt className="mt-1 text-sm text-muted">{error}</Txt><Txt className="mt-2 text-sm text-brand">Tap to retry</Txt></Pressable> : <Pressable accessibilityRole="button" onPress={() => router.push("/explore/programs")} className="flex-row items-center gap-3"><View className="h-11 w-11 items-center justify-center rounded-2xl bg-brand/10"><MaterialCommunityIcons name="calendar-check-outline" size={24} color={C.brand} /></View><View className="flex-1"><Txt weight="semibold">Find your next program</Txt><Txt className="mt-1 text-xs text-muted">Follow a plan. See your progress here.</Txt></View><MaterialCommunityIcons name="chevron-right" size={22} color={C.muted} /></Pressable>}
    {!loading && !error && <Pressable accessibilityRole="button" onPress={() => router.push("/programs")} className="mt-3 self-start py-1"><Txt className="text-xs text-muted">Program history</Txt></Pressable>}
  </View>;
  const { enrollment: e, analytics: a } = active;
  const next = active.nextSlot;
  const subtitle = active.startsInDays > 0 ? `Starts ${shortDate(e.start_date)}` : active.todayPlan?.rest && next?.status !== "active" ? "Recovery day · Your next session is waiting" : next ? `${next.status === "active" ? "In progress" : "Up next"} · ${next.routineName}` : "All sessions logged";
  return <Pressable accessibilityRole="button" accessibilityLabel={`${e.program_name}. ${a.completed} of ${a.planned} workouts complete. View program progress.`} onPress={() => router.push({ pathname: "/programs/[id]", params: { id: e.id } })} className="mb-4 mt-3 rounded-[22px] border border-brand/30 bg-panel p-4">
    <View className="flex-row items-center gap-3"><View className="h-12 w-12 overflow-hidden rounded-2xl bg-brand/10">{e.cover_url ? <Image source={{ uri: e.cover_url }} style={{ width: 48, height: 48 }} contentFit="cover" /> : <View className="flex-1 items-center justify-center"><MaterialCommunityIcons name="calendar-check" size={26} color={C.brand} /></View>}</View><View className="flex-1"><Txt weight="bold" className="text-[10px] tracking-widest text-brand">FOLLOWING · WEEK {active.week} OF {e.duration_weeks}</Txt><Txt weight="bold" numberOfLines={1} className="mt-1 text-lg">{e.program_name}</Txt></View><MaterialCommunityIcons name="chevron-right" size={24} color={C.brand} /></View>
    <View className="mb-2 mt-4 flex-row justify-between"><Txt numberOfLines={1} className="mr-3 flex-1 text-xs text-muted">{subtitle}</Txt><Txt weight="semibold" className="text-xs">{a.completed}/{a.planned}</Txt></View><View className="h-1.5 overflow-hidden rounded-full bg-elevated"><View style={{ width: `${a.progressPercent}%`, height: "100%", backgroundColor: C.brand }} /></View>
    {error ? <Txt className="mt-2 text-xs text-muted">Could not refresh. Showing last loaded progress.</Txt> : null}
  </Pressable>;
}
