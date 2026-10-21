import React, { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import Slider from "@react-native-community/slider";
import { cssInterop } from "nativewind";

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { C } from "@/src/constants/theme";
import { Txt } from "@/src/components/ui";

const StyledSlider = cssInterop(Slider, { className: "style" });

type Props = { value: number; onChange: (value: number) => void; min: number; max: number; step: number; unit: string; decimals?: number };

export function MetricPicker({ value, onChange, min, max, step, unit, decimals = 0 }: Props) {
  const [text, setText] = useState<string | null>(null);
  const update = (next: number) => onChange(Number(Math.max(min, Math.min(max, next)).toFixed(decimals)));
  const changeText = (next: string) => {
    setText(next);
    const number = Number(next.replace(",", "."));
    if (next.trim() && Number.isFinite(number)) update(number);
  };
  return <View className="py-[26px]">
    <View className="flex-row justify-center items-center gap-[10px]">
      <TextInput accessibilityLabel={`Measurement in ${unit}`} value={text ?? value.toFixed(decimals)} onChangeText={changeText} onEndEditing={() => setText(null)} keyboardType="decimal-pad" returnKeyType="done" maxLength={6} selectTextOnFocus className="font-outfit-semibold text-ink text-[68px] min-w-[140px] text-center p-[0px]" />
      <Txt className="text-muted text-[22px]">{unit}</Txt>
    </View>
    <Txt className="text-center text-muted text-[13px] mt-[6px]">Tap the number or slide to adjust</Txt>
    <View className="flex-row items-center mt-[32px]">
      {([-1, 1] as const).map((direction, i) => <React.Fragment key={direction}>
        {i === 1 && <StyledSlider className="flex-1 h-[56px]" minimumValue={min} maximumValue={max} step={step} value={value} minimumTrackTintColor={C.brand} maximumTrackTintColor={C.border} thumbTintColor={C.brand} onValueChange={update} accessibilityLabel={`Adjust ${unit}`} accessibilityValue={{ min, max, now: value }} />}
        <Pressable accessibilityRole="button" accessibilityLabel={`${direction === -1 ? "Decrease" : "Increase"} measurement`} disabled={direction === -1 ? value <= min : value >= max} onPress={() => update(value + direction * step)} className="h-12 w-12 items-center justify-center rounded-full bg-panel active:opacity-50">
          <MaterialCommunityIcons name={direction === -1 ? "minus" : "plus"} size={22} color={C.ink} />
        </Pressable>
      </React.Fragment>)}
    </View>
    <View className="flex-row justify-between mx-[58px]">
      <Txt className="text-muted text-[12px]">{min} {unit}</Txt><Txt className="text-muted text-[12px]">{max} {unit}</Txt>
    </View>
  </View>;
}
