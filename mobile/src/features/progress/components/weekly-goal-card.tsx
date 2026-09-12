import { Ionicons } from "@expo/vector-icons";

import { Pressable, Text, View } from "react-native";

import type { WeeklyGoal } from "../types";

interface Props {
  goal: WeeklyGoal;

  updating: boolean;

  onChangeTarget: (value: number) => void;
}

export function WeeklyGoalCard({ goal, updating, onChangeTarget }: Props) {
  return (
    <View className="rounded-[26px] border border-white/[0.08] bg-white/[0.025] p-5">
      <View className="flex-row items-center">
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-brand-muted">
          <Ionicons name="calendar-outline" size={20} color="#60A5FA" />
        </View>

        <View className="ml-3 flex-1">
          <Text className="text-white/28 text-[11px] font-bold uppercase tracking-[1.3px]">
            Weekly goal
          </Text>

          <Text className="mt-1 text-[19px] font-extrabold text-white">
            {goal.completed} / {goal.target} workouts
          </Text>
        </View>

        <View className="flex-row items-center rounded-xl bg-white/[0.04]">
          <Pressable
            disabled={updating || goal.target <= 1}
            onPress={() => {
              onChangeTarget(goal.target - 1);
            }}
            className="h-9 w-9 items-center justify-center"
          >
            <Ionicons name="remove" size={16} color="rgba(255,255,255,.5)" />
          </Pressable>

          <Text className="min-w-6 text-center text-[12px] font-bold text-white">
            {goal.target}
          </Text>

          <Pressable
            disabled={updating || goal.target >= 7}
            onPress={() => {
              onChangeTarget(goal.target + 1);
            }}
            className="h-9 w-9 items-center justify-center"
          >
            <Ionicons name="add" size={16} color="rgba(255,255,255,.5)" />
          </Pressable>
        </View>
      </View>

      <View className="mt-5 h-[7px] overflow-hidden rounded-full bg-white/[0.07]">
        <View
          className="h-full rounded-full bg-brand"
          style={{
            width: `${Math.min(100, goal.percentage)}%`,
          }}
        />
      </View>

      <View className="mt-4 flex-row items-center">
        <Text className="flex-1 text-[12px] text-white/35">
          {goal.remaining === 0
            ? "Goal complete"
            : `${goal.remaining} workout${
                goal.remaining === 1 ? "" : "s"
              } to go`}
        </Text>

        {goal.current_streak > 0 ? (
          <View className="flex-row items-center">
            <Ionicons name="flame-outline" size={15} color="#60A5FA" />

            <Text className="ml-1 text-[11px] font-bold text-brand-bright">
              {goal.current_streak} week streak
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
