import React, { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import type { StepProps } from "./config";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const DURATIONS = [30, 45, 60] as const;
const BAR_MAX = 76;
const BAR_STUB = 4;
const RING = 76;
const RING_R = 32;
const RING_STROKE = 5;
const RING_LEN = 2 * Math.PI * RING_R;
const GUIDELINE_MIN = 150;

const tap = () => {
  void Haptics.selectionAsync().catch(() => {});
};

const formatTotal = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
};

/** One day of the week chart: grows when the day is part of the routine. */
function WeekBar({ index, trained, minutes }: { index: number; trained: boolean; minutes: number }) {
  const target = trained ? Math.max(BAR_STUB, (minutes / 60) * BAR_MAX) : BAR_STUB;
  const height = useSharedValue(target);

  useEffect(() => {
    height.set(withTiming(target, { duration: 280 }));
  }, [target, height]);

  const barStyle = useAnimatedStyle(() => ({ height: height.get() }));

  return (
    <View className="items-center gap-2">
      <View className="justify-end" style={{ height: BAR_MAX }}>
        <Animated.View
          className={`w-[18px] rounded-full ${trained ? "bg-brand" : "bg-white/15"}`}
          style={barStyle}
        />
      </View>
      <Txt className={`text-[11px] ${trained ? "text-ink" : "text-muted"}`}>{DAYS[index]}</Txt>
    </View>
  );
}

/** A clock-style ring: the arc is the share of an hour this workout takes. */
function DurationRing({
  minutes,
  selected,
  onPress,
}: {
  minutes: number;
  selected: boolean;
  onPress: () => void;
}) {
  const fraction = minutes / 60;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${minutes} minutes per workout`}
      onPress={onPress}
      className="items-center gap-2 active:scale-95"
    >
      <View style={{ width: RING, height: RING }} className="items-center justify-center">
        <Svg width={RING} height={RING} style={{ position: "absolute" }}>
          <Circle
            cx={RING / 2}
            cy={RING / 2}
            r={RING_R}
            stroke="#fff"
            strokeOpacity={0.12}
            strokeWidth={RING_STROKE}
            fill="none"
          />
          <Circle
            cx={RING / 2}
            cy={RING / 2}
            r={RING_R}
            stroke={selected ? C.brand : "#fff"}
            strokeOpacity={selected ? 1 : 0.3}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={`${RING_LEN * fraction} ${RING_LEN}`}
            rotation={-90}
            originX={RING / 2}
            originY={RING / 2}
            fill="none"
          />
        </Svg>
        <Txt
          weight="semibold"
          className={`text-[24px] ${selected ? "text-ink" : "text-muted"}`}
        >
          {minutes}
        </Txt>
      </View>
      <Txt className={`text-[13px] ${selected ? "text-brand" : "text-muted"}`}>min</Txt>
    </Pressable>
  );
}

export function RoutineStep({ draft, update }: StepProps) {
  const days = draft.trainingDays;
  const minutes = draft.minutesPerWorkout;
  const total = days * minutes;
  const restDays = 7 - days;

  return (
    <View className="gap-[36px]">
      {/* Days per week: tap a pill to train that many days */}
      <View>
        <View className="mb-[16px] flex-row items-baseline justify-between">
          <Txt weight="semibold" className="text-[17px]">
            Days per week
          </Txt>
          <Txt className="text-[14px] text-muted">
            {restDays === 0
              ? "No rest days"
              : `${restDays} rest ${restDays === 1 ? "day" : "days"}`}
          </Txt>
        </View>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Training days per week"
          className="flex-row justify-between"
        >
          {[1, 2, 3, 4, 5, 6, 7].map((value) => {
            const selected = value <= days;
            const current = value === days;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ selected: current }}
                accessibilityLabel={`${value} ${value === 1 ? "day" : "days"} per week`}
                onPress={() => {
                  if (value === days) return;
                  tap();
                  update({ trainingDays: value });
                }}
                className={`h-[60px] w-[42px] items-center justify-center rounded-full active:scale-95 ${
                  selected ? "bg-brand" : "bg-white/[0.07]"
                }`}
              >
                <Txt
                  weight="semibold"
                  className={`text-[17px] ${selected ? "text-bg" : "text-muted"}`}
                >
                  {value}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Time per workout */}
      <View>
        <Txt weight="semibold" className="mb-[18px] text-[17px]">
          Time for each workout
        </Txt>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Workout duration"
          className="flex-row justify-around"
        >
          {DURATIONS.map((value) => (
            <DurationRing
              key={value}
              minutes={value}
              selected={value === minutes}
              onPress={() => {
                if (value === minutes) return;
                tap();
                update({ minutesPerWorkout: value });
              }}
            />
          ))}
        </View>
      </View>

      {/* Your week */}
      <View accessibilityLiveRegion="polite">
        <View className="flex-row items-end justify-between">
          <View className="min-w-0 flex-1 pr-4">
            <Txt weight="semibold" className="text-[52px] leading-[56px] tracking-tight text-ink">
              {total}
            </Txt>
            <Txt className="text-[15px] text-muted">minutes a week</Txt>
            {total >= 60 && (
              <Txt weight="medium" className="mt-1 text-[14px] text-brand">
                {formatTotal(total)}
              </Txt>
            )}
          </View>
          <View
            accessible
            accessibilityLabel={`Your week: ${days} training days of ${minutes} minutes`}
            className="flex-row gap-[7px]"
          >
            {DAYS.map((_, i) => (
              <WeekBar key={i} index={i} trained={i < days} minutes={minutes} />
            ))}
          </View>
        </View>

        <Txt className="mt-[18px] text-[14px] leading-[21px] text-muted">
          {total >= GUIDELINE_MIN
            ? "That meets the 150 minutes a week the WHO suggests for adults. You can adjust your routine anytime."
            : "Start with what feels doable. You can adjust your routine anytime."}
        </Txt>
      </View>
    </View>
  );
}