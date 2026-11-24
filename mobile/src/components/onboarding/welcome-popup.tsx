import React, { useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { useWorkout } from "@/src/features/workouts/workout-context";
import { OnboardingPopup } from "./popup";
import { DailyGoalsPopup } from "./daily-goals-popup";

export function WelcomePopup({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const workout = useWorkout();
  const [goals, setGoals] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const disabled = starting || workout.loading || workout.busy || !!workout.pendingCompletion;
  async function start() {
    if (disabled || lock.current) return;
    lock.current = true;
    setStarting(true);
    setError("");
    try {
      if (!workout.session) await workout.start();
      onClose();
      router.push("/workout");
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Could not start your workout. Try again.",
      );
    } finally {
      lock.current = false;
      setStarting(false);
    }
  }
  if (goals) return <DailyGoalsPopup onClose={onClose} />;
  return (
    <OnboardingPopup
      compact
      eyebrow="A LITTLE HELP GETTING STARTED"
      title="Make FitSync yours."
      subtitle="Three ways to find your rhythm."
      busy={starting}
      onClose={onClose}
      footer={
        <Pressable
          accessibilityRole="button"
          disabled={starting}
          onPress={onClose}
          className="min-h-11 items-center justify-center"
        >
          <Txt className="text-[11px] text-[#9EA99E]">I’ll explore on my own</Txt>
        </Pressable>
      }
    >
      <View className="gap-2.5">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Set your goals"
          disabled={starting}
          onPress={() => setGoals(true)}
          className="min-h-[68px] flex-row items-center gap-3 rounded-[18px] bg-[#C5F460] px-3.5 py-3"
        >
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-black/10">
            <MaterialCommunityIcons name="bullseye-arrow" size={22} color="#263A16" />
          </View>
          <View className="flex-1">
            <Txt weight="semibold" className="text-[13px] text-[#1B2A10]">
              Set your goals
            </Txt>
            <Txt className="mt-0.5 text-[10px] text-[#455B31]">Water, steps & nutrition</Txt>
          </View>
          <MaterialCommunityIcons name="arrow-top-right" size={20} color="#263A16" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Explore Pro"
          disabled={starting}
          onPress={() => {
            onClose();
            router.push("/(tabs)/pro");
          }}
          className="min-h-[68px] flex-row items-center gap-3 rounded-[18px] border border-[#E9D5A1]/20 bg-[#E9D5A1]/[0.06] px-3.5 py-3"
        >
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#E9D5A1]/10">
            <MaterialCommunityIcons name="crown-outline" size={22} color="#E9D5A1" />
          </View>
          <View className="flex-1">
            <Txt weight="medium" className="text-[13px] text-[#E9D5A1]">
              Explore Pro
            </Txt>
            <Txt className="mt-0.5 text-[10px] text-[#BFB6A0]">A little more support</Txt>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#BFB6A0" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start your first workout"
          accessibilityState={{ disabled, busy: starting }}
          disabled={disabled}
          onPress={() => void start()}
          className="min-h-[68px] flex-row items-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.035] px-3.5 py-3"
          style={{ opacity: disabled ? 0.5 : 1 }}
        >
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-white/5">
            <MaterialCommunityIcons name="dumbbell" size={22} color="#D2DAD2" />
          </View>
          <View className="flex-1">
            <Txt weight="medium" className="text-[13px]">
              {starting ? "Getting ready…" : "Start your first workout"}
            </Txt>
            <Txt className="mt-0.5 text-[10px] text-[#9EA99E]">Your first rep starts here</Txt>
          </View>
          {starting ? (
            <ActivityIndicator color="#C5F460" />
          ) : (
            <MaterialCommunityIcons name="chevron-right" size={20} color="#9EA99E" />
          )}
        </Pressable>
      </View>
      {!!error && (
        <Txt accessibilityRole="alert" className="mt-3 text-xs leading-5 text-red-300">
          {error}
        </Txt>
      )}
    </OnboardingPopup>
  );
}
