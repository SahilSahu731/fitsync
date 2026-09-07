import { ActionButton } from "@/components/action-button";
import { Ionicons } from "@expo/vector-icons";

import * as Haptics from "expo-haptics";

import { LinearGradient } from "expo-linear-gradient";

import { useMemo, useState } from "react";

import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { ChoiceCard } from "@/features/profile/components/choice-card";

import { OnboardingProgress } from "@/features/profile/components/onboarding-progress";

import {
  checkUsernameAvailability,
  completeOnboarding,
} from "@/features/profile/api";

import { useAuthStore } from "@/features/auth/store";

import { parseApiError } from "@/lib/api/errors";

import type {
  ExperienceLevel,
  FitnessGoal,
  WeightUnit,
} from "@/features/auth/types";

const TOTAL_STEPS = 4;

const FITNESS_GOALS: {
  value: FitnessGoal;
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}[] = [
  {
    value: "BUILD_MUSCLE",

    title: "Build muscle",

    description: "Focus on hypertrophy and progressive overload.",

    icon: "barbell-outline",
  },

  {
    value: "GET_STRONGER",

    title: "Get stronger",

    description: "Push your main lifts and improve raw strength.",

    icon: "flash-outline",
  },

  {
    value: "LOSE_FAT",

    title: "Lose fat",

    description: "Train consistently while improving body composition.",

    icon: "flame-outline",
  },

  {
    value: "IMPROVE_ENDURANCE",

    title: "Improve endurance",

    description: "Build work capacity and overall conditioning.",

    icon: "pulse-outline",
  },

  {
    value: "STAY_ACTIVE",

    title: "Stay active",

    description: "Build a sustainable training habit.",

    icon: "walk-outline",
  },

  {
    value: "OTHER",

    title: "Something else",

    description: "You can still use every FitSync training feature.",

    icon: "ellipsis-horizontal",
  },
];

const EXPERIENCE_LEVELS: {
  value: ExperienceLevel;
  title: string;
  description: string;
}[] = [
  {
    value: "BEGINNER",

    title: "Beginner",

    description: "I'm still learning exercises, programming, and consistency.",
  },

  {
    value: "INTERMEDIATE",

    title: "Intermediate",

    description: "I train consistently and understand the major movements.",
  },

  {
    value: "ADVANCED",

    title: "Advanced",

    description: "I have years of structured training experience.",
  },
];

export default function OnboardingScreen() {
  const user = useAuthStore((state) => state.user);

  const setUser = useAuthStore((state) => state.setUser);

  const [step, setStep] = useState(1);

  const [displayName, setDisplayName] = useState(user?.display_name ?? "");

  const [username, setUsername] = useState(user?.username ?? "");

  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal | null>(
    user?.fitness_goal ?? null,
  );

  const [experienceLevel, setExperienceLevel] =
    useState<ExperienceLevel | null>(user?.experience_level ?? null);

  const [weightUnit, setWeightUnit] = useState<WeightUnit>(
    user?.weight_unit ?? "KG",
  );

  const [weeklyTarget, setWeeklyTarget] = useState(
    user?.weekly_workout_target ?? 3,
  );

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const normalizedUsername = useMemo(
    () => username.trim().toLowerCase(),
    [username],
  );

  async function validateIdentity(): Promise<boolean> {
    const name = displayName.trim();

    if (name.length < 2) {
      setError("Enter your name.");

      return false;
    }

    if (!/^[a-z0-9_]{3,24}$/.test(normalizedUsername)) {
      setError(
        "Username must be 3–24 characters using lowercase letters, numbers, or underscores.",
      );

      return false;
    }

    setLoading(true);

    try {
      const result = await checkUsernameAvailability(normalizedUsername);

      if (!result.available) {
        setError("That username is already taken.");

        return false;
      }

      return true;
    } catch (requestError) {
      setError(
        parseApiError(requestError, "Couldn't check that username.").message,
      );

      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleContinue() {
    setError(null);

    if (step === 1) {
      const valid = await validateIdentity();

      if (!valid) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        return;
      }
    }

    if (step === 2 && !fitnessGoal) {
      setError("Choose the goal that fits you best.");

      return;
    }

    if (step === 3 && !experienceLevel) {
      setError("Choose your training experience.");

      return;
    }

    if (step < TOTAL_STEPS) {
      await Haptics.selectionAsync();

      setStep((current) => current + 1);

      return;
    }

    if (!fitnessGoal || !experienceLevel) {
      return;
    }

    setLoading(true);

    try {
      const updatedUser = await completeOnboarding({
        display_name: displayName.trim(),

        username: normalizedUsername,

        fitness_goal: fitnessGoal,

        experience_level: experienceLevel,

        weight_unit: weightUnit,

        weekly_workout_target: weeklyTarget,
      });

      /*
       * This flips onboarding_complete
       * to true.
       *
       * Root Stack.Protected then moves
       * us into (tabs).
       */
      setUser(updatedUser);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (requestError) {
      setError(
        parseApiError(requestError, "Couldn't finish your setup.").message,
      );
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    if (step <= 1) {
      return;
    }

    setError(null);

    setStep((current) => current - 1);
  }

  return (
    <View className="flex-1 bg-background">
      <LinearGradient
        colors={["#081826", "#080808", "#080808"]}
        locations={[0, 0.38, 1]}
        className="absolute inset-0"
      />

      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View className="flex-1 px-6">
            <View className="pt-4">
              <View className="flex-row items-center">
                <View className="flex-1">
                  <OnboardingProgress step={step} total={TOTAL_STEPS} />
                </View>

                {step > 1 ? (
                  <Pressable
                    onPress={handleBack}
                    hitSlop={12}
                    className="ml-5 h-10 w-10 items-center justify-center rounded-full bg-white/[0.06]"
                  >
                    <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                  </Pressable>
                ) : null}
              </View>
            </View>

            <ScrollView
              className="flex-1"
              contentContainerStyle={{
                paddingTop: 48,

                paddingBottom: 32,
              }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              {step === 1 ? (
                <>
                  <Text className="text-[38px] font-extrabold leading-[42px] tracking-[-1.6px] text-white">
                    Make FitSync yours.
                  </Text>

                  <Text className="mt-4 max-w-[350px] text-[15px] leading-6 text-white/55">
                    Your name and username are how your training buddies will
                    recognize you.
                  </Text>

                  <View className="mt-9 gap-5">
                    <View>
                      <Text className="mb-2 text-[13px] font-semibold text-white/60">
                        Name
                      </Text>

                      <TextInput
                        value={displayName}
                        onChangeText={(value) => {
                          setDisplayName(value);

                          setError(null);
                        }}
                        placeholder="Sahil Sahu"
                        placeholderTextColor="rgba(255,255,255,.28)"
                        autoCapitalize="words"
                        selectionColor="#38BDF8"
                        className="min-h-[58px] rounded-2xl border border-white/10 bg-white/[0.045] px-4 text-[16px] font-semibold text-white"
                      />
                    </View>

                    <View>
                      <Text className="mb-2 text-[13px] font-semibold text-white/60">
                        Username
                      </Text>

                      <View className="min-h-[58px] flex-row items-center rounded-2xl border border-white/10 bg-white/[0.045] px-4">
                        <Text className="text-[16px] font-bold text-white/30">
                          @
                        </Text>

                        <TextInput
                          value={username}
                          onChangeText={(value) => {
                            setUsername(
                              value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                            );

                            setError(null);
                          }}
                          placeholder="sahil"
                          placeholderTextColor="rgba(255,255,255,.28)"
                          autoCapitalize="none"
                          autoCorrect={false}
                          maxLength={24}
                          selectionColor="#38BDF8"
                          className="ml-1 flex-1 py-4 text-[16px] font-semibold text-white"
                        />
                      </View>

                      <Text className="mt-2 text-[12px] leading-5 text-white/30">
                        3–24 characters. Letters, numbers and underscores.
                      </Text>
                    </View>
                  </View>
                </>
              ) : null}

              {step === 2 ? (
                <>
                  <Text className="text-[38px] font-extrabold leading-[42px] tracking-[-1.6px] text-white">
                    What are you training for?
                  </Text>

                  <Text className="mt-4 max-w-[350px] text-[15px] leading-6 text-white/55">
                    This helps FitSync shape your progress experience. You can
                    change it anytime.
                  </Text>

                  <View className="mt-8 gap-3">
                    {FITNESS_GOALS.map((goal) => (
                      <ChoiceCard
                        key={goal.value}
                        title={goal.title}
                        description={goal.description}
                        icon={goal.icon}
                        selected={fitnessGoal === goal.value}
                        onPress={() => {
                          setFitnessGoal(goal.value);

                          setError(null);

                          void Haptics.selectionAsync();
                        }}
                      />
                    ))}
                  </View>
                </>
              ) : null}

              {step === 3 ? (
                <>
                  <Text className="text-[38px] font-extrabold leading-[42px] tracking-[-1.6px] text-white">
                    How experienced are you?
                  </Text>

                  <Text className="mt-4 max-w-[350px] text-[15px] leading-6 text-white/55">
                    There&apos;s no right answer. This only helps us present
                    training information appropriately.
                  </Text>

                  <View className="mt-8 gap-3">
                    {EXPERIENCE_LEVELS.map((level) => (
                      <ChoiceCard
                        key={level.value}
                        title={level.title}
                        description={level.description}
                        selected={experienceLevel === level.value}
                        onPress={() => {
                          setExperienceLevel(level.value);

                          setError(null);

                          void Haptics.selectionAsync();
                        }}
                      />
                    ))}
                  </View>
                </>
              ) : null}

              {step === 4 ? (
                <>
                  <Text className="text-[38px] font-extrabold leading-[42px] tracking-[-1.6px] text-white">
                    Set your rhythm.
                  </Text>

                  <Text className="mt-4 max-w-[350px] text-[15px] leading-6 text-white/55">
                    Choose how FitSync should display weight and what a good
                    training week looks like.
                  </Text>

                  <Text className="mt-9 text-[13px] font-semibold text-white/60">
                    Weight unit
                  </Text>

                  <View className="mt-3 flex-row gap-3">
                    {(["KG", "LB"] as const).map((unit) => {
                      const selected = weightUnit === unit;

                      return (
                        <Pressable
                          key={unit}
                          onPress={() => {
                            setWeightUnit(unit);

                            void Haptics.selectionAsync();
                          }}
                          className="min-h-[56px] flex-1 items-center justify-center rounded-2xl border"
                          style={{
                            borderColor: selected
                              ? "rgba(56,189,248,.65)"
                              : "rgba(255,255,255,.10)",

                            backgroundColor: selected
                              ? "rgba(56,189,248,.08)"
                              : "rgba(255,255,255,.04)",
                          }}
                        >
                          <Text
                            className="text-[15px] font-bold"
                            style={{
                              color: selected ? "#38BDF8" : "#FFFFFF",
                            }}
                          >
                            {unit}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View className="mt-10">
                    <Text className="text-[13px] font-semibold text-white/60">
                      Weekly workout goal
                    </Text>

                    <Text className="mt-2 text-[34px] font-extrabold tracking-[-1px] text-white">
                      {weeklyTarget}
                      <Text className="text-[16px] font-semibold text-white/40">
                        {" "}
                        workouts
                      </Text>
                    </Text>

                    <View className="mt-5 flex-row gap-2">
                      {[1, 2, 3, 4, 5, 6, 7].map((target) => {
                        const selected = weeklyTarget === target;

                        return (
                          <Pressable
                            key={target}
                            onPress={() => {
                              setWeeklyTarget(target);

                              void Haptics.selectionAsync();
                            }}
                            className="h-11 flex-1 items-center justify-center rounded-xl border"
                            style={{
                              borderColor: selected
                                ? "rgba(56,189,248,.65)"
                                : "rgba(255,255,255,.10)",

                              backgroundColor: selected
                                ? "#38BDF8"
                                : "rgba(255,255,255,.04)",
                            }}
                          >
                            <Text
                              className="font-bold"
                              style={{
                                color: selected
                                  ? "#090909"
                                  : "rgba(255,255,255,.65)",
                              }}
                            >
                              {target}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <Text className="mt-3 text-[12px] leading-5 text-white/30">
                      Rest days matter. This is a weekly target, not a daily
                      streak.
                    </Text>
                  </View>
                </>
              ) : null}

              {error ? (
                <View className="mt-6 flex-row items-start gap-2 rounded-2xl border border-red-400/15 bg-red-400/[0.05] px-4 py-3">
                  <Ionicons
                    name="alert-circle-outline"
                    size={17}
                    color="#F87171"
                    style={{
                      marginTop: 1,
                    }}
                  />

                  <Text className="flex-1 text-[13px] leading-5 text-red-300">
                    {error}
                  </Text>
                </View>
              ) : null}
              <View className="pb-5 pt-6">
                <ActionButton
                  title={step === TOTAL_STEPS ? "Finish setup" : "Continue"}
                  loading={loading}
                  onPress={() => {
                    void handleContinue();
                  }}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
