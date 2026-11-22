import React, { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

// Edit this list to match what Pro really includes.
const PERKS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "clipboard-list-outline",
    title: "Structured programs",
    body: "Follow plans built for your goal.",
  },
  { icon: "chart-line", title: "Deeper insights", body: "Trends and progress beyond the basics." },
  { icon: "human", title: "Every body part tracked", body: "Measure and track each muscle group." },
  {
    icon: "food-apple",
    title: "Nutrition & macros",
    body: "Calories and macros next to training.",
  },
];

// A tiny illustration for each perk, drawn with plain views
function PerkArt({ index }: { index: number }) {
  if (index === 0) {
    return (
      <View className="gap-[7px]">
        <View className="flex-row items-center gap-1.5">
          <View className="h-[7px] w-[7px] rounded-full bg-black" />
          <View className="h-[4px] w-[30px] rounded-full bg-black/25" />
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="h-[7px] w-[7px] rounded-full bg-black" />
          <View className="h-[4px] w-[22px] rounded-full bg-black/25" />
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="h-[7px] w-[7px] rounded-full border border-black/40" />
          <View className="h-[4px] w-[26px] rounded-full bg-black/15" />
        </View>
      </View>
    );
  }
  if (index === 1) {
    return (
      <View className="h-[34px] flex-row items-end gap-1">
        <View className="h-[12px] w-[6px] rounded-full bg-black/20" />
        <View className="h-[18px] w-[6px] rounded-full bg-black/20" />
        <View className="h-[14px] w-[6px] rounded-full bg-black/30" />
        <View className="h-[28px] w-[6px] rounded-full bg-black" />
        <View className="h-[22px] w-[6px] rounded-full bg-black/60" />
      </View>
    );
  }
  if (index === 2) {
    return (
      <View className="gap-[5px]">
        <View className="flex-row gap-[5px]">
          <View className="h-[8px] w-[8px] rounded-full bg-black" />
          <View className="h-[8px] w-[8px] rounded-full bg-black" />
          <View className="h-[8px] w-[8px] rounded-full bg-black/15" />
        </View>
        <View className="flex-row gap-[5px]">
          <View className="h-[8px] w-[8px] rounded-full bg-black" />
          <View className="h-[8px] w-[8px] rounded-full bg-black/15" />
          <View className="h-[8px] w-[8px] rounded-full bg-black/15" />
        </View>
        <View className="flex-row gap-[5px]">
          <View className="h-[8px] w-[8px] rounded-full bg-black/60" />
          <View className="h-[8px] w-[8px] rounded-full bg-black" />
          <View className="h-[8px] w-[8px] rounded-full bg-black/60" />
        </View>
      </View>
    );
  }
  return (
    <View className="gap-[7px]">
      <View className="h-[5px] w-[42px] overflow-hidden rounded-full bg-black/10">
        <View className="h-full w-[30px] rounded-full bg-black" />
      </View>
      <View className="h-[5px] w-[42px] overflow-hidden rounded-full bg-black/10">
        <View className="h-full w-[20px] rounded-full bg-black/60" />
      </View>
      <View className="h-[5px] w-[42px] overflow-hidden rounded-full bg-black/10">
        <View className="h-full w-[36px] rounded-full bg-black/35" />
      </View>
    </View>
  );
}

// White to soft grey, written out as literal classes so Tailwind can compile them.
// Swap this block for <LinearGradient> if expo-linear-gradient is installed.
const SHADES = [
  "bg-[#FFFFFF]",
  "bg-[#FCFCFD]",
  "bg-[#FAFAFA]",
  "bg-[#F7F7F8]",
  "bg-[#F4F4F5]",
  "bg-[#F1F1F3]",
  "bg-[#EFEFF1]",
  "bg-[#ECECEE]",
  "bg-[#E9E9EC]",
  "bg-[#E6E6E9]",
  "bg-[#E4E4E7]",
  "bg-[#E1E1E5]",
  "bg-[#DEDEE2]",
  "bg-[#DBDBE0]",
  "bg-[#D9D9DD]",
  "bg-[#D6D6DB]",
];

const DOT_ROWS = [0, 1, 2, 3];
const DOT_COLS = [0, 1, 2, 3, 4, 5];
const CYCLE_MS = 3000;

export function ProPromoCard({ isPro, onPress }: { isPro: boolean; onPress: () => void }) {
  const [w, setW] = useState(360);
  const [index, setIndex] = useState(0);
  const [sweep] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(0));
  // -1 = waiting below, 0 = visible, 1 = gone above
  const [swap] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loops: Animated.CompositeAnimation[] = [];
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled || reduce) return;
      loops.push(
        Animated.loop(
          Animated.sequence([
            Animated.delay(1400),
            Animated.timing(sweep, {
              toValue: 1,
              duration: 1500,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.delay(3000),
            Animated.timing(sweep, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]),
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, {
              toValue: 1,
              duration: 2400,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(pulse, {
              toValue: 0,
              duration: 2400,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
        ),
      );
      loops.forEach((l) => l.start());
    });

    return () => {
      cancelled = true;
      loops.forEach((l) => l.stop());
    };
  }, [sweep, pulse]);

  useEffect(() => {
    const timer = setInterval(() => {
      Animated.timing(swap, {
        toValue: 1,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;
        setIndex((i) => (i + 1) % PERKS.length);
        swap.setValue(-1);
        Animated.timing(swap, {
          toValue: 0,
          duration: 340,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      });
    }, CYCLE_MS);
    return () => {
      clearInterval(timer);
      swap.stopAnimation();
    };
  }, [swap]);

  // Animated values are the only inline props left; Tailwind can't express them
  const sweepX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-140, w + 140] });
  const fade = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const textOpacity = swap.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] });
  const textY = swap.interpolate({ inputRange: [-1, 0, 1], outputRange: [10, 0, -10] });
  const iconScale = swap.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.6, 1, 0.6] });
  const iconSpin = swap.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-30deg", "0deg", "30deg"],
  });

  const perk = PERKS[index];
  const label = isPro ? "Explore Pro" : "Unlock Pro";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isPro ? "Explore what is included in Pro" : "Unlock FitSync Pro"}
      onPress={onPress}
      className="flex-1"
    >
      <View
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        className="min-h-[186px] flex-1 overflow-hidden rounded-[28px] border border-black/10 border-t-white bg-white p-4"
      >
        {/* Gradient: a tilted stack of 16 shades, white at the top-left fading to soft grey */}
        <View pointerEvents="none" className="absolute -inset-[40%] rotate-[-24deg]">
          {SHADES.map((c, i) => (
            <View key={i} className={`flex-1 ${c}`} />
          ))}
        </View>

        {/* Pattern 1: fine diagonal hairlines fanning out of the top-right corner */}
        <Animated.View
          pointerEvents="none"
          className="absolute -right-[34px] -top-[70px] h-[220px] flex-row gap-[9px] rotate-[30deg]"
          style={{ opacity: fade }}
        >
          <View className="h-full w-px bg-black/[0.04]" />
          <View className="h-full w-px bg-black/[0.06]" />
          <View className="h-full w-px bg-black/[0.08]" />
          <View className="h-full w-px bg-black/10" />
          <View className="h-full w-px bg-black/[0.13]" />
          <View className="h-full w-px bg-black/[0.16]" />
          <View className="h-full w-px bg-black/20" />
          <View className="h-full w-px bg-black/25" />
        </Animated.View>

        {/* Pattern 2: small dot grid bleeding off the bottom-right corner */}
        <View pointerEvents="none" className="absolute -bottom-1 -right-1 gap-[9px] p-2">
          {DOT_ROWS.map((r) => (
            <View key={r} className="flex-row gap-[9px]">
              {DOT_COLS.map((c) => (
                <View key={c} className="h-[3px] w-[3px] rounded-full bg-black/20" />
              ))}
            </View>
          ))}
        </View>

        {/* Pattern 3: one long hairline cutting across the lower-left corner */}
        <View
          pointerEvents="none"
          className="absolute -bottom-[10px] -left-[60px] h-px w-[240px] -rotate-[28deg] bg-black/15"
        />
        <View
          pointerEvents="none"
          className="absolute -bottom-[2px] -left-[60px] h-px w-[200px] -rotate-[28deg] bg-black/10"
        />

        {/* Left-side artwork: oversized outline icons bleeding off the edge */}
        <View pointerEvents="none" className="absolute -left-[22px] top-[34px] -rotate-[22deg]">
          <MaterialCommunityIcons name="dumbbell" size={118} color="rgba(0,0,0,0.09)" />
        </View>
        <View pointerEvents="none" className="absolute left-[92px] top-[2px] rotate-[14deg]">
          <MaterialCommunityIcons
            name="lightning-bolt-outline"
            size={44}
            color="rgba(0,0,0,0.08)"
          />
        </View>
        <View pointerEvents="none" className="absolute -bottom-3 left-[120px] -rotate-[10deg]">
          <MaterialCommunityIcons name="run-fast" size={58} color="rgba(0,0,0,0.08)" />
        </View>

        {/* Floating icon chips, top-right */}
        <View pointerEvents="none" className="absolute right-4 top-4 flex-row items-start gap-1.5">
          <View className="mt-3 h-[30px] w-[30px] items-center justify-center rounded-full border border-white bg-white/70 shadow-md shadow-black/10">
            <MaterialCommunityIcons name="dumbbell" size={15} color="rgba(0,0,0,0.75)" />
          </View>
          <View className="h-[30px] w-[30px] items-center justify-center rounded-full border border-white bg-white/70 shadow-md shadow-black/10">
            <MaterialCommunityIcons name="heart-pulse" size={15} color="rgba(0,0,0,0.75)" />
          </View>
          <View className="mt-5 h-[30px] w-[30px] items-center justify-center rounded-full border border-white bg-white/70 shadow-md shadow-black/10">
            <MaterialCommunityIcons name="trophy-outline" size={15} color="rgba(0,0,0,0.75)" />
          </View>
        </View>

        {/* Plan label */}
        <View className="flex-row items-center gap-1.5 self-start overflow-hidden rounded-full bg-[#FACC15] px-3 py-1.5">
          <View pointerEvents="none" className="absolute inset-x-0 top-0 h-1/2 bg-white/35" />
          <MaterialCommunityIcons
            name={isPro ? "check-decagram" : "crown"}
            size={12}
            color="#000000"
          />
          <Txt weight="medium" className="text-[11px] leading-[13px] tracking-[0.2px] text-black">
            {isPro ? "FitSync Pro · Active" : "FitSync Pro"}
          </Txt>
        </View>

        {/* Glass panel with the rotating perk */}
        <View className="mt-3 flex-row items-center gap-3 rounded-[22px] border border-white bg-white/60 p-2.5 shadow-lg shadow-black/10">
          <View className="h-[50px] w-[50px] items-center justify-center rounded-full bg-black">
            <Animated.View
              style={{
                opacity: textOpacity,
                transform: [{ scale: iconScale }, { rotate: iconSpin }],
              }}
            >
              <MaterialCommunityIcons name={perk.icon} size={25} color="#FFFFFF" />
            </Animated.View>
          </View>
          <Animated.View
            className="flex-1"
            style={{ opacity: textOpacity, transform: [{ translateY: textY }] }}
          >
            <Txt
              weight="medium"
              className="text-[18px] leading-[22px] tracking-[-0.4px] text-black"
              numberOfLines={1}
            >
              {perk.title}
            </Txt>
            <Txt className="mt-0.5 text-[12px] leading-4 text-black/55" numberOfLines={1}>
              {perk.body}
            </Txt>
          </Animated.View>
          <Animated.View
            className="pr-1.5"
            style={{ opacity: textOpacity, transform: [{ translateY: textY }] }}
          >
            <PerkArt index={index} />
          </Animated.View>
        </View>

        {/* Perk icons + CTA */}
        <View className="mt-auto flex-row items-center justify-between pt-3">
          <View className="flex-row items-center gap-1.5">
            {PERKS.map((p, i) => {
              const on = i === index;
              return (
                <View
                  key={p.title}
                  className={`h-[28px] items-center justify-center rounded-full ${
                    on ? "w-[34px] bg-black" : "w-[28px] border border-black/10 bg-white/70"
                  }`}
                >
                  <MaterialCommunityIcons
                    name={p.icon}
                    size={14}
                    color={on ? "#FFFFFF" : "rgba(0,0,0,0.5)"}
                  />
                </View>
              );
            })}
          </View>

          <View className="flex-row items-center gap-1.5 overflow-hidden rounded-full bg-[#FACC15] py-2 pl-5 pr-4 shadow-md shadow-[#FACC15]/50">
            <View pointerEvents="none" className="absolute inset-x-0 top-0 h-1/2 bg-white/35" />
            <Txt weight="medium" className="text-[14px] leading-[18px] text-black">
              {label}
            </Txt>
            <MaterialCommunityIcons name="arrow-right" size={16} color="#000000" />
          </View>
        </View>

        {/* Shine sweep */}
        <Animated.View
          pointerEvents="none"
          className="absolute -bottom-10 -top-10 left-0 w-[60px]"
          style={{ transform: [{ translateX: sweepX }] }}
        >
          <View className="flex-1 rotate-[20deg] bg-white/50" />
        </Animated.View>
      </View>
    </Pressable>
  );
}
