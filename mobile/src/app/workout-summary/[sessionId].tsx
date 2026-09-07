import {
  Ionicons,
} from "@expo/vector-icons";

import {
  router,
  useLocalSearchParams,
} from "expo-router";

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  useAuthStore,
} from "@/features/auth/store";

import {
  useWorkoutSession,
} from "@/features/workouts/queries";

import {
  formatCompactDuration,
  formatVolume,
  workoutVolume,
} from "@/features/workouts/utils";


export default function WorkoutSummaryScreen() {
  const params =
    useLocalSearchParams<{
      sessionId?: string;
    }>();

  const sessionId =
    typeof params.sessionId ===
    "string"
      ? params.sessionId
      : "";

  const user =
    useAuthStore(
      (
        state,
      ) =>
        state.user,
    );

  const query =
    useWorkoutSession(
      sessionId
    );

  if (
    query.isLoading
  ) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator
          color="#3B82F6"
        />
      </SafeAreaView>
    );
  }

  const workout =
    query.data;

  if (!workout) {
    return null;
  }

  const volume =
    workoutVolume(
      workout,
      user?.weight_unit ??
        "KG",
    );


  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={{
          padding:
            22,

          paddingBottom:
            50,
        }}
      >
        <View className="h-14 w-14 items-center justify-center rounded-full bg-brand">
          <Ionicons
            name="checkmark"
            size={27}
            color="#FFFFFF"
          />
        </View>

        <Text className="mt-6 text-[13px] font-bold uppercase tracking-[1.8px] text-brand-bright">
          Workout complete
        </Text>

        <Text className="mt-2 text-[34px] font-extrabold tracking-[-1.4px] text-white">
          {workout.name}
        </Text>

        <View className="mt-8 flex-row rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-5">
          <Stat
            label="Duration"
            value={
              formatCompactDuration(
                workout.duration_seconds ??
                  0
              )
            }
          />

          <Stat
            label="Volume"
            value={`${formatVolume(
              volume
            )} ${
              user
                ?.weight_unit ??
              "KG"
            }`}
          />

          <Stat
            label="Sets"
            value={
              String(
                workout
                  .completed_set_count
              )
            }
          />
        </View>

        <Text className="mt-9 text-[19px] font-extrabold text-white">
          Exercises
        </Text>

        <View className="mt-4 gap-2">
          {workout.exercises.map(
            (
              exercise,
            ) => (
              <View
                key={
                  exercise.id
                }
                className="flex-row items-center rounded-2xl bg-white/[0.025] px-4 py-4"
              >
                <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-muted">
                  <Ionicons
                    name="barbell-outline"
                    size={17}
                    color="#60A5FA"
                  />
                </View>

                <View className="ml-3 flex-1">
                  <Text className="text-[14px] font-bold text-white">
                    {exercise.exercise_name}
                  </Text>

                  <Text className="mt-1 text-[11px] text-white/30">
                    {
                      exercise.sets.filter(
                        (
                          workoutSet,
                        ) =>
                          workoutSet.completed,
                      ).length
                    }{" "}
                    completed sets
                  </Text>
                </View>
              </View>
            ),
          )}
        </View>

        <Pressable
          onPress={() => {
            router.replace(
              "/train"
            );
          }}
          className="mt-9 min-h-[56px] items-center justify-center rounded-2xl bg-brand"
        >
          <Text className="text-[15px] font-extrabold text-white">
            Done
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            router.push(
              `/workout-history/${workout.id}`
            );
          }}
          className="mt-3 min-h-[52px] items-center justify-center rounded-2xl bg-white/[0.04]"
        >
          <Text className="text-[13px] font-bold text-white/55">
            View full workout
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}


function Stat({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <View className="flex-1">
      <Text className="text-[10px] font-bold uppercase tracking-[1px] text-white/25">
        {label}
      </Text>

      <Text className="mt-2 text-[16px] font-extrabold text-white">
        {value}
      </Text>
    </View>
  );
}