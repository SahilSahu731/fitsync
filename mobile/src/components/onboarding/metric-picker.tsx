
import React, { useMemo } from "react";
import { Pressable, View } from "react-native";
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { C } from "@/src/constants/theme";
import { Txt } from "@/src/components/ui";

type Props = {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  decimals?: number;
};

export function MetricPicker({
  value,
  onChange,
  min,
  max,
  step,
  unit,
  decimals = 0
}: Props) {
  const ticks = useMemo(() => Array.from({ length: 27 }, (_, i) => i), []);

  const update = (next: number) => {
    const clamped = Math.max(min, Math.min(max, next));
    onChange(Number(clamped.toFixed(decimals)));
  };

  return (
    <View className="rounded-[28px] border border-border bg-panel px-5 py-6">
      <View className="flex-row items-baseline justify-center">
        <Txt weight="extra" className="text-[72px] leading-[80px] tracking-tight">
          {value.toFixed(decimals)}
        </Txt>
        <Txt weight="bold" className="ml-2 text-[19px] text-brand">
          {unit}
        </Txt>
      </View>

      <View className="mt-2 flex-row items-center justify-between">
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            update(value - step);
          }}
          className="h-11 w-11 items-center justify-center rounded-full bg-elevated"
          accessibilityLabel={`Decrease ${unit}`}
        >
          <MaterialCommunityIcons name="minus" color={C.ink} size={23}/>
        </Pressable>

        <Txt weight="medium" className="text-xs text-muted">
          DRAG TO ADJUST
        </Txt>

        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            update(value + step);
          }}
          className="h-11 w-11 items-center justify-center rounded-full bg-elevated"
          accessibilityLabel={`Increase ${unit}`}
        >
          <MaterialCommunityIcons name="plus" color={C.ink} size={23}/>
        </Pressable>
      </View>

      <Slider
        style={{ width: "100%", height: 56 }}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        minimumTrackTintColor={C.brand}
        maximumTrackTintColor="#4A4746"
        thumbTintColor={C.brand}
        onValueChange={update}
        onSlidingComplete={() => Haptics.selectionAsync()}
        accessibilityLabel={`Select ${unit}`}
      />

      <View className="flex-row justify-between px-3">
        {ticks.map(i => (
          <View
            key={i}
            style={{
              width: i % 5 === 0 ? 2 : 1,
              height: i % 5 === 0 ? 23 : 11,
              backgroundColor: i === 13 ? C.brand : "#706C69"
            }}
          />
        ))}
      </View>

      <View className="mt-3 flex-row justify-between">
        <Txt className="text-xs text-muted">{min} {unit}</Txt>
        <Txt className="text-xs text-muted">{max} {unit}</Txt>
      </View>
    </View>
  );
}
