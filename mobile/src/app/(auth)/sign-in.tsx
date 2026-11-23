/* eslint-disable react-hooks/immutability */
/* eslint-disable react-hooks/refs */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { cssInterop } from "nativewind";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
  RadialGradient,
} from "react-native-svg";
import Animated, {
  Easing,
  Extrapolation,
  FadeInDown,
  SlideInDown,
  cancelAnimation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { LegalLinks } from "@/src/components/legal-links";
import { MotionPressable } from "@/src/components/motion";
import { useAppAlert } from "@/src/components/app-dialog";
import { Txt } from "@/src/components/ui";
import { useSession } from "@/src/context/session";

// Let these third-party components accept `className`.
cssInterop(LinearGradient, { className: "style" });
cssInterop(GestureHandlerRootView, { className: "style" });

const LIME = "#C5F460";
const FEATURE_COUNT = 5;
const AUTO_ADVANCE_MS = 2900;
const SETTLE_MS = 540;

// Ambient glow behind the deck changes colour with the front card (last = first, for seamless wrap).
const GLOW_COLORS = [LIME, "#6EE79A", "#8C9BFF", "#FFC83D", "#5EEAD4", LIME];

function wrap(index: number): number {
  "worklet";
  return ((index % FEATURE_COUNT) + FEATURE_COUNT) % FEATURE_COUNT;
}

function circularOffset(index: number, position: number): number {
  "worklet";
  const half = FEATURE_COUNT / 2;
  return ((((index - position + half) % FEATURE_COUNT) + FEATURE_COUNT) % FEATURE_COUNT) - half;
}

const FEATURES = [
  {
    id: "training",
    kicker: "TRAIN WITH INTENTION",
    title: "Every rep counts.",
    description: "Log sets, reps and weights without slowing down your session.",
  },
  {
    id: "progress",
    kicker: "SEE YOUR PROGRESS",
    title: "Get stronger. See it.",
    description: "See the work add up with clear training history and progress charts.",
  },
  {
    id: "library",
    kicker: "EXPLORE MOVEMENT",
    title: "Find your next move.",
    description: "Discover exercises and build sessions around how you want to train.",
  },
  {
    id: "consistency",
    kicker: "STAY CONSISTENT",
    title: "Show up. Repeat.",
    description: "Build a routine you can return to, one workout at a time.",
  },
  {
    id: "overview",
    kicker: "ALL IN ONE PLACE",
    title: "Your fitness, in sync.",
    description: "Workouts, your exercise library and progress, connected in one app.",
  },
] as const;

type FeatureId = (typeof FEATURES)[number]["id"];
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function FloatArt({ active, children }: { active: boolean; children: React.ReactNode }) {
  const phase = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(phase);
    if (active) {
      phase.value = withRepeat(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    } else {
      phase.value = withTiming(0, { duration: 280 });
    }
    return () => cancelAnimation(phase);
  }, [active, phase]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(phase.value, [0, 1], [4, -9]) }],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

function useReveal(active: boolean, duration = 1200, delay = 120) {
  const value = useSharedValue(1);
  useEffect(() => {
    if (active) {
      value.value = 0.25;
      value.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic) }));
    } else {
      value.value = withTiming(1, { duration: 200 });
    }
    return () => cancelAnimation(value);
  }, [active, delay, duration, value]);
  return value;
}

function Tag({
  icon,
  label,
  textClass,
  iconColor,
  tone,
}: {
  icon: IconName;
  label: string;
  textClass: string;
  iconColor: string;
  /** background + border classes */
  tone: string;
}) {
  return (
    <View
      className={`flex-row items-center gap-1.5 self-start rounded-full bg-black px-[9px] py-1 ${tone}`}
    >
      <MaterialCommunityIcons name={icon} size={12} color={iconColor} />
      <Txt weight="semibold" className={`text-[9px] text-white ${textClass}`}>
        {label}
      </Txt>
    </View>
  );
}

/** Preview of an action button. Cards are previews, so this is visual only. */
function Cta({
  label,
  tone,
  textClass,
  arrowClass,
  arrowColor,
}: {
  label: string;
  /** background + border classes */
  tone: string;
  textClass: string;
  arrowClass: string;
  arrowColor: string;
}) {
  return (
    <View
      pointerEvents="none"
      className={`h-[38px] flex-row items-center justify-between rounded-xl border pl-3.5 pr-2 ${tone}`}
    >
      <Txt weight="semibold" className={`text-[13px] ${textClass}`}>
        {label}
      </Txt>
      <View className={`h-8 w-8 items-center justify-center rounded-full ${arrowClass}`}>
        <MaterialCommunityIcons name="arrow-right" size={18} color={arrowColor} />
      </View>
    </View>
  );
}

function MiniMetric({
  label,
  value,
  accent = LIME,
  icon = "arrow-top-right",
}: {
  label: string;
  value: string;
  accent?: string;
  icon?: IconName;
}) {
  return (
    <View className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
      <Txt className="text-[9px] tracking-[0.6px] text-[#9DAD9D]">{label}</Txt>
      <View className="mt-1 flex-row items-end justify-between">
        <Txt weight="semibold" className="text-[20px] leading-[23px] tracking-[-1px] text-white">
          {value}
        </Txt>
        <MaterialCommunityIcons name={icon} size={15} color={accent} />
      </View>
    </View>
  );
}

function FloatChip({
  icon,
  label,
  accent,
  position,
}: {
  icon: IconName;
  label: string;
  accent: string;
  /** absolute-position classes, e.g. "left-0 top-[12%]" */
  position: string;
}) {
  return (
    <View
      pointerEvents="none"
      className={`absolute flex-row items-center gap-1.5 rounded-xl border border-white/10 bg-black/40 px-[9px] py-1.5 ${position}`}
    >
      <MaterialCommunityIcons name={icon} size={13} color={accent} />
      <Txt weight="semibold" className="text-[10px] tracking-[0.6px] text-white">
        {label}
      </Txt>
    </View>
  );
}

/** One filled/empty segment. Filled segments light up one after another. */
function Segment({
  reveal,
  index,
  filled,
}: {
  reveal: SharedValue<number>;
  index: number;
  filled: boolean;
}) {
  const fillStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      reveal.value,
      [0.25 + index * 0.07, 0.4 + index * 0.07],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));
  return (
    <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#495544]">
      {filled && <Animated.View className="absolute inset-0 rounded bg-brand" style={fillStyle} />}
    </View>
  );
}

type CardProps = { active: boolean; width: number; height: number };

function TrainingCard({ active, height }: CardProps) {
  const compact = height < 366;
  const reveal = useReveal(active, 1100);

  return (
    <View className="flex-1 overflow-hidden rounded-[28px]">
      <LinearGradient
        colors={["#EEFFC4", "#C5F460", "#8FC52A"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="absolute inset-0"
      />
      <View
        pointerEvents="none"
        className="absolute -right-[90px] top-[16%] h-[250px] w-[250px] rounded-full border border-[#193C0B]/20"
      />

      <View className="flex-1 px-5 pb-4 pt-4">
        <View className="flex-row items-center justify-between">
          <Tag
            icon="dumbbell"
            label="Workout Logger"
            textClass="text-[#14200D]"
            iconColor="#fff"
            tone="bg-[#14200D]/10 border-[#14200D]/20"
          />
          <View className="flex-row items-center gap-1">
            <MaterialCommunityIcons name="timer-outline" size={14} color="#2E4D1D" />
            <Txt weight="semibold" className="text-[11px] text-[#2E4D1D]">
              24:18
            </Txt>
          </View>
        </View>

        <Txt
          weight="bold"
          className={`${compact ? "mt-3 text-[36px] leading-[36px]" : "mt-4 text-[42px] leading-[42px]"} tracking-[-2.8px] text-[#14200D]`}
        >
          EVERY REP.{"\n"}
          <Txt weight="semibold" className="text-[#4F7A20]">
            Counts.
          </Txt>
        </Txt>

        <View
          pointerEvents="none"
          className="absolute -left-[33px] -right-[33px] top-[37%] h-[21%] -rotate-[19deg]"
        >
          <FloatArt active={active}>
            <Svg viewBox="0 0 380 115" width="100%" height={height * 0.22}>
              <Defs>
                <SvgLinearGradient id="barMetal" x1="0" x2="0" y1="0" y2="1">
                  <Stop offset="0" stopColor="#F3F9E6" />
                  <Stop offset="0.38" stopColor="#879A7C" />
                  <Stop offset="0.7" stopColor="#344235" />
                  <Stop offset="1" stopColor="#DBE4CB" />
                </SvgLinearGradient>
                <SvgLinearGradient id="plateMetal" x1="0" x2="1" y1="0" y2="0">
                  <Stop offset="0" stopColor="#182B1B" />
                  <Stop offset="0.25" stopColor="#758E65" />
                  <Stop offset="0.58" stopColor="#111B12" />
                  <Stop offset="1" stopColor="#4B6750" />
                </SvgLinearGradient>
              </Defs>
              <Rect x="6" y="54" width="368" height="9" rx="4" fill="url(#barMetal)" />
              <Rect x="64" y="51" width="250" height="15" rx="4" fill="url(#barMetal)" />
              <Rect
                x="24"
                y="16"
                width="31"
                height="85"
                rx="7"
                fill="url(#plateMetal)"
                stroke="#8EAC7B"
              />
              <Rect
                x="49"
                y="27"
                width="25"
                height="63"
                rx="5"
                fill="url(#plateMetal)"
                stroke="#789666"
              />
              <Rect
                x="306"
                y="27"
                width="25"
                height="63"
                rx="5"
                fill="url(#plateMetal)"
                stroke="#789666"
              />
              <Rect
                x="325"
                y="16"
                width="31"
                height="85"
                rx="7"
                fill="url(#plateMetal)"
                stroke="#8EAC7B"
              />
              <Rect x="34" y="22" width="3" height="73" rx="1.5" fill="#DDFEB4" opacity="0.45" />
              <Rect x="341" y="22" width="3" height="73" rx="1.5" fill="#DDFEB4" opacity="0.45" />
            </Svg>
          </FloatArt>
        </View>

        <View className="mt-auto rounded-2xl bg-[#000000] px-4 pb-3 pt-3">
          <View className="flex-row items-center justify-between">
            <Txt className="text-[9px] text-[#ACB7A8]">Today&apos;s Session</Txt>
            <View className="flex-row items-center gap-1.5">
              <View className="h-1.5 w-1.5 rounded-full bg-brand" />
              <Txt className="text-[9px] text-brand">In Progress</Txt>
            </View>
          </View>
          <View className="mb-3 mt-1 flex-row items-end justify-between">
            <Txt weight="semibold" className="text-[16px] tracking-[-0.6px] text-white">
              Upper body strength
            </Txt>
            <Txt className="text-[10px] text-[#9DAD9D]">Set 6 / 8</Txt>
          </View>
          <View className="flex-row gap-1">
            {Array.from({ length: 8 }, (_, i) => (
              <Segment key={i} reveal={reveal} index={i} filled={i < 6} />
            ))}
          </View>
          <View className="mt-3">
            <Cta
              label="Resume Workout"
              tone="bg-white"
              textClass="text-[#14200D]"
              arrowClass="bg-[#14200D]"
              arrowColor={"white"}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

/** 2. Dark green card, graph-paper grid, animated trend + analytics button. */
/*
 * PROGRESS CARD (v2): animated bar graph + trend line, "NEW PR" chip, floating background art.
 *
 * HOW TO USE
 * 1. In your react-native-svg import list, add `RadialGradient`:
 *      import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";
 * 2. Delete the old `function ProgressCard ...` and paste this whole block in its place.
 *    (It reuses things you already have: useReveal, Txt, MiniMetric, Cta, LIME, AnimatedCircle,
 *     LinearGradient, MaterialCommunityIcons, and the reanimated imports.)
 */

/* ---------- sample data (bars + trend share one scale) ---------- */
const VOLUME_BARS = [34, 48, 42, 60, 54, 72, 66, 88];
const VOLUME_TREND = [38, 42, 47, 53, 58, 65, 74, 90];
const PLOT_SCALE = 0.76; // leaves headroom above the tallest bar for the "NEW PR" chip
const BAR_GAP = 6;

/** Smooth curve through points (Catmull-Rom converted to cubic beziers). */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  const f = (n: number) => Math.round(n * 10) / 10;
  let d = `M${f(points[0].x)} ${f(points[0].y)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2.x)} ${f(p2.y)}`;
  }
  return d;
}

/** 4-point sparkle. */
function Sparkle({ size = 14, color = LIME, opacity = 0.6 }: { size?: number; color?: string; opacity?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 0C13 7 17 11 24 12C17 13 13 17 12 24C11 17 7 13 0 12C7 11 11 7 12 0Z"
        fill={color}
        opacity={opacity}
      />
    </Svg>
  );
}

/** Gently floats its children (only while the card is active). Purely decorative. */
function Drift({
  active,
  className,
  delay = 0,
  duration = 3400,
  dx = 0,
  dy = 7,
  rotate = 0,
  opacity = 1,
  children,
}: {
  active: boolean;
  /** absolute-position classes, e.g. "left-[22px] top-[40%]" */
  className: string;
  delay?: number;
  duration?: number;
  dx?: number;
  dy?: number;
  rotate?: number;
  opacity?: number;
  children: React.ReactNode;
}) {
  const phase = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(phase);
    if (active) {
      phase.value = withDelay(
        delay,
        withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true),
      );
    } else {
      phase.value = withTiming(0, { duration: 280 });
    }
    return () => cancelAnimation(phase);
  }, [active, delay, duration, phase]);

  const style = useAnimatedStyle(() => ({
    opacity,
    transform: [
      { translateX: interpolate(phase.value, [0, 1], [-dx, dx]) },
      { translateY: interpolate(phase.value, [0, 1], [dy, -dy]) },
      { rotate: `${interpolate(phase.value, [0, 1], [-rotate, rotate])}deg` },
    ],
  }));

  return (
    <Animated.View pointerEvents="none" className={`absolute ${className}`} style={style}>
      {children}
    </Animated.View>
  );
}

/** One bar that grows up from the baseline, staggered left to right. */
function VolumeBar({
  reveal,
  index,
  value,
  chartH,
  highlight,
}: {
  reveal: SharedValue<number>;
  index: number;
  value: number;
  chartH: number;
  highlight: boolean;
}) {
  const target = (value / 100) * chartH * PLOT_SCALE;
  const style = useAnimatedStyle(() => ({
    height: interpolate(
      reveal.value,
      [0.25 + index * 0.045, 0.6 + index * 0.045],
      [3, target],
      Extrapolation.CLAMP,
    ),
  }));
  return (
    <Animated.View className="flex-1 overflow-hidden rounded-t-[7px] rounded-b-[3px]" style={style}>
      <LinearGradient
        colors={highlight ? ["#EFFFC2", LIME] : ["rgba(197,244,96,0.55)", "rgba(197,244,96,0.08)"]}
        className="absolute inset-0"
      />
    </Animated.View>
  );
}

function ProgressCard({ active, height }: CardProps) {
  const compact = height < 370;
  const chartH = compact ? 92 : 104;
  const reveal = useReveal(active, 1500);
  const [plotW, setPlotW] = useState(0);

  // Chart geometry: line points sit exactly on the bar centres.
  const points = useMemo(() => {
    if (!plotW) return [];
    const n = VOLUME_TREND.length;
    const bw = (plotW - BAR_GAP * (n - 1)) / n;
    return VOLUME_TREND.map((v, i) => ({
      x: i * (bw + BAR_GAP) + bw / 2,
      y: chartH - (v / 100) * chartH * PLOT_SCALE,
    }));
  }, [plotW, chartH]);

  const linePath = useMemo(() => smoothPath(points), [points]);
  const lineLen = useMemo(
    () =>
      Math.ceil(
        points.reduce(
          (sum, p, i) => (i ? sum + Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y) : 0),
          0,
        ) * 1.15,
      ),
    [points],
  );
  const last = points[points.length - 1];

  const lenSv = useSharedValue(1);
  useEffect(() => {
    lenSv.value = lineLen || 1;
  }, [lineLen, lenSv]);

  // The line draws after the bars have started growing.
  const lineProps = useAnimatedProps(() => {
    const p = Math.min(1, Math.max(0, (reveal.value - 0.25) / 0.75));
    return { strokeDashoffset: lenSv.value * (1 - p) };
  });
  const dotProps = useAnimatedProps(() => ({
    opacity: interpolate(reveal.value, [0.8, 1], [0, 1], Extrapolation.CLAMP),
  }));
  const chipStyle = useAnimatedStyle(() => ({
    opacity: interpolate(reveal.value, [0.85, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(reveal.value, [0.85, 1], [6, 0], Extrapolation.CLAMP) }],
  }));

  return (
    <View className="flex-1 overflow-hidden rounded-[28px]">
      <LinearGradient
        colors={["#35513A", "#1A261D", "#0A0F0C"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.3, y: 1 }}
        className="absolute inset-0"
      />

      {/* Backdrop: lime glow, orbit rings, ghost trophy (static, behind everything) */}
      <Svg
        pointerEvents="none"
        width="100%"
        height="100%"
        viewBox="0 0 342 380"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <Defs>
          <RadialGradient  id="pgGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={LIME} stopOpacity="0.2" />
            <Stop offset="1" stopColor={LIME} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="300" cy="46" r="170" fill="url(#pgGlow)" />
        <Circle cx="318" cy="96" r="84" fill="none" stroke={LIME} strokeOpacity="0.1" strokeDasharray="2 7" />
        <Circle cx="318" cy="96" r="136" fill="none" stroke={LIME} strokeOpacity="0.06" strokeDasharray="2 9" />
      </Svg>
      <View pointerEvents="none" className="absolute -right-[26px] top-[36%]">
        <MaterialCommunityIcons name="trophy-outline" size={150} color="rgba(197,244,96,0.05)" />
      </View>

      {/* Floating decorations (drift gently while this card is active) */}
      <Drift active={active} className="left-[46%] top-[62px]" dy={5} rotate={12} duration={3000}>
        <Sparkle size={14} opacity={0.7} />
      </Drift>
      <Drift active={active} className="left-[18px] top-[41%]" dy={8} duration={3800} opacity={0.8}>
        <View className="h-9 w-9 items-center justify-center rounded-full border border-brand/25 bg-brand/10">
          <MaterialCommunityIcons name="arrow-top-right" size={17} color={LIME} />
        </View>
      </Drift>
      <Drift active={active} className="left-[34%] top-[43%]" dy={6} dx={3} delay={500} duration={3300}>
        <Sparkle size={9} opacity={0.5} />
      </Drift>
      <Drift active={active} className="left-[22%] top-[34%]" dy={5} rotate={10} delay={900} duration={4200} opacity={0.55}>
        <MaterialCommunityIcons name="plus" size={14} color="#DFF7A8" />
      </Drift>
      <Drift active={active} className="right-[96px] top-[31%]" dy={6} rotate={-10} delay={300} duration={3600} opacity={0.5}>
        <MaterialCommunityIcons name="lightning-bolt" size={15} color={LIME} />
      </Drift>

      <View className="flex-1 px-5 pb-4 pt-4">
        {/* Range tabs */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row rounded-full bg-white p-[3px]">
            {["1W", "1M", "3M"].map((range) => (
              <View
                key={range}
                className={`rounded-full px-2.5 py-[3px] ${range === "1M" ? "bg-black" : ""}`}
              >
                <Txt
                  weight="semibold"
                  className={`text-[9px] tracking-[0.8px] ${range === "1M" ? "text-white" : "text-[#1e201e]"}`}
                >
                  {range}
                </Txt>
              </View>
            ))}
          </View>
          <View className="flex-row items-center gap-1">
            <MaterialCommunityIcons name="chart-timeline-variant" size={15} color={LIME} />
            <Txt className="text-[9px] text-[#dbdfd9]">Progress</Txt>
          </View>
        </View>

        <View className={`${compact ? "mt-5" : "mt-6"} flex-row items-start justify-between`}>
          <Txt
            weight="semibold"
            className={`${compact ? "text-[34px] leading-[34px]" : "text-[39px] leading-[38px]"} tracking-[-2.5px] text-white`}
          >
            UP.{"\n"}AND{" "}
            <Txt weight="bold" className="text-brand">
              UP.
            </Txt>
          </Txt>
          <View className="items-end rounded-xl bg-black px-3 py-1.5">
            <Txt
              weight="semibold"
              className={`${compact ? "text-[22px]" : "text-[26px]"} text-brand`}
            >
              +12%
            </Txt>
            <Txt className="text-[9px] tracking-[1.1px] text-[#ecf0ea]">30-day volume</Txt>
          </View>
        </View>

        <View className="mt-auto">
          {/* Chart: bars + smooth trend line share one coordinate system */}
          <View
            style={{ height: chartH }}
            onLayout={(e) => setPlotW(Math.round(e.nativeEvent.layout.width))}
          >
            {/* bars */}
            <View className="absolute inset-0 flex-row items-end" style={{ gap: BAR_GAP }}>
              {VOLUME_BARS.map((value, i) => (
                <VolumeBar
                  key={i}
                  reveal={reveal}
                  index={i}
                  value={value}
                  chartH={chartH}
                  highlight={i === VOLUME_BARS.length - 1}
                />
              ))}
            </View>

            {/* grid + trend line + endpoint */}
            {plotW > 0 && last && (
              <Svg
                pointerEvents="none"
                width={plotW}
                height={chartH}
                style={{ position: "absolute", top: 0, left: 0 }}
              >
                {[0.25, 0.5, 0.75].map((f) => (
                  <Path
                    key={f}
                    d={`M0 ${chartH * f}H${plotW}`}
                    stroke="#B8CEB9"
                    strokeOpacity="0.14"
                    strokeWidth={0.8}
                    strokeDasharray="3 7"
                  />
                ))}
                <Path
                  d={`M0 ${chartH - 0.5}H${plotW}`}
                  stroke="#B8CEB9"
                  strokeOpacity="0.22"
                  strokeWidth={1}
                />
                {/* soft glow under the line */}
                <AnimatedPath
                  d={linePath}
                  fill="none"
                  stroke={LIME}
                  strokeWidth={8}
                  strokeOpacity={0.12}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={`${lineLen}`}
                  animatedProps={lineProps}
                />
                <AnimatedPath
                  d={linePath}
                  fill="none"
                  stroke={LIME}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={`${lineLen}`}
                  animatedProps={lineProps}
                />
                <AnimatedCircle cx={last.x} cy={last.y} r={9} fill={LIME} fillOpacity={0.16} animatedProps={dotProps} />
                <AnimatedCircle cx={last.x} cy={last.y} r={4} fill={LIME} animatedProps={dotProps} />
                <AnimatedCircle cx={last.x} cy={last.y} r={1.6} fill="#FFFFFF" animatedProps={dotProps} />
              </Svg>
            )}

            {/* "NEW PR" chip above the latest bar */}
            {plotW > 0 && last && (
              <Animated.View
                pointerEvents="none"
                className="absolute right-0 flex-row items-center gap-1 rounded-full border border-brand/40 bg-black px-2 py-1"
                style={[{ top: Math.max(0, last.y - 31) }, chipStyle]}
              >
                <MaterialCommunityIcons name="trophy-outline" size={11} color={LIME} />
                <Txt weight="semibold" className="text-[9px] tracking-[0.8px] text-white">
                  NEW PR
                </Txt>
              </Animated.View>
            )}
          </View>

          <View className="mt-1.5 flex-row justify-between">
            <Txt className="text-[8px] tracking-[1px] text-[#7E8F7F]">8 WEEKS AGO</Txt>
            <Txt className="text-[8px] tracking-[1px] text-[#C5D2C5]">THIS WEEK</Txt>
          </View>

          {!compact && (
            <View className="mt-2 flex-row gap-2">
              <MiniMetric label="PERSONAL BESTS" value="7" />
              <MiniMetric label="WORKOUTS LOGGED" value="48" />
            </View>
          )}
          <View className="mt-2">
            <Cta
              label="See your progress"
              tone=" bg-white "
              textClass="text-black"
              arrowClass="bg-black"
              arrowColor="#fff"
            />
          </View>
        </View>
      </View>
    </View>
  );
}
const EXERCISES = [
  { name: "Barbell Squat", sub: "LEGS / COMPOUND", icon: "weight-lifter" as const, level: 3 },
  { name: "Bench Press", sub: "CHEST / COMPOUND", icon: "dumbbell" as const, level: 2 },
  { name: "Shoulder Press", sub: "SHOULDERS / PUSH", icon: "arm-flex" as const, level: 2 },
];
const CHIPS = ["All", "Chest", "Back", "Legs"];
// const INDIGO = "#8C9BFF";

/** 3. Indigo night card, dot matrix, search + filters + exercise list. */
function LibraryCard({ height }: CardProps) {
  const compact = height < 380;
  return (
    <View className="flex-1 overflow-hidden rounded-[28px]">
      <LinearGradient
        colors={["#2E3452", "#181C31", "#0C0E19"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="absolute inset-0"
      />
      <View
        pointerEvents="none"
        className="absolute -right-[70px] -top-[70px] h-[220px] w-[220px] rounded-full bg-[#8C9BFF]/15"
      />

      <View className="flex-1 px-5 pb-4 pt-4">
        <View className="flex-row mt-2 items-end justify-between">
          <Txt
            weight="semibold"
            className={`${compact ? "text-[34px] leading-[33px]" : "text-[38px] leading-[37px]"} tracking-[-2.4px] text-white`}
          >
            THE RIGHT{"\n"}
            <Txt weight="bold" className="text-brand">
              MOVE.
            </Txt>
          </Txt>
          <View className="items-center rounded-xl bg-black px-3 py-1">
            <Txt weight="semibold" className="text-[20px] text-white">
              80+
            </Txt>
            <Txt className="text-[9px] text-[#AEB6E8]">Exercises</Txt>
          </View>
        </View>

        <View className="mt-3 flex-row items-center gap-3 rounded-xl bg-black/80 px-3 py-2">
          <MaterialCommunityIcons name="magnify" size={19} color="white" />
          <Txt className="flex-1 text-[10px] text-[#8e8f93]">Search exercises, muscle...</Txt>
          <MaterialCommunityIcons name="tune-variant" size={17} color={"white"} />
        </View>

        <View className="mt-2 flex-row gap-1.5">
          {CHIPS.map((chip, i) => (
            <View
              key={chip}
              className={`rounded-full  px-3 py-0.5 ${i === 0 ? " bg-white" : "border-white/15 bg-white/5"}`}
            >
              <Txt
                weight="semibold"
                className={`text-[10px] ${i === 0 ? "text-[#14200D]" : "text-[#C3C9F0]"}`}
              >
                {chip}
              </Txt>
            </View>
          ))}
        </View>

        <View className="mt-auto gap-2 pt-2">
          {(compact ? EXERCISES.slice(0, 2) : EXERCISES).map((exercise) => (
            <View
              key={exercise.name}
              className="flex-row items-center gap-3 rounded-xl bg-white/[0.06] p-2"
            >
              <View className="h-10 w-10 items-center justify-center rounded-lg bg-[#8C9BFF]/15">
                <MaterialCommunityIcons name={exercise.icon} size={21} color={LIME} />
              </View>
              <View className="flex-1 gap-1">
                <Txt weight="semibold" className="text-[13px] text-white">
                  {exercise.name}
                </Txt>
                <Txt className="text-[9px] tracking-[0.5px] text-[#A5ACD9]">{exercise.sub}</Txt>
              </View>
              <View className="flex-row items-center gap-[3px]">
                {[0, 1, 2].map((d) => (
                  <View
                    key={d}
                    className={`h-[3px] w-[3px] rounded-full ${d < exercise.level ? "bg-white" : "bg-white/20"}`}
                  />
                ))}
              </View>
              <MaterialCommunityIcons name="arrow-right" size={17} color={"white"} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const AMBER = "#FFC83D";

/** 4. Amber card, concentric rings, streak counter + week tracker. */
function ConsistencyCard({ height }: CardProps) {
  const compact = height < 370;
  return (
    <View className="flex-1 overflow-hidden rounded-[28px]">
      <LinearGradient
        colors={["#FFEDB0", "#FFC83D", "#E8941A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="absolute inset-0"
      />
      <View pointerEvents="none" className="absolute -right-[34px] top-[10%]">
        <MaterialCommunityIcons name="fire" size={230} color="rgba(130,55,0,0.12)" />
      </View>

      <View className="flex-1 px-5 pb-4 pt-4">
        <View className="flex-row items-center justify-between">
          <Tag
            icon="fire"
            label="KEEP THE MOMENTUM"
            textClass="text-[#3A1F05]"
            iconColor="yellow"
            tone="bg-[#3A1F05]/10 border-[#3A1F05]/20"
          />
          <Tag
            icon="trophy-outline"
            label="BEST 21"
            textClass="text-black"
            iconColor="white"
            tone="bg-black border-[#3A1F05]/15"
          />
        </View>

        <View className="flex-row items-end">
          <Txt
            weight="semibold"
            className={`${compact ? "text-[92px] leading-[98px]" : "text-[108px] leading-[112px]"} tracking-[-8px] text-[#2A1604]`}
          >
            12
          </Txt>
          <Txt
            weight="bold"
            className={`${compact ? "mb-3 text-[26px] leading-[24px]" : "mb-4 text-[26px] leading-[28px]"} ml-1 tracking-[-1.4px] text-[#2A1604]`}
          >
            DAY{"\n"}STREAK.
          </Txt>
        </View>

        <View className="mt-auto rounded-2xl border border-[#5E3A10] bg-[#2A1807] px-3 pb-3 pt-3">
          <View className="mb-2 flex-row items-center justify-between">
            <Txt className="text-[10px] text-[#E4CFAE]">This week</Txt>
            <Txt weight="semibold" className="text-[10px] text-[#FFC83D]">
              5 / 7 Days
            </Txt>
          </View>
          <View className="flex-row justify-between">
            {DAYS.map((day, index) => (
              <View key={`${day}-${index}`} className="items-center gap-2">
                <View
                  className={`h-7 w-7 items-center justify-center rounded-full ${index < 5 ? "bg-[#FFC83D]" : "border border-[#7A5A30]"}`}
                >
                  {index < 5 ? (
                    <MaterialCommunityIcons name="check" size={16} color="#2A1604" />
                  ) : (
                    <View className="h-1 w-1 rounded-full bg-[#9A7A4A]" />
                  )}
                </View>
                <Txt className="text-[10px] text-[#CDB48C]">{day}</Txt>
              </View>
            ))}
          </View>
          <View className="mt-3">
            <Cta
              label="VIEW STREAK HISTORY"
              tone="border-[#FFC83D] bg-[#FFC83D]"
              textClass="text-[#2A1604]"
              arrowClass="bg-[#2A1604]"
              arrowColor="#FFC83D"
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const TEAL = "#5EEAD4";

/** 5. Teal card, topographic waves, score ring + floating stat chips. */
function OverviewCard({ active, height }: CardProps) {
  const compact = height < 370;
  const ring = useReveal(active, 1250);
  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: 377 - 284 * ring.value,
  }));
  const size = compact ? 116 : 135;

  return (
    <View className="flex-1 overflow-hidden rounded-[28px]">
      <LinearGradient
        colors={["#16444A", "#0C2226", "#061012"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        className="absolute inset-0"
      />
      <View className="flex-1 px-5 pb-4 pt-4">
        <Txt
          weight="semibold"
          className={`${compact ? "mt-1 text-[34px] leading-[34px]" : "mt-2 text-[38px] leading-[37px]"} tracking-[-2.6px] text-white`}
        >
          ALL OF IT.{"\n"}
          <Txt className="text-[#5EEAD4]">IN SYNC.</Txt>
        </Txt>

        <View className="flex-1 items-center justify-center">
          <FloatChip
            icon="medal-outline"
            label="12 PRs"
            accent={TEAL}
            position="left-0 top-[12%]"
          />
          <FloatChip
            icon="fire"
            label="12 DAY STREAK"
            accent={AMBER}
            position="right-0 bottom-[10%]"
          />
          <FloatArt active={active}>
            <View className="items-center justify-center">
              <Svg width={size} height={size} viewBox="0 0 160 160">
                <Circle cx="80" cy="80" r="60" fill="none" stroke="#1F4A4C" strokeWidth="12" />
                <AnimatedCircle
                  cx="80"
                  cy="80"
                  r="60"
                  fill="none"
                  stroke={TEAL}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray="377"
                  animatedProps={ringProps}
                  rotation={-90}
                  origin="80, 80"
                />
              </Svg>
              <View className="absolute items-center justify-center">
                <Txt
                  weight="semibold"
                  className={`${compact ? "text-[34px]" : "text-[39px]"} tracking-[-2px] text-white`}
                >
                  75
                </Txt>
                <Txt className="-mt-3 text-[10px] tracking-[1.1px] text-[#A8D5CE]">Your Score</Txt>
              </View>
            </View>
          </FloatArt>
        </View>

        {!compact && (
          <View className="mb-2 flex-row gap-2">
            <MiniMetric label="THIS WEEK" value="05" accent={TEAL} icon="calendar-check-outline" />
            <MiniMetric label="TOTAL VOLUME" value="12k" accent={TEAL} />
          </View>
        )}
        <Cta
          label="OPEN DASHBOARD"
          tone="border-[#5EEAD4]/40 bg-[#5EEAD4]"
          textClass="text-black"
          arrowClass="bg-[#5EEAD4]"
          arrowColor="#06201C"
        />
      </View>
    </View>
  );
}

function FeatureArtwork({
  id,
  active,
  width,
  height,
}: CardProps & {
  id: FeatureId;
}) {
  switch (id) {
    case "training":
      return <TrainingCard active={active} width={width} height={height} />;
    case "progress":
      return <ProgressCard active={active} width={width} height={height} />;
    case "library":
      return <LibraryCard active={active} width={width} height={height} />;
    case "consistency":
      return <ConsistencyCard active={active} width={width} height={height} />;
    case "overview":
      return <OverviewCard active={active} width={width} height={height} />;
  }
}

/* -------------------------------------------------------------------------- */
/*  Deck                                                                      */
/* -------------------------------------------------------------------------- */

function DeckCard({
  index,
  active,
  near,
  width,
  height,
  sideShift,
  position,
  onSelect,
}: {
  index: number;
  active: boolean;
  near: boolean;
  width: number;
  height: number;
  sideShift: number;
  position: SharedValue<number>;
  onSelect: (index: number) => void;
}) {
  const cardStyle = useAnimatedStyle(() => {
    const offset = circularOffset(index, position.value);
    const distance = Math.abs(offset);

    return {
      opacity: interpolate(distance, [0, 1, 1.75, 2.25], [1, 1, 0.08, 0], Extrapolation.CLAMP),
      zIndex: Math.round(interpolate(distance, [0, 1, 2.5], [50, 30, 0], Extrapolation.CLAMP)),
      transform: [
        { perspective: 950 },
        {
          translateX: interpolate(
            offset,
            [-2, -1, 0, 1, 2],
            [-sideShift * 1.62, -sideShift, 0, sideShift, sideShift * 1.62],
            Extrapolation.CLAMP,
          ),
        },
        { translateY: interpolate(distance, [0, 1, 2], [0, 13, 31], Extrapolation.CLAMP) },
        { scale: interpolate(distance, [0, 1, 2], [1, 0.88, 0.77], Extrapolation.CLAMP) },
        {
          rotateZ: `${interpolate(offset, [-2, -1, 0, 1, 2], [-20, -12, 0, 12, 20], Extrapolation.CLAMP)}deg`,
        },
      ],
    };
  }, [sideShift]);

  const shadeStyle = useAnimatedStyle(() => {
    const distance = Math.abs(circularOffset(index, position.value));
    return {
      opacity: interpolate(distance, [0, 1, 2], [0, 0.3, 0.54], Extrapolation.CLAMP),
    };
  });

  return (
    <Animated.View
      pointerEvents={near ? "auto" : "none"}
      className="absolute left-0 top-0 rounded-[29px] bg-[#101710] shadow-2xl shadow-black"
      // Runtime values: card size is computed from the window, motion is animated.
      style={[{ width, height }, cardStyle]}
      accessibilityLabel={`${index + 1} of ${FEATURE_COUNT}, ${FEATURES[index].title}`}
    >
      <View className="flex-1 overflow-hidden rounded-[28px]">
        <FeatureArtwork id={FEATURES[index].id} active={active} width={width} height={height} />
        <Animated.View
          pointerEvents="none"
          className="absolute inset-0 bg-[#020602]"
          style={shadeStyle}
        />
      </View>
      {!active && near && (
        <Pressable
          className="absolute inset-0"
          onPress={() => onSelect(index)}
          accessibilityRole="button"
          accessibilityLabel={`Show ${FEATURES[index].title}`}
        />
      )}
    </Animated.View>
  );
}

/** Each active indicator fills until the next automatic card change. */
function PlaybackDot({ active, paused }: { active: boolean; paused: boolean }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(progress);
    progress.value = 0;
    if (active && !paused) {
      progress.value = withTiming(1, {
        duration: AUTO_ADVANCE_MS,
        easing: Easing.linear,
      });
    }
    return () => cancelAnimation(progress);
  }, [active, paused, progress]);
  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.round(progress.value * 100)}%`,
  }));
  if (!active) return <View className="h-1.5 w-1.5 rounded-full bg-white/30" />;
  return (
    <View className="h-1.5 w-8 overflow-hidden rounded-full bg-white/25">
      <Animated.View className="h-full rounded bg-brand" style={fillStyle} />
    </View>
  );
}

export default function SignInScreen() {
  const Alert = useAppAlert();
  const { signInGoogle } = useSession();
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchingDeck, setTouchingDeck] = useState(false);
  const [foreground, setForeground] = useState(true);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const viewportWidth = Math.min(windowWidth, 480);
  const cardWidth = Math.min(342, Math.round(viewportWidth * 0.78));
  const cardHeight = Math.min(394, Math.max(338, Math.round(windowHeight * 0.42)));
  const sideShift = Math.round(cardWidth * 0.67);
  const deckHeight = cardHeight + 38;

  // Virtual position keeps counting ... 3, 4, 5, 6 ... and is wrapped by modulo.
  const cursor = useRef(0); // JS mirror of the card we're settling on
  const position = useSharedValue(0); // single source of truth for the deck
  const startPos = useSharedValue(0);

  // Pixels of finger travel that equal one full card step.
  const dragSpan = cardWidth * 0.72;

  // Keep React state (dots, text, active flags) in sync with the visual position,
  // on the UI thread, so it flips exactly when the card crosses the midpoint.
  useAnimatedReaction(
    () => wrap(Math.round(position.value)),
    (current, previous) => {
      if (current !== previous) runOnJS(setActiveIndex)(current);
    },
    [],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      setForeground(state === "active");
    });
    return () => subscription.remove();
  }, []);

  const syncCursor = useCallback((target: number) => {
    cursor.current = target;
  }, []);

  const goTo = useCallback(
    (target: number) => {
      cursor.current = target;
      position.value = withTiming(target, {
        duration: SETTLE_MS,
        easing: Easing.out(Easing.cubic),
      });
    },
    [position],
  );

  const step = useCallback((direction: number) => goTo(cursor.current + direction), [goTo]);

  const selectCard = useCallback(
    (index: number) => {
      const current = wrap(cursor.current);
      let offset = index - current;
      // Always take the shortest route around the circular deck.
      if (offset > FEATURE_COUNT / 2) offset -= FEATURE_COUNT;
      if (offset < -FEATURE_COUNT / 2) offset += FEATURE_COUNT;
      if (offset) goTo(cursor.current + offset);
    },
    [goTo],
  );

  // Memoised: re-creating the gesture mid-drag (state updates re-render) caused jumps.
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-22, 22])
        .onBegin(() => {
          runOnJS(setTouchingDeck)(true);
        })
        .onStart(() => {
          // Grab the deck exactly where it is, even if it is mid-settle.
          cancelAnimation(position);
          startPos.value = position.value;
        })
        .onUpdate((event) => {
          const next = startPos.value - event.translationX / dragSpan;
          // Never drag more than one card away from where the touch began.
          position.value = Math.max(startPos.value - 1, Math.min(startPos.value + 1, next));
        })
        .onEnd((event) => {
          const base = Math.round(startPos.value);
          const projected = position.value - (event.velocityX * 0.12) / dragSpan;
          const target = Math.max(base - 1, Math.min(base + 1, Math.round(projected)));
          // Animate from the finger's exact position: no second value, no overshoot.
          position.value = withTiming(target, {
            duration: SETTLE_MS,
            easing: Easing.out(Easing.cubic),
          });
          runOnJS(syncCursor)(target);
        })
        .onFinalize((_event, success) => {
          if (!success) {
            // Gesture was cancelled by the system: settle on the nearest card.
            const target = Math.round(position.value);
            position.value = withTiming(target, {
              duration: SETTLE_MS,
              easing: Easing.out(Easing.cubic),
            });
            runOnJS(syncCursor)(target);
          }
          runOnJS(setTouchingDeck)(false);
        }),
    [dragSpan, position, startPos, syncCursor],
  );

  // Auto-play resets after each change. Pauses while swiping, signing in, or backgrounded.
  useEffect(() => {
    if (touchingDeck || loading || !foreground) return;
    const timer = setTimeout(() => step(1), AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [activeIndex, touchingDeck, loading, foreground, step]);

  // NOTE: `glowStyle` is not rendered anywhere in the current layout (same as the
  // original file); kept so you can re-attach the ambient glow if you want it back.
  const glowStyle = useAnimatedStyle(() => {
    const p = ((position.value % FEATURE_COUNT) + FEATURE_COUNT) % FEATURE_COUNT;
    return {
      backgroundColor: interpolateColor(p, [0, 1, 2, 3, 4, 5], GLOW_COLORS),
    };
  });
  void glowStyle;

  const login = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      await signInGoogle();
    } catch (error) {
      Alert.alert(
        "Couldn’t sign you in",
        error instanceof Error ? error.message : "Check your connection and try again.",
      );
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  const feature = FEATURES[activeIndex];
  const paused = touchingDeck || loading || !foreground;

  return (
    <View className="flex-1 bg-[#080A08]">
      <StatusBar hidden animated />
      <LinearGradient
        colors={["#000", "#172316", "#111811", "#060806"]}
        locations={[0, 0.1, 0.71, 1]}
        className="absolute inset-0"
      />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="grow"
      >
        {/* Top: logo, card deck and playback dots */}
        <SafeAreaView edges={["top"]} className="w-full max-w-[480px] items-center self-center">
          <View className="flex-row items-center justify-center px-6 pb-1 pt-1">
            <View className="flex-row items-center gap-2">
              <Image
                source={require("../../../assets/images/splash-icon.png")}
                className="h-8 w-8"
                resizeMode="contain"
                accessible={false}
              />
              <Txt weight="semibold" className="text-[21px] tracking-[-1px] text-white">
                FitSync<Txt className="text-brand">.</Txt>
              </Txt>
            </View>
          </View>

          <GestureHandlerRootView className="w-full">
            <GestureDetector gesture={pan}>
              <View
                className="w-full items-center justify-center"
                // Runtime value: derived from the window height.
                style={{ height: deckHeight }}
                accessible={false}
              >
                <View
                  className="relative"
                  // Runtime values: derived from the window size.
                  style={{ width: cardWidth, height: cardHeight }}
                >
                  {FEATURES.map((item, index) => (
                    <DeckCard
                      key={item.id}
                      index={index}
                      active={activeIndex === index}
                      near={
                        Math.min(
                          (((index - activeIndex) % FEATURE_COUNT) + FEATURE_COUNT) % FEATURE_COUNT,
                          (((activeIndex - index) % FEATURE_COUNT) + FEATURE_COUNT) % FEATURE_COUNT,
                        ) <= 1
                      }
                      width={cardWidth}
                      height={cardHeight}
                      sideShift={sideShift}
                      position={position}
                      onSelect={selectCard}
                    />
                  ))}
                </View>
              </View>
            </GestureDetector>
          </GestureHandlerRootView>

          <View className="mb-5 mt-1 flex-row items-center justify-center gap-2.5">
            {FEATURES.map((item, index) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Show feature ${index + 1}: ${item.title}`}
                accessibilityState={{ selected: index === activeIndex }}
                onPress={() => selectCard(index)}
                hitSlop={10}
                className="min-h-[25px] justify-center"
              >
                <PlaybackDot active={index === activeIndex} paused={paused} />
              </Pressable>
            ))}
          </View>
        </SafeAreaView>

        {/* Bottom sheet: slides up from the bottom, full width, white, rounded top */}
        <Animated.View
          entering={SlideInDown.duration(700).delay(150).easing(Easing.out(Easing.cubic))}
          className="w-full rounded-t-3xl"
        >
          {/* bottom safe-area padding stays white, so the sheet reaches the screen edge */}
          <SafeAreaView
            edges={["bottom"]}
            className="w-full max-w-[480px] self-center px-7 pb-3 pt-7"
          >
            <View className="min-h-[96px]">
              <Animated.View key={feature.id} entering={FadeInDown.duration(320)}>
                <Txt
                  weight="semibold"
                  className="text-[29px] leading-[35px] tracking-[-1.4px] text-white"
                >
                  {feature.title}
                </Txt>
                <Txt className="mt-1 max-w-[340px] text-[13px] leading-[20px] text-[#8f968d]">
                  {feature.description}
                </Txt>
              </Animated.View>
            </View>

            <MotionPressable
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
              accessibilityState={{ disabled: loading, busy: loading }}
              disabled={loading}
              onPress={login}
              className={`mt-5 min-h-14 flex-row items-center justify-center gap-3 rounded-2xl px-5 py-4 ${loading ? "bg-[#d5dfd2]" : "bg-[#ffffff]"}`}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Image
                  source={require("../../../assets/images/google.png")}
                  className="h-6 w-6"
                  resizeMode="contain"
                  accessible={false}
                />
              )}
              <Txt weight="semibold" className="text-[16px] text-black">
                {loading ? "Signing you in…" : "Continue with Google"}
              </Txt>
            </MotionPressable>

            <View className="mt-3">
              <LegalLinks />
            </View>
          </SafeAreaView>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
