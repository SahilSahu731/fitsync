import { Ionicons } from "@expo/vector-icons";

import { Image, Pressable, Text, View } from "react-native";

import { prettifyEnum } from "../constants";

import type { Exercise } from "../types";

interface Props {
  exercise: Exercise;

  onPress: () => void;
}

export function ExerciseRow({ exercise, onPress }: Props) {
  const thumbnail = exercise.media[0]?.thumbnail_url;

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-5 py-3"
      style={({ pressed }) => ({
        opacity: pressed ? 0.72 : 1,

        transform: [
          {
            scale: pressed ? 0.99 : 1,
          },
        ],
      })}
    >
      {thumbnail ? (
        <Image
          source={{
            uri: thumbnail,
          }}
          className="h-[62px] w-[62px] rounded-2xl bg-elevated"
        />
      ) : (
        <View className="h-[62px] w-[62px] items-center justify-center rounded-2xl bg-elevated">
          <Ionicons name="barbell-outline" size={24} color="#737373" />
        </View>
      )}

      <View className="ml-4 flex-1">
        <View className="flex-row items-center">
          <Text
            numberOfLines={1}
            className="flex-1 text-[16px] font-bold text-white"
          >
            {exercise.name}
          </Text>

          {exercise.is_custom ? (
            <View className="ml-2 rounded-full bg-brand-muted px-2 py-1">
              <Text className="text-[9px] font-bold uppercase tracking-[1px] text-brand-bright">
                Custom
              </Text>
            </View>
          ) : null}
        </View>

        <Text className="text-white/38 mt-1 text-[12px]">
          {exercise.primary_muscles.map(prettifyEnum).join(" · ")}
        </Text>

        <Text className="mt-1 text-[11px] text-white/25">
          {[...exercise.equipment, exercise.mechanic]
            .slice(0, 2)
            .map(prettifyEnum)
            .join(" · ")}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,.2)" />
    </Pressable>
  );
}
