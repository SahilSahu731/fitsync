import React, { useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { BlurTargetView, BlurView } from "expo-blur";
import Svg, { Path, Rect } from "react-native-svg";
import { MotionPressable as Pressable, ProgressFill } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { Icon } from "./visuals";
import { weightValue } from "./model";
import type { ProgressAnalytics } from "./analytics";

export function AdvancedInsights({
  isPro,
  checking,
  data,
  unit,
  onOpen,
}: {
  isPro: boolean;
  checking: boolean;
  data: ProgressAnalytics;
  unit: "kg" | "lb";
  onOpen: () => void;
}) {
  const target = useRef<View>(null);
  if (checking)
    return (
      <View className="mt-6 flex-row items-center gap-3 rounded-[24px] bg-panel p-5">
        <ActivityIndicator color="#D4B5FF" />
        <Txt className="text-xs text-muted">Checking your Pro access…</Txt>
      </View>
    );
  if (isPro) {
    const exercises = data.exercises
      .map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        volume: exercise.sessions
          .filter((session) => session.date >= data.start && session.date <= data.today)
          .reduce((sum, session) => sum + session.volume, 0),
      }))
      .filter((exercise) => exercise.volume > 0)
      .sort((a, b) => b.volume - a.volume);
    const total = exercises.reduce((sum, exercise) => sum + exercise.volume, 0);
    return (
      <View
        className="mt-7 rounded-[26px] border bg-panel p-5"
        style={{ borderColor: "#D4B5FF30" }}
      >
        <View className="flex-row items-center gap-2">
          <Icon name="star-four-points" size={18} color="#D4B5FF" />
          <Txt weight="medium" className="flex-1 text-base">
            Workload distribution
          </Txt>
          <Txt weight="semibold" className="text-[10px]" style={{ color: "#D4B5FF" }}>
            PRO
          </Txt>
        </View>
        <Txt className="mb-4 mt-2 text-xs leading-5 text-muted">
          External volume by exercise in this range.
        </Txt>
        {exercises.length ? (
          exercises.slice(0, 5).map((exercise) => (
            <View key={exercise.id} className="mb-4">
              <View className="mb-2 flex-row items-center gap-3">
                <Txt className="min-w-0 flex-1 text-xs" numberOfLines={1}>
                  {exercise.name}
                </Txt>
                <Txt className="text-[10px] text-muted">
                  {Math.round((exercise.volume / total) * 100)}% ·{" "}
                  {weightValue(exercise.volume, unit).toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}{" "}
                  {unit}
                </Txt>
              </View>
              <ProgressFill ratio={exercise.volume / total} color="#D4B5FF" height={5} />
            </View>
          ))
        ) : (
          <Txt className="mb-4 text-xs leading-5 text-muted">
            Complete weighted working sets to see how your training volume is distributed.
          </Txt>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={onOpen}
          className="min-h-11 flex-row items-center justify-between"
        >
          <Txt weight="medium" className="text-xs" style={{ color: "#D4B5FF" }}>
            More advanced analytics
          </Txt>
          <Icon name="arrow-top-right" size={18} color="#D4B5FF" />
        </Pressable>
      </View>
    );
  }
  return (
    <View
      className="mt-7 overflow-hidden rounded-[26px] border bg-panel"
      style={{ borderColor: "#D4B5FF30" }}
    >
      <View className="relative h-64">
        <BlurTargetView
          ref={target}
          importantForAccessibility="no-hide-descendants"
          style={{ flex: 1, padding: 24 }}
        >
          <View className="flex-row gap-4">
            <View className="flex-1 rounded-2xl bg-elevated p-3">
              <Svg width="100%" height={155} viewBox="0 0 140 160">
                <Path
                  d="M5 130 L25 110 L45 120 L65 80 L85 85 L105 45 L135 20"
                  stroke="#D4B5FF"
                  strokeWidth={5}
                  fill="none"
                />
                {[35, 65, 45, 85, 95, 120].map((height, i) => (
                  <Rect
                    key={i}
                    x={i * 23}
                    y={160 - height / 2}
                    width={14}
                    height={height / 2}
                    rx={4}
                    fill="#7DCFFF50"
                  />
                ))}
              </Svg>
            </View>
            <View className="flex-1 gap-3">
              {["82%", "61%", "95%", "48%"].map((width) => (
                <View key={width} className="h-6 rounded-lg bg-elevated">
                  <View
                    className="h-full rounded-lg"
                    style={{ width: width as `${number}%`, backgroundColor: "#C5F46040" }}
                  />
                </View>
              ))}
            </View>
          </View>
        </BlurTargetView>
        <BlurView
          blurTarget={target}
          blurMethod="dimezisBlurView"
          intensity={32}
          tint="dark"
          style={{ position: "absolute", inset: 0 }}
        />
        <View className="absolute inset-0 items-center justify-center bg-black/45 px-6">
          <View
            className="mb-3 flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{ backgroundColor: "#D4B5FF25" }}
          >
            <Icon name="lock-outline" size={13} color="#D4B5FF" />
            <Txt weight="semibold" className="text-[10px]" style={{ color: "#D4B5FF" }}>
              FITSYNC PRO
            </Txt>
          </View>
          <Txt weight="semibold" className="text-center text-xl">
            See the bigger picture
          </Txt>
          <Txt className="mt-2 text-center text-xs leading-5 text-white/80">
            Older history, workload distribution,{"\n"}muscle balance and deeper training insights.
          </Txt>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Explore Pro advanced analytics"
            onPress={onOpen}
            className="mt-4 min-h-11 flex-row items-center gap-2 rounded-full px-5"
            style={{ backgroundColor: "#D4B5FF" }}
          >
            <Txt weight="semibold" className="text-xs text-bg">
              Explore Pro
            </Txt>
            <Icon name="arrow-right" size={17} color={C.bg} />
          </Pressable>
        </View>
      </View>
      <Txt className="px-5 pb-4 text-center text-[10px] leading-4 text-muted">
        Illustrative preview · Your last 90 days of standard analytics stay free.
      </Txt>
    </View>
  );
}
