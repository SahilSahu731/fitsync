import React, { useCallback } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useBilling } from "@/src/features/billing/billing-context";
import { ProgressRing, ProBadge } from "./program-visuals";
import { useFocusEffect, router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { useProgram } from "./program-context";
import { focusAction, programFocus } from "./program-view";
import { WorkoutAction } from "./workout-action";
import { GlassSurface, GOLD } from "@/src/components/glass-surface";

function GlassCard({
  children,
  delay = 0,
  shimmer = false,
}: {
  children: React.ReactNode;
  delay?: number;
  shimmer?: boolean;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(550).springify().damping(16)}
      className="mb-4 mt-3 overflow-hidden rounded-[28px] border border-white/10"
    >
      <GlassSurface accent="#FFFFFF" intensity={50} shimmer={shimmer} />
      {children}
    </Animated.View>
  );
}

export function ActiveProgramCard({ hideEmpty = false }: { hideEmpty?: boolean }) {
  const { isPro } = useBilling();
  const { active, loading, error, refresh } = useProgram();
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  if (!active && !loading && !error && hideEmpty) return null;

  if (!active)
    return (
      <GlassCard>
        <View className="p-4">
          {loading ? (
            <View className="flex-row items-center gap-3">
              <ActivityIndicator color={C.ink} />
              <Txt className="text-sm text-muted">Finding your place in the plan…</Txt>
            </View>
          ) : error ? (
            <View>
              <Txt weight="semibold">Your program couldn’t load</Txt>
              <Txt className="mt-1 text-sm text-muted">{error}</Txt>
              <View className="mt-2 flex-row gap-5">
                <Pressable accessibilityRole="button" onPress={() => void refresh()} className="py-2">
                  <Txt className="text-sm text-ink">Try again</Txt>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push("/explore/programs")}
                  className="py-2"
                >
                  <Txt className="text-sm text-muted">Browse programs</Txt>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/explore/programs")}
                className="flex-row items-center gap-3"
              >
                <View className="h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
                  <MaterialCommunityIcons name="calendar-check-outline" size={24} color={C.ink} />
                </View>
                <View className="flex-1">
                  <Txt weight="semibold">A plan for your next rep</Txt>
                  <Txt className="mt-1 text-xs text-muted">
                    Follow a program. Know what to train today.
                  </Txt>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={C.muted} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/programs")}
                className="mt-3 self-start py-1"
              >
                <Txt className="text-xs text-muted">Program history</Txt>
              </Pressable>
            </>
          )}
        </View>
      </GlassCard>
    );

  const { enrollment: e, analytics: a } = active;
  const focus = programFocus(active);
  const week = a.weeks.find((item) => item.week === active.week);
  const preview = focus.kind === "rest" || focus.kind === "upcoming";
  const resting = focus.kind === "rest" || focus.kind === "done";
  const planned = Math.min(week?.planned ?? e.days_per_week, 7);
  const done = week?.completed ?? 0;
  const open = () => router.push({ pathname: "/programs/[id]", params: { id: e.id } });

  return (
    <Animated.View
      entering={FadeInDown.duration(550).springify().damping(16)}
      className="mb-4 mt-3 overflow-hidden rounded-[28px] border border-white/10"
    >
      {/* Cover (or a gold fallback) sits behind everything */}
      {e.cover_url ? (
        <Image source={{ uri: e.cover_url }} contentFit="cover" style={StyleSheet.absoluteFill} />
      ) : (
        <LinearGradient
          colors={[`${GOLD}55`, "#0F0F0F"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {/* Darken for legibility, then frost it */}
      <LinearGradient
        colors={["rgba(10,10,10,0.35)", "rgba(10,10,10,0.88)"]}
        style={StyleSheet.absoluteFill}
      />
      <GlassSurface accent={GOLD} intensity={e.cover_url ? 28 : 45} shimmer={false} />

      {/* Header */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${e.program_name}, ${a.completed} of ${a.planned} workouts logged`}
        onPress={open}
        className="flex-row items-center gap-4 p-5 pb-4"
      >
        <View className="flex-1">
          <View className="mb-2 flex-row items-center gap-2">
            <Txt weight="medium" className="text-[8px]  text-ink">
              Your Program
            </Txt>
            {isPro && <ProBadge />}
          </View>
          <Txt weight="semibold" numberOfLines={2} className="text-[22px] leading-7">
            {e.program_name}
          </Txt>
          <Txt className="mt-1 text-xs">
            Week {active.week} of {e.duration_weeks}
          </Txt>

          {/* This week: one segment per planned workout */}
          <View className="mt-3 flex-row items-center gap-1.5">
            {Array.from({ length: planned }).map((_, i) => (
              <Animated.View
                key={i}
                entering={FadeIn.delay(250 + i * 70).duration(350)}
                style={{
                  flex: 1,
                  maxWidth: 36,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: i < done ? GOLD : "rgba(255,255,255,0.16)",
                }}
              />
            ))}
            <Txt className="ml-1.5 text-[11px] text-muted">
              {done}/{planned} this week
            </Txt>
          </View>
        </View>
        <ProgressRing percent={a.progressPercent} size={68} label="Program completion" />
      </Pressable>

      {/* Today panel, inset glass */}
      <View className="px-4 pb-4">
        <View className="rounded-[20px] border border-white/10 bg-black/30 p-3">
          <View className="mb-3 flex-row items-center gap-3">
            <View
              style={{
                width: 3,
                height: 34,
                borderRadius: 2,
                backgroundColor: resting ? "#D4D4D4" : GOLD,
              }}
            />
            <View className="flex-1">
              <Txt className="text-[11px] tracking-widest text-white">{focus.eyebrow}</Txt>
              <Txt weight="semibold" numberOfLines={2} className="mt-0.5 text-base">
                {focus.title}
              </Txt>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View program schedule"
              onPress={open}
              className="h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10"
            >
              <MaterialCommunityIcons name="play" size={20} color={C.ink} />
            </Pressable>
          </View>

          {focus.slot && !preview ? (
            <WorkoutAction
              slot={focus.slot}
              title={focusAction(focus) ?? undefined}
              quiet={focus.kind === "done"}
            />
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={open}
              className="flex-row items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3"
            >
              <Txt weight="semibold" className="text-sm">
                {preview ? "See the week ahead" : "View your plan"}
              </Txt>
              <MaterialCommunityIcons name="play" size={18} color={C.ink} />
            </Pressable>
          )}
        </View>

        {error && (
          <Txt className="mt-2 px-1 text-xs text-muted">
            Showing your last loaded plan. Open to refresh.
          </Txt>
        )}
      </View>
    </Animated.View>
  );
}