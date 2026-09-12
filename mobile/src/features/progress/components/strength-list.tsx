import { Ionicons } from "@expo/vector-icons";

import { Pressable, Text, View } from "react-native";

import type { TopExerciseProgressItem, WeightUnit } from "../types";

interface Props {
  items: TopExerciseProgressItem[];

  unit: WeightUnit;

  onPress: (exerciseId: string) => void;
}

export function StrengthList({ items, unit, onPress }: Props) {
  if (items.length === 0) {
    return null;
  }

  return (
    <View>
      <Text className="text-[19px] font-extrabold text-white">Strength</Text>

      <View className="mt-4 overflow-hidden rounded-[24px] border border-white/[0.07] bg-white/[0.02]">
        {items.map((item, index) => (
          <Pressable
            key={item.exercise_id}
            onPress={() => {
              onPress(item.exercise_id);
            }}
            className="flex-row items-center px-4 py-4"
            style={{
              borderBottomWidth: index < items.length - 1 ? 1 : 0,

              borderBottomColor: "rgba(255,255,255,.055)",
            }}
          >
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-muted">
              <Ionicons name="trending-up" size={17} color="#60A5FA" />
            </View>

            <View className="ml-3 flex-1">
              <Text className="text-[14px] font-bold text-white">
                {item.exercise_name}
              </Text>

              <Text className="text-white/27 mt-1 text-[10px]">
                {item.session_count} sessions
              </Text>
            </View>

            <View className="items-end">
              <Text className="text-[13px] font-extrabold text-white">
                {item.latest_best_e1rm !== null
                  ? `${item.latest_best_e1rm} ${unit}`
                  : "—"}
              </Text>

              {item.change_percent !== null ? (
                <Text
                  className="mt-1 text-[10px] font-bold"
                  style={{
                    color: item.change_percent >= 0 ? "#60A5FA" : "#A3A3A3",
                  }}
                >
                  {item.change_percent >= 0 ? "+" : ""}
                  {item.change_percent.toFixed(1)}%
                </Text>
              ) : null}
            </View>

            <Ionicons
              name="chevron-forward"
              size={16}
              color="rgba(255,255,255,.18)"
              style={{
                marginLeft: 10,
              }}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
