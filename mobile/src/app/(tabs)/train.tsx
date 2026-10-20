
import React from "react";
import {
  Pressable,
  ScrollView,
  View
} from "react-native";

import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { C } from "@/src/constants/theme";
import { demoPlans } from "@/data/sample";
import { Txt } from "@/src/components/ui";

export default function TrainScreen() {
  const router = useRouter();

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{
        padding: 22,
        paddingBottom: 50
      }}
    >
      <Txt
        weight="medium"
        className="text-xs tracking-[2px] text-brand"
      >
        TRAINING HQ
      </Txt>

      <Txt
        weight="extra"
        className="mt-1 text-[37px] tracking-tight"
      >
        LET'S GET TO WORK.
      </Txt>

      <Txt className="mb-7 mt-2 text-sm leading-6 text-muted">
        Pick a session and go. Personalized training
        will be added in the next phase.
      </Txt>

      {demoPlans.map((plan, index) => (
        <Pressable
          key={plan.id}
          onPress={() => {
            router.push(`/workout?plan=${plan.id}`);
          }}
          className="mb-4 overflow-hidden rounded-[28px] border border-border bg-panel p-5"
        >
          <View className="mb-7 flex-row items-center justify-between">
            <Txt
              weight="extra"
              className="text-[10px] tracking-[2px] text-brand"
            >
              {plan.tag}
            </Txt>

            <MaterialCommunityIcons
              name={
                index === 0
                  ? "arm-flex"
                  : index === 1
                    ? "run-fast"
                    : "dumbbell"
              }
              color={C.brand}
              size={29}
            />
          </View>

          <Txt
            weight="extra"
            className="text-[29px] tracking-tight"
          >
            {plan.name.toUpperCase()}
          </Txt>

          <Txt className="mt-1 text-sm text-muted">
            {plan.subtitle}
          </Txt>

          <View className="mt-5 flex-row items-center justify-between">
            <Txt
              weight="medium"
              className="text-xs text-muted"
            >
              {plan.minutes} MIN · {plan.count} EXERCISES
            </Txt>

            <View className="h-10 w-10 items-center justify-center rounded-full bg-brand">
              <MaterialCommunityIcons
                name="arrow-top-right"
                color={C.bg}
                size={22}
              />
            </View>
          </View>
        </Pressable>
      ))}

      <View className="mt-2 rounded-2xl border border-border bg-elevated p-5">
        <Txt weight="bold" className="text-base">
          COMING NEXT
        </Txt>

        <Txt className="mt-1 text-sm leading-6 text-muted">
          Personalized plans, exercise history, weight
          and rep logging, and exercise substitutions.
        </Txt>
      </View>
    </ScrollView>
  );
}
