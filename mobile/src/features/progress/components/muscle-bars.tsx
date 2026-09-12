import { Text, View } from "react-native";

import type { MuscleGroupProgressItem } from "../types";

import { prettifyEnum } from "../utils";

interface Props {
  items: MuscleGroupProgressItem[];
}

export function MuscleBars({ items }: Props) {
  if (items.length === 0) {
    return null;
  }

  const selected = items.slice(0, 8);

  const max = Math.max(...selected.map((item) => item.estimated_sets), 1);

  return (
    <View>
      <Text className="text-[19px] font-extrabold text-white">
        Training Sets
      </Text>

      <Text className="mt-1 text-[11px] leading-5 text-white/25">
        Estimated muscle exposure from completed working sets.
      </Text>

      <View className="mt-5 gap-4">
        {selected.map((item) => (
          <View key={item.muscle}>
            <View className="flex-row items-center">
              <Text className="flex-1 text-[12px] font-semibold text-white/55">
                {prettifyEnum(item.muscle)}
              </Text>

              <Text className="text-[11px] font-bold text-white/35">
                {item.estimated_sets}
              </Text>
            </View>

            <View className="mt-2 h-[6px] overflow-hidden rounded-full bg-white/[0.06]">
              <View
                className="h-full rounded-full bg-brand"
                style={{
                  width: `${(item.estimated_sets / max) * 100}%`,
                }}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
