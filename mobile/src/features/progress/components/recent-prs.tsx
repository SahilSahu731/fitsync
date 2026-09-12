import { Ionicons } from "@expo/vector-icons";

import { Pressable, Text, View } from "react-native";

import type { PersonalRecord } from "../types";

import { formatPRPerformance, formatPRType, relativeDate } from "../utils";

interface Props {
  records: PersonalRecord[];

  onPressExercise: (exerciseId: string) => void;

  onViewAll: () => void;
}

export function RecentPRs({ records, onPressExercise, onViewAll }: Props) {
  if (records.length === 0) {
    return null;
  }

  return (
    <View>
      <View className="flex-row items-center">
        <Text className="flex-1 text-[19px] font-extrabold text-white">
          Recent PRs
        </Text>

        <Pressable onPress={onViewAll}>
          <Text className="text-[12px] font-bold text-brand-bright">
            View all
          </Text>
        </Pressable>
      </View>

      <View className="mt-4 overflow-hidden rounded-[24px] border border-white/[0.07] bg-white/[0.02]">
        {records.map((record, index) => (
          <Pressable
            key={record.id}
            onPress={() => {
              onPressExercise(record.exercise_id);
            }}
            className="flex-row items-center px-4 py-4"
            style={{
              borderBottomWidth: index < records.length - 1 ? 1 : 0,

              borderBottomColor: "rgba(255,255,255,.055)",
            }}
          >
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-amber-400/[0.09]">
              <Ionicons name="trophy-outline" size={18} color="#FBBF24" />
            </View>

            <View className="ml-3 flex-1">
              <Text
                numberOfLines={1}
                className="text-[14px] font-bold text-white"
              >
                {record.exercise_name}
              </Text>

              <Text className="mt-1 text-[11px] text-white/30">
                {formatPRType(record)}
              </Text>
            </View>

            <View className="items-end">
              <Text className="text-[13px] font-extrabold text-white">
                {formatPRPerformance(record)}
              </Text>

              <Text className="mt-1 text-[10px] text-white/25">
                {relativeDate(record.created_at)}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
