import React from "react";
import { Pressable, View } from "react-native";
import { Txt } from "@/src/components/ui";

export function Segments<T extends string | number | null>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      className="flex-row flex-wrap gap-[8px]"
    >
      {options.map((option) => (
        <Pressable
          key={String(option.value)}
          accessibilityRole="radio"
          accessibilityLabel={option.label}
          accessibilityState={{ checked: value === option.value }}
          onPress={() => onChange(option.value)}
          className={`min-h-12 min-w-11 justify-center rounded-3xl px-8 py-1 active:opacity-70 ${value === option.value ? "border-brand bg-brand" : "border-border bg-panel"}`}
        >
          <Txt
            weight="semibold"
            className={`text-sm ${value === option.value ? "text-bg" : "text-ink"}`}
          >
            {option.label}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}
