import { Pressable, Text, View } from "react-native";

import type { ProgressRange } from "../types";

const OPTIONS: {
  value: ProgressRange;

  label: string;
}[] = [
  {
    value: "4W",

    label: "4W",
  },
  {
    value: "12W",

    label: "12W",
  },
  {
    value: "6M",

    label: "6M",
  },
  {
    value: "1Y",

    label: "1Y",
  },
  {
    value: "ALL",

    label: "All",
  },
];

interface Props {
  value: ProgressRange;

  onChange: (value: ProgressRange) => void;
}

export function RangeSelector({ value, onChange }: Props) {
  return (
    <View className="flex-row rounded-xl bg-white/[0.04] p-1">
      {OPTIONS.map((option) => {
        const selected = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => {
              onChange(option.value);
            }}
            className="min-h-[34px] flex-1 items-center justify-center rounded-lg"
            style={{
              backgroundColor: selected ? "#2563EB" : "transparent",
            }}
          >
            <Text
              className="text-[11px] font-bold"
              style={{
                color: selected ? "#FFFFFF" : "rgba(255,255,255,.35)",
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
