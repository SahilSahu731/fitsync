import React, { useCallback, useState } from "react";
import { View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { writeAccountPreference } from "@/src/services/account-preferences";
import { useFocusEffect, useRouter } from "expo-router";
import { Txt } from "@/src/components/ui";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { Sheet } from "./editors";
import { GoalsSummary } from "./goals-summary";
import { Icon, SmallButton } from "./visuals";
import type { Goals, ProgressEvent, ProgressWorkout } from "./model";

const seenThisSession = new Set<string>();
export const goalWelcomeKey = (ownerId: string) => `fitsync.goals-welcome.v1.${ownerId}`;
export function HomeGoals({
  ownerId,
  hasGoals,
  ready,
  activeWorkout,
  goals,
  events,
  workouts,
  unit,
  completed,
  onRetry,
}: {
  ownerId: string;
  hasGoals: boolean;
  ready: boolean;
  activeWorkout: boolean;
  goals: Goals;
  events: ProgressEvent[];
  workouts: ProgressWorkout[];
  unit: "kg" | "lb";
  completed: number;
  onRetry: () => void;
}) {
  const router = useRouter();
  const [welcomeOwner, setWelcomeOwner] = useState("");
  const [summary, setSummary] = useState(false);
  useFocusEffect(
    useCallback(() => {
      let current = true;
      setWelcomeOwner("");
      setSummary(false);
      if (ownerId && ready && !hasGoals && !activeWorkout && !seenThisSession.has(ownerId)) {
        void AsyncStorage.getItem(goalWelcomeKey(ownerId))
          .then((seen) => {
            if (!current || seen || seenThisSession.has(ownerId)) return;
            seenThisSession.add(ownerId);
            setWelcomeOwner(ownerId);
            void writeAccountPreference(ownerId, goalWelcomeKey(ownerId), "seen").catch(() => {
              /* Keep it dismissed for this session when storage is unavailable. */
            });
          })
          .catch(() => {
            /* The non-blocking card stays available. */
          });
      }
      return () => {
        current = false;
        setWelcomeOwner("");
        setSummary(false);
      };
    }, [ownerId, ready, hasGoals, activeWorkout]),
  );
  function setup() {
    setWelcomeOwner("");
    setSummary(false);
    router.push("/goals");
  }
  if (!ownerId || !ready) return null;
  const remaining = Math.max(0, goals.weeklyWorkouts - completed);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={hasGoals ? "View my goals" : "Set my goals"}
        onPress={() => (hasGoals ? setSummary(true) : setup())}
        className="mb-5 flex-row items-center gap-3 rounded-[22px] border p-4"
        style={{ borderColor: "#C5F46030", backgroundColor: "#C5F4600C" }}
      >
        <View
          className="h-11 w-11 items-center justify-center rounded-2xl"
          style={{ backgroundColor: "#C5F46018" }}
        >
          <Icon
            name={hasGoals && !remaining ? "check-circle-outline" : "bullseye-arrow"}
            size={25}
            color="#C5F460"
          />
        </View>
        <View className="min-w-0 flex-1">
          <Txt weight="medium" className="text-sm">
            {hasGoals
              ? remaining
                ? `${remaining} ${remaining === 1 ? "workout" : "workouts"} to your weekly goal`
                : "Weekly goal complete"
              : "Make progress your way"}
          </Txt>
          <Txt className="mt-1 text-xs text-muted">
            {hasGoals ? "View my goals" : "Set your goals now"}
          </Txt>
        </View>
        <Icon name="arrow-right" size={19} color="#C5F460" />
      </Pressable>
      {welcomeOwner === ownerId && !hasGoals && !activeWorkout && (
        <Sheet title="Make it your own" onClose={() => setWelcomeOwner("")}>
          <View className="items-center px-1 pt-2">
            <View
              className="h-20 w-20 items-center justify-center rounded-full"
              style={{ backgroundColor: "#C5F46018" }}
            >
              <Icon name="bullseye-arrow" size={42} color="#C5F460" />
            </View>
            <Txt weight="semibold" className="mt-6 text-center text-2xl">
              What would you like to work toward?
            </Txt>
            <Txt className="mt-3 text-center text-sm leading-6 text-muted">
              Start with one weekly workout goal. Add other targets when you’re ready. Your plan can
              change with you.
            </Txt>
          </View>
          <View className="mt-6">
            <SmallButton
              label="Set my goals"
              icon="bullseye-arrow"
              color="#C5F460"
              onPress={setup}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => setWelcomeOwner("")}
            className="mt-2 min-h-12 items-center justify-center"
          >
            <Txt className="text-sm text-muted">Maybe later</Txt>
          </Pressable>
        </Sheet>
      )}
      {summary && (
        <GoalsSummary
          goals={goals}
          hasGoals={hasGoals}
          events={events}
          workouts={workouts}
          unit={unit}
          loading={false}
          error=""
          onRetry={onRetry}
          onClose={() => setSummary(false)}
          onEdit={setup}
        />
      )}
    </>
  );
}
