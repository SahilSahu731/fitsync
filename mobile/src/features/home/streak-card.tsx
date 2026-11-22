import React, { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { localDate } from "@/src/features/progress/model";

export type StreakInfo = {
  count: number;
  doneToday: boolean;
  week: { date: string; label: string; done: boolean; isToday: boolean }[];
};

export function computeStreak(
  workouts: { finished_at?: string | null }[],
  today: string,
): StreakInfo {
  const done = new Set<string>();
  for (const w of workouts) if (w.finished_at) done.add(localDate(new Date(w.finished_at)));

  const base = new Date();
  base.setHours(12, 0, 0, 0);
  const at = (back: number) => {
    const d = new Date(base);
    d.setDate(d.getDate() - back);
    return d;
  };

  // A streak stays alive until the end of today, so start from yesterday if today is empty
  let count = 0;
  let k = done.has(today) ? 0 : 1;
  while (count < 3650 && done.has(localDate(at(k)))) {
    count++;
    k++;
  }

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = at(6 - i);
    const date = localDate(d);
    return { date, label: "SMTWTFS"[d.getDay()], done: done.has(date), isToday: date === today };
  });

  return { count, doneToday: done.has(today), week };
}

const ORANGE = "#FB923C";
const FLAME = "#f0c90a";
const LIGHT = "#FFEDD5";
const DEEP = "#8c2604";

export function StreakCard({ streak, onPress }: { streak: StreakInfo; onPress: () => void }) {
  const [flame] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(0));
  const [sweep] = useState(() => new Animated.Value(0));
  const [pills] = useState(() => Array.from({ length: 7 }, () => new Animated.Value(0)));
  const [width, setWidth] = useState(360);

  const { count, doneToday, week } = streak;
  const alive = count > 0;
  const doneThisWeek = week.filter((d) => d.done).length;

  useEffect(() => {
    const loops: Animated.CompositeAnimation[] = [];
    let cancelled = false;

    const intro = Animated.stagger(
      60,
      pills.map((v) => Animated.spring(v, { toValue: 1, friction: 6, tension: 140, useNativeDriver: true })),
    );
    intro.start();

    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled || reduce) return;
      const breathe = (v: Animated.Value, ms: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
        );
      if (alive) loops.push(breathe(flame, 900));
      if (!doneToday) loops.push(breathe(pulse, 900));
      // Shine: a light band glides across the card, then rests
      loops.push(
        Animated.loop(
          Animated.sequence([
            Animated.delay(1200),
            Animated.timing(sweep, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            Animated.delay(2800),
            Animated.timing(sweep, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]),
        ),
      );
      loops.forEach((l) => l.start());
    });

    return () => {
      cancelled = true;
      intro.stop();
      loops.forEach((l) => l.stop());
    };
  }, [flame, pulse, sweep, pills, alive, doneToday]);

  // Animated values are the only inline props left; Tailwind can't express them
  const flameScale = flame.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] });
  const flameRotate = flame.interpolate({ inputRange: [0, 1], outputRange: ["-4deg", "4deg"] });
  const glow = flame.interpolate({ inputRange: [0, 1], outputRange: [0.14, 0.3] });
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] });
  const sweepX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-140, width + 140] });

  const title = alive ? `${count}-day streak` : "Start your streak";
  const sub = doneToday
    ? "You trained today. Nice work."
    : alive
      ? "Train today to keep it alive."
      : "Finish a workout to light it up.";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${sub} ${doneThisWeek} of 7 days this week.`}
      onPress={onPress}
      className="flex-1"
    >
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        className="min-h-[186px] flex-1 overflow-hidden rounded-[26px] border-[0.2px] border-[#FB923C]/20 border-t-[#FB923C]/50 bg-[#cf3c0b] px-4 py-4"
      >
        {/* Background (original) */}
        <Animated.View
          pointerEvents="none"
          className="absolute -bottom-[90px] -left-[70px] h-[220px] w-[220px] rounded-full bg-[#FB923C]"
          style={{ opacity: glow }}
        />
        <View
          pointerEvents="none"
          className="absolute -right-[60px] -top-[70px] h-[170px] w-[170px] rounded-full bg-[#a40e0e] opacity-10"
        />
        <View
          pointerEvents="none"
          className="absolute -bottom-5 -left-5 h-[120px] w-[120px] rounded-full border border-[#FB923C]/20"
        />
        <View
          pointerEvents="none"
          className="absolute bottom-1 left-1 h-[72px] w-[72px] rounded-full border border-[#FB923C]/10"
        />

        {/* Header */}
        <View className="flex-row items-center gap-1">
          <Animated.View
            className="h-[52px] w-[52px] items-center justify-center"
            style={{ transform: [{ scale: flameScale }, { rotate: flameRotate }] }}
          >
            <MaterialCommunityIcons name="fire" size={39} color={FLAME} />
          </Animated.View>
          <View className="flex-1">
            <View className="flex-row items-baseline gap-1.5">
              <Txt weight="medium" className="text-[36px] leading-[42px] tracking-[-1.5px] text-white">
                {count}
              </Txt>
              <Txt className="text-[14px] leading-[18px] text-white/80">day streak</Txt>
            </View>
            <Txt className="text-[12px] leading-4 text-white/75" numberOfLines={1}>
              {sub}
            </Txt>
          </View>
        </View>

        {/* Week track */}
        <View className="mt-auto pt-2">
          <View className="flex-row">
            {week.map((d, i) => {
              const linkLeft = d.done && i > 0 && week[i - 1].done;
              const linkRight = d.done && i < 6 && week[i + 1].done;
              return (
                <View key={d.date} className="h-[36px] flex-1 items-center justify-center">
                  {linkLeft && (
                    <Animated.View
                      pointerEvents="none"
                      className="absolute left-0 top-[16px] h-[4px] w-1/2 bg-[#e2e1df]"
                      style={{ opacity: pills[i] }}
                    />
                  )}
                  {linkRight && (
                    <Animated.View
                      pointerEvents="none"
                      className="absolute right-0 top-[16px] h-[4px] w-1/2 bg-[#FFEDD5]/60"
                      style={{ opacity: pills[i] }}
                    />
                  )}
                  {d.isToday && !d.done && (
                    <Animated.View
                      pointerEvents="none"
                      className="absolute h-[36px] w-[36px] rounded-full border-2 border-[#FFEDD5]"
                      style={{ opacity: ringOpacity, transform: [{ scale: ringScale }] }}
                    />
                  )}
                  <Animated.View
                    className={`h-[36px] w-[36px] items-center justify-center rounded-full ${
                      d.done ? "bg-[#FFEDD5]" : "border border-white/10 bg-black/30"
                    }`}
                    style={{ opacity: pills[i], transform: [{ scale: pills[i] }] }}
                  >
                    {d.done ? (
                      <MaterialCommunityIcons name="check-bold" size={18} color={DEEP} />
                    ) : !d.isToday ? (
                      <View className="h-1 w-1 rounded-full bg-white/35" />
                    ) : null}
                  </Animated.View>
                </View>
              );
            })}
          </View>

          <View className="mt-2 flex-row">
            {week.map((d) => (
              <View key={`l-${d.date}`} className="flex-1 items-center">
                <Txt className={`text-[10px] ${d.isToday ? "text-white" : "text-white/70"}`}>{d.label}</Txt>
              </View>
            ))}
          </View>
        </View>

        {/* Shine sweep, on top of everything */}
        <Animated.View
          pointerEvents="none"
          className="absolute -bottom-10 -top-10 left-0 w-[70px]"
          style={{ transform: [{ translateX: sweepX }] }}
        >
          <View className="flex-1 rotate-[20deg] bg-white/[0.12]" />
        </Animated.View>
      </View>
    </Pressable>
  );
}