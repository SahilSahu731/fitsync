
import React, {
  useEffect,
  useMemo,
  useState
} from "react";

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
import * as Haptics from "expo-haptics";

import { C } from "@/src/constants/theme";
import { Txt } from "@/src/components/ui";
import { demoPlans, exercises } from "@/data/sample";

export default function WorkoutPreview() {
  const router = useRouter();

  const { plan: planId } =
    useLocalSearchParams<{ plan?: string }>();

  const plan = useMemo(() => {
    return (
      demoPlans.find(item => item.id === planId) ||
      demoPlans[0]
    );
  }, [planId]);

  const items = plan.exerciseIds
    .map(id => exercises.find(item => item.id === id))
    .filter(
      (item): item is (typeof exercises)[number] =>
        item !== undefined
    );

  const [completed, setCompleted] =
    useState<string[]>([]);

  const [seconds, setSeconds] = useState(90);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => {
      setSeconds(value => {
        if (value <= 1) {
          setRunning(false);
          return 0;
        }

        return value - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [running]);

  const toggleExercise = (id: string) => {
    setCompleted(previous =>
      previous.includes(id)
        ? previous.filter(item => item !== id)
        : [...previous, id]
    );

    Haptics.selectionAsync();
  };

  const toggleTimer = () => {
    if (seconds === 0) {
      setSeconds(90);
    }

    setRunning(value => !value);
  };

  const resetTimer = () => {
    setRunning(false);
    setSeconds(90);
  };

  const displayTime =
    `${String(Math.floor(seconds / 60)).padStart(2, "0")}:` +
    `${String(seconds % 60).padStart(2, "0")}`;

  return (
    <View className="flex-1 bg-bg">
      {/* Header */}

      <View className="flex-row items-center justify-between px-6 pb-4 pt-6">
        <Pressable
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-full border border-border"
        >
          <MaterialCommunityIcons
            name="arrow-left"
            color={C.ink}
            size={22}
          />
        </Pressable>

        <Txt
          weight="bold"
          className="text-xs tracking-[2px] text-brand"
        >
          SESSION PREVIEW
        </Txt>

        <MaterialCommunityIcons
          name="dumbbell"
          size={23}
          color={C.ink}
        />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: 40
        }}
      >
        <Txt
          weight="extra"
          className="mt-5 text-[39px] leading-[42px]"
        >
          {plan.name.toUpperCase()}.
        </Txt>

        <Txt className="mt-2 text-sm text-muted">
          {plan.minutes} min · {items.length} exercises · Example plan
        </Txt>

        {/* Rest timer */}

        <View className="mt-7 flex-row items-center justify-between rounded-3xl bg-brand p-5">
          <View>
            <Txt
              weight="bold"
              className="text-xs tracking-[2px] text-bg"
            >
              REST TIMER
            </Txt>

            <Txt
              weight="extra"
              className="mt-1 text-4xl text-bg"
            >
              {displayTime}
            </Txt>
          </View>

          <View className="flex-row gap-2">
            <Pressable
              onPress={toggleTimer}
              className="h-12 w-12 items-center justify-center rounded-full bg-bg"
            >
              <MaterialCommunityIcons
                name={running ? "pause" : "play"}
                color={C.ink}
                size={24}
              />
            </Pressable>

            <Pressable
              onPress={resetTimer}
              className="h-12 w-12 items-center justify-center rounded-full border border-bg"
            >
              <MaterialCommunityIcons
                name="restart"
                color={C.bg}
                size={24}
              />
            </Pressable>
          </View>
        </View>

        {/* Exercise list */}

        <View className="mb-4 mt-8 flex-row items-center justify-between">
          <Txt
            weight="extra"
            className="text-[22px]"
          >
            THE LINEUP
          </Txt>

          <Txt
            weight="semibold"
            className="text-xs text-brand"
          >
            {completed.length}/{items.length} DONE
          </Txt>
        </View>

        {items.map((exercise, index) => {
          const done = completed.includes(exercise.id);

          return (
            <Pressable
              key={exercise.id}
              onPress={() => toggleExercise(exercise.id)}
              className={`mb-3 flex-row items-center rounded-2xl border p-4 ${done ? "border-brand bg-[#252019]" : "border-border bg-panel"}`}
            >
              <View className="mr-4 h-12 w-12 items-center justify-center rounded-xl bg-elevated">
                <Txt
                  weight="extra"
                  className="text-base text-brand"
                >
                  {String(index + 1).padStart(2, "0")}
                </Txt>
              </View>

              <View className="flex-1">
                <Txt
                  weight="bold"
                  className="text-sm"
                >
                  {exercise.name}
                </Txt>

                <Txt className="mt-1 text-xs text-muted">
                  {exercise.sets} · {exercise.equipment}
                </Txt>
              </View>

              <MaterialCommunityIcons
                name={
                  done
                    ? "check-circle"
                    : "circle-outline"
                }
                size={27}
                color={done ? C.brand : C.muted}
              />
            </Pressable>
          );
        })}

        <Txt className="mt-3 text-xs leading-5 text-muted">
          Interactive preview only. Exercise checkmarks
          and this foreground timer are not saved or
          scheduled in the background.
        </Txt>
      </ScrollView>
    </View>
  );
}
