import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Txt } from "@/src/components/ui";
import { ProgressFill } from "@/src/components/motion";
import { Sheet } from "./editors";
import { Icon, SmallButton } from "./visuals";
import { goalStatuses } from "./goal-status";
import type { Goals, ProgressEvent, ProgressWorkout } from "./model";

export function GoalsSummary({
  goals,
  hasGoals,
  events,
  workouts,
  unit,
  loading,
  error,
  onRetry,
  onClose,
  onEdit,
}: {
  goals: Goals;
  hasGoals: boolean;
  events: ProgressEvent[];
  workouts: ProgressWorkout[];
  unit: "kg" | "lb";
  loading: boolean;
  error: string;
  onRetry: () => void;
  onClose: () => void;
  onEdit: () => void;
}) {
  const rows = hasGoals ? goalStatuses(goals, events, workouts, unit) : [];
  const weekly = rows.find((row) => row.key === "weeklyWorkouts");
  const remaining = weekly ? Math.max(0, weekly.target - (weekly.value ?? 0)) : 0;
  const format = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return (
    <Sheet title="My goals" subtitle="Your plan, and how it’s coming along." onClose={onClose}>
      {loading && !hasGoals && !error ? (
        <View className="items-center gap-3 py-8">
          <ActivityIndicator color="#C5F460" />
          <Txt className="text-sm text-muted">Opening your goals…</Txt>
        </View>
      ) : error ? (
        <View className="gap-4 py-5">
          <Txt className="text-sm leading-6 text-muted">{error}</Txt>
          <SmallButton label="Retry loading goals" icon="sync" onPress={onRetry} />
        </View>
      ) : !hasGoals ? (
        <View>
          <View
            className="items-center rounded-[26px] px-5 py-7"
            style={{ backgroundColor: "#C5F46012" }}
          >
            <View
              className="h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: "#C5F46020" }}
            >
              <Icon name="bullseye-arrow" size={34} color="#C5F460" />
            </View>
            <Txt weight="semibold" className="mt-5 text-center text-xl">
              Give your progress a direction
            </Txt>
            <Txt className="mt-3 text-center text-sm leading-6 text-muted">
              Start with one weekly workout goal. Add water, weight, or nutrition targets only if
              they matter to you.
            </Txt>
          </View>
          <View className="mt-5">
            <SmallButton
              label="Set my goals"
              icon="bullseye-arrow"
              color="#C5F460"
              onPress={onEdit}
            />
          </View>
          <Txt className="mt-3 text-center text-xs leading-5 text-muted">
            You can change them anytime.
          </Txt>
        </View>
      ) : (
        <>
          <View className="mb-5 rounded-[24px] p-5" style={{ backgroundColor: "#C5F46012" }}>
            <Icon
              name={weekly?.reached ? "check-circle-outline" : "bullseye-arrow"}
              size={26}
              color="#C5F460"
            />
            <Txt weight="semibold" className="mt-3 text-xl">
              {weekly?.reached
                ? "Your weekly goal is complete"
                : `${remaining} ${remaining === 1 ? "workout" : "workouts"} to your weekly goal`}
            </Txt>
            <Txt className="mt-2 text-xs leading-5 text-muted">
              {weekly?.reached
                ? "Take a moment to enjoy the work you put in."
                : "Every completed session brings you a little closer."}
            </Txt>
          </View>
          {rows.map((row) => (
            <View key={row.key} className="mb-3 rounded-[22px] bg-elevated p-4">
              <View className="flex-row items-center gap-3">
                <View
                  className="h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${row.color}18` }}
                >
                  <Icon name={row.icon} size={22} color={row.color} />
                </View>
                <View className="flex-1">
                  <Txt weight="medium" className="text-sm">
                    {row.label}
                  </Txt>
                  <Txt className="mt-1 text-[10px] text-muted">{row.period}</Txt>
                </View>
                {row.reached && <Icon name="check-circle" size={22} color={row.color} />}
              </View>
              <View className="mt-3 flex-row flex-wrap items-baseline gap-1">
                <Txt weight="semibold" className="text-2xl">
                  {row.value === null ? "—" : format(row.value)}
                </Txt>
                <Txt className="text-xs text-muted">
                  {row.key === "weight"
                    ? `${row.unit} · target ${format(row.target)} ${row.unit}`
                    : `/ ${format(row.target)} ${row.unit}`}
                </Txt>
              </View>
              {row.ratio !== null && (
                <View className="mt-3">
                  <ProgressFill ratio={row.ratio} height={5} color={row.color} />
                </View>
              )}
              {row.value === null && (
                <Txt className="mt-2 text-xs text-muted">
                  {row.key === "weight"
                    ? "Log your weight in Progress to see your starting point."
                    : "No check-in yet today."}
                </Txt>
              )}
            </View>
          ))}
          <View className="mt-3">
            <SmallButton
              label="Edit goals"
              icon="pencil-outline"
              color="#C5F460"
              onPress={onEdit}
            />
          </View>
        </>
      )}
    </Sheet>
  );
}
