
import React from "react";

import {
  Pressable,
  ScrollView,
  View
} from "react-native";

import {
  useLocalSearchParams,
  useRouter
} from "expo-router";

import { MaterialCommunityIcons } from "@expo/vector-icons";

import { C } from "@/src/constants/theme";
import { exercises } from "@/data/sample";
import {
  PrimaryButton,
  Txt
} from "@/src/components/ui";

export default function ExerciseDetails() {
  const router = useRouter();

  const { id } =
    useLocalSearchParams<{ id: string }>();

  const exercise = exercises.find(
    item => item.id === id
  );

  if (!exercise) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Txt>Exercise not found.</Txt>

        <Pressable onPress={() => router.back()}>
          <Txt className="mt-4 text-brand">
            Go back
          </Txt>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{
        padding: 24,
        paddingBottom: 45
      }}
    >
      <Pressable
        onPress={() => router.back()}
        className="mb-7 h-11 w-11 items-center justify-center rounded-full border border-border"
      >
        <MaterialCommunityIcons
          name="arrow-left"
          color={C.ink}
          size={22}
        />
      </Pressable>

      <Txt
        weight="medium"
        className="text-xs tracking-[2px] text-brand"
      >
        EXERCISE GUIDE / {exercise.muscle.toUpperCase()}
      </Txt>

      <Txt
        weight="extra"
        className="mt-2 text-[34px] leading-[37px]"
      >
        {exercise.name.toUpperCase()}
      </Txt>

      {/* Exercise visual placeholder */}

      <View className="mt-7 h-56 items-center justify-center rounded-[29px] border border-border bg-panel">
        <MaterialCommunityIcons
          name="weight-lifter"
          color={C.brand}
          size={86}
        />

        <Txt
          weight="semibold"
          className="mt-3 text-xs tracking-[2px] text-muted"
        >
          ILLUSTRATION COMING SOON
        </Txt>
      </View>

      {/* Muscle and equipment */}

      <View className="mt-5 flex-row gap-2">
        {[exercise.muscle, exercise.equipment].map(value => (
          <View
            key={value}
            className="rounded-full border border-border bg-elevated px-4 py-2"
          >
            <Txt
              weight="semibold"
              className="text-xs"
            >
              {value}
            </Txt>
          </View>
        ))}
      </View>

      <Txt weight="extra" className="mt-8 text-xl">
        TARGET AREA
      </Txt>

      <Txt className="mt-2 text-sm text-muted">
        {exercise.focus}
      </Txt>

      <Txt weight="extra" className="mt-8 text-xl">
        TECHNIQUE NOTES
      </Txt>

      {exercise.tips.map((tip, index) => (
        <View
          key={tip}
          className="mt-3 flex-row rounded-2xl border border-border bg-panel p-4"
        >
          <Txt
            weight="extra"
            className="mr-3 text-sm text-brand"
          >
            0{index + 1}
          </Txt>

          <Txt className="flex-1 text-sm leading-5 text-ink">
            {tip}
          </Txt>
        </View>
      ))}

      <View className="mt-8">
        <PrimaryButton
          title="VIEW SAMPLE WORKOUT →"
          onPress={() =>
            router.push("/workout?plan=upper")
          }
        />
      </View>

      <Txt className="mt-4 text-center text-xs text-muted">
        Sample exercise guide. Licensed illustrations
        will be connected later.
      </Txt>
    </ScrollView>
  );
}
