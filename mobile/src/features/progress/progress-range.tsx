import React from "react";
import { View } from "react-native";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { Icon } from "./visuals";
import { PROGRESS_PERIODS } from "./access";
export function ProgressRange({
  days,
  isPro,
  onChange,
  onPro,
}: {
  days: number;
  isPro: boolean;
  onChange: (days: number) => void;
  onPro: () => void;
}) {
  return (
    <View className="mb-5 mt-2 flex-row gap-1 rounded-2xl bg-panel p-1">
      {PROGRESS_PERIODS.map((period) => (
        <Pressable
          key={period}
          accessibilityRole="button"
          accessibilityLabel={
            period > 90 && !isPro ? "1 year of analytics, requires Pro" : `Last ${period} days`
          }
          accessibilityState={{ selected: days === period }}
          onPress={() => (period > 90 && !isPro ? onPro() : onChange(period))}
          className="min-h-11 flex-1 flex-row items-center justify-center gap-1 rounded-xl px-1"
          style={{ backgroundColor: days === period ? C.brand : "transparent" }}
        >
          <Txt
            weight="medium"
            className="text-xs"
            style={{ color: days === period ? C.bg : C.muted }}
          >
            {period === 7
              ? "7 days"
              : period === 30
                ? "30 days"
                : period === 90
                  ? "3 months"
                  : "1 year"}
          </Txt>
          {period > 90 && !isPro && (
            <Icon name="lock-outline" size={12} color={days === period ? C.bg : C.muted} />
          )}
        </Pressable>
      ))}
    </View>
  );
}
