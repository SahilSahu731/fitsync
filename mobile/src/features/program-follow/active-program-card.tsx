import React, { useCallback } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { features } from "@/src/config/features";
import { ProgressRing, ProBadge } from "./program-visuals";
import { useFocusEffect, router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { useProgram } from "./program-context";
import { focusAction, programFocus } from "./program-view";
import { WorkoutAction } from "./workout-action";

export function ActiveProgramCard() {
  const { active, loading, error, refresh } = useProgram();
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  if (!active) return (
    <View className="mb-4 mt-3 rounded-[24px] border border-border bg-panel p-4">
      {loading ? <View className="flex-row items-center gap-3"><ActivityIndicator color={C.brand} /><Txt className="text-sm text-muted">Finding your place in the plan…</Txt></View> : error ? (
        <View><Txt weight="semibold">Your program couldn’t load</Txt><Txt className="mt-1 text-sm text-muted">{error}</Txt><View className="mt-2 flex-row gap-5"><Pressable accessibilityRole="button" onPress={() => void refresh()} className="py-2"><Txt className="text-sm text-brand">Try again</Txt></Pressable><Pressable accessibilityRole="button" onPress={() => router.push("/explore/programs")} className="py-2"><Txt className="text-sm text-muted">Browse programs</Txt></Pressable></View></View>
      ) : (
        <><Pressable accessibilityRole="button" onPress={() => router.push("/explore/programs")} className="flex-row items-center gap-3"><View className="h-11 w-11 items-center justify-center rounded-2xl bg-brand/10"><MaterialCommunityIcons name="calendar-check-outline" size={24} color={C.brand} /></View><View className="flex-1"><Txt weight="semibold">A plan for your next rep</Txt><Txt className="mt-1 text-xs text-muted">Follow a program. Know what to train today.</Txt></View><MaterialCommunityIcons name="chevron-right" size={22} color={C.muted} /></Pressable><Pressable accessibilityRole="button" onPress={() => router.push("/programs")} className="mt-3 self-start py-1"><Txt className="text-xs text-muted">Program history</Txt></Pressable></>
      )}
    </View>
  );
  const { enrollment: e, analytics: a } = active;
  const focus = programFocus(active);
  const week = a.weeks.find(item => item.week === active.week);
  const preview = focus.kind === "rest" || focus.kind === "upcoming";
  const open = () => router.push({ pathname: "/programs/[id]", params: { id: e.id } });
  return (
    <View className="mb-4 mt-3 overflow-hidden rounded-[26px] border border-white/10 bg-panel">
      <View style={{ overflow: "hidden" }}>
        {e.cover_url && <Image source={{ uri: e.cover_url }} contentFit="cover" style={StyleSheet.absoluteFill} />}
        <LinearGradient colors={["#151515C0", "#151515F8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ padding: 18 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={`View ${e.program_name}, ${a.completed} of ${a.planned} workouts logged`} onPress={open} className="flex-row items-center gap-3">
            <View className="flex-1"><View className="mb-2 flex-row items-center gap-2"><Txt weight="semibold" className="text-[9px] tracking-widest text-brand">YOUR PROGRAM</Txt>{features.pro && <ProBadge />}</View><Txt weight="bold" numberOfLines={1} className="text-lg">{e.program_name}</Txt><Txt className="mt-1 text-[11px] text-muted">Week {active.week}/{e.duration_weeks} · {week?.completed ?? 0}/{week?.planned ?? e.days_per_week} this week</Txt></View>
            <ProgressRing percent={a.progressPercent} size={64} label="Program completion" />
          </Pressable>
        </LinearGradient>
      </View>
      <View className="px-4 pb-4 pt-2">
        <View className="mb-3 flex-row items-center gap-3"><View style={{ width: 3, height: 32, borderRadius: 2, backgroundColor: focus.kind === "rest" || focus.kind === "done" ? "#86EFAC" : C.brand }} /><View className="flex-1"><Txt className="text-[9px] tracking-widest text-muted">{focus.eyebrow}</Txt><Txt weight="semibold" numberOfLines={2} className="mt-1 text-base">{focus.title}</Txt></View><Pressable accessibilityRole="button" accessibilityLabel="View program schedule" onPress={open} className="h-11 w-11 items-center justify-center"><MaterialCommunityIcons name="arrow-top-right" size={22} color={C.muted} /></Pressable></View>
        {focus.slot && !preview ? <WorkoutAction slot={focus.slot} title={focusAction(focus) ?? undefined} quiet={focus.kind === "done"} /> : <Pressable accessibilityRole="button" onPress={open} className="flex-row items-center justify-between rounded-2xl bg-elevated px-4 py-3"><Txt weight="semibold" className="text-sm">{preview ? "See the week ahead" : "View your plan"}</Txt><MaterialCommunityIcons name="arrow-right" size={18} color={C.ink} /></Pressable>}
        {error && <Txt className="mt-2 text-xs text-muted">Showing your last loaded plan. Open to refresh.</Txt>}
      </View>
    </View>
  );
}
