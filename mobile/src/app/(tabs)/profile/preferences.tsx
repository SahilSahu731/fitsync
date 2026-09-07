import { ActionButton } from "@/components/action-button";
import { Ionicons } from "@expo/vector-icons";

import * as Haptics from "expo-haptics";

import { router } from "expo-router";

import { useState } from "react";

import { Pressable, ScrollView, Text, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthStore } from "@/features/auth/store";

import type {
  ExperienceLevel,
  FitnessGoal,
  WeightUnit,
} from "@/features/auth/types";

import { updatePreferences } from "@/features/profile/api";

import { ChoiceCard } from "@/features/profile/components/choice-card";

import { EXPERIENCE_LEVELS, FITNESS_GOALS } from "@/features/profile/options";

import { parseApiError } from "@/lib/api/errors";

export default function PreferencesScreen(): React.ReactElement {
  const user = useAuthStore((state) => state.user);

  const setUser = useAuthStore((state) => state.setUser);

  const [goal, setGoal] = useState<FitnessGoal>(
    user?.fitness_goal ?? "STAY_ACTIVE",
  );

  const [experience, setExperience] = useState<ExperienceLevel>(
    user?.experience_level ?? "BEGINNER",
  );

  const [unit, setUnit] = useState<WeightUnit>(user?.weight_unit ?? "KG");

  const [target, setTarget] = useState<number>(
    user?.weekly_workout_target ?? 3,
  );

  const [loading, setLoading] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);

  async function handleSave(): Promise<void> {
    setLoading(true);

    setError(null);

    try {
      const updated = await updatePreferences({
        fitness_goal: goal,
        experience_level: experience,
        weight_unit: unit,
        weekly_workout_target: target,
      });

      setUser(updated);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      router.back();
    } catch (requestError) {
      setError(
        parseApiError(requestError, "Couldn't save your preferences.").message,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1">
        <View className="flex-row items-center px-6 pt-4">
          <Pressable
            onPress={router.back}
            className="h-11 w-11 items-center justify-center rounded-full bg-white/[0.06]"
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </Pressable>

          <Text className="ml-4 text-[20px] font-extrabold text-white">
            Training preferences
          </Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            padding: 24,
            paddingBottom: 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-[13px] font-semibold uppercase tracking-[1.8px] text-white/35">
            Primary goal
          </Text>

          <View className="mt-4 gap-3">
            {FITNESS_GOALS.map((option) => (
              <ChoiceCard
                key={option.value}
                title={option.title}
                description={option.description}
                selected={goal === option.value}
                onPress={() => {
                  setGoal(option.value);
                  void Haptics.selectionAsync();
                }}
              />
            ))}
          </View>

          <Text className="mt-10 text-[13px] font-semibold uppercase tracking-[1.8px] text-white/35">
            Experience
          </Text>

          <View className="mt-4 gap-3">
            {EXPERIENCE_LEVELS.map((option) => (
              <ChoiceCard
                key={option.value}
                title={option.title}
                description={option.description}
                selected={experience === option.value}
                onPress={() => {
                  setExperience(option.value);
                  void Haptics.selectionAsync();
                }}
              />
            ))}
          </View>

          <Text className="mt-10 text-[13px] font-semibold uppercase tracking-[1.8px] text-white/35">
            Weight unit
          </Text>

          <View className="mt-4 flex-row gap-3">
            {(["KG", "LB"] as const).map((value) => {
              const selected = unit === value;

              return (
                <Pressable
                  key={value}
                  onPress={() => {
                    setUnit(value);
                    void Haptics.selectionAsync();
                  }}
                  className="min-h-[56px] flex-1 items-center justify-center rounded-2xl border"
                  style={{
                    borderColor: selected
                      ? "rgba(56,189,248,.6)"
                      : "rgba(255,255,255,.1)",
                    backgroundColor: selected
                      ? "rgba(56,189,248,.08)"
                      : "rgba(255,255,255,.035)",
                  }}
                >
                  <Text
                    className="font-bold"
                    style={{
                      color: selected ? "#38BDF8" : "#FFFFFF",
                    }}
                  >
                    {value}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="mt-10 text-[13px] font-semibold uppercase tracking-[1.8px] text-white/35">
            Weekly workout target
          </Text>

          <Text className="mt-4 text-[32px] font-extrabold text-white">
            {target}
            <Text className="text-[15px] font-semibold text-white/40">
              {" "}
              workouts
            </Text>
          </Text>

          <View className="mt-4 flex-row gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((value) => {
              const selected = target === value;

              return (
                <Pressable
                  key={value}
                  onPress={() => {
                    setTarget(value);
                    void Haptics.selectionAsync();
                  }}
                  className="h-11 flex-1 items-center justify-center rounded-xl border"
                  style={{
                    borderColor: selected ? "#38BDF8" : "rgba(255,255,255,.1)",
                    backgroundColor: selected
                      ? "#38BDF8"
                      : "rgba(255,255,255,.035)",
                  }}
                >
                  <Text
                    className="font-bold"
                    style={{
                      color: selected ? "#090909" : "rgba(255,255,255,.6)",
                    }}
                  >
                    {value}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {error ? (
            <Text className="mt-6 text-[13px] leading-5 text-red-300">
              {error}
            </Text>
          ) : null}
        </ScrollView>

        <View
          className="border-t border-white/[0.06] bg-background px-6 pb-5 pt-4"
          style={{ flexShrink: 0 }}
        >
          <ActionButton
            title="Save preferences"
            loading={loading}
            onPress={() => {
              void handleSave();
            }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
