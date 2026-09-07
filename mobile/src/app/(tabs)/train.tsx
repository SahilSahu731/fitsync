import {
  Ionicons,
} from "@expo/vector-icons";

import {
  router,
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
  useStartWorkout,
} from "@/features/workouts/hooks";

import {
  useActiveWorkout,
  useWorkoutTemplates,
} from "@/features/workouts/queries";




export default function TrainScreen() {
  const templates =
    useWorkoutTemplates();

  const active =
    useActiveWorkout();

  const startMutation =
    useStartWorkout();

  const activeWorkout =
    active.data
      ?.workout;


  function startEmpty() {
    startMutation.mutate({
      name:
        "Workout",
    });
  }


  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={{
          padding:
            20,

          paddingBottom:
            100,
        }}
      >
        <Text className="text-[34px] font-extrabold tracking-[-1.4px] text-white">
          Train
        </Text>

        <Text className="mt-2 text-[14px] text-white/38">
          Log your workout. Keep moving.
        </Text>

        {active.isLoading ? (
          <View className="mt-8 h-28 items-center justify-center rounded-[24px] bg-white/[0.03]">
            <ActivityIndicator
              color="#3B82F6"
            />
          </View>
        ) : activeWorkout ? (
          <Pressable
            onPress={() => {
              router.push(
                `/workouts/active/${activeWorkout.id}`
              );
            }}
            className="mt-8 rounded-[26px] border border-brand-bright/30 bg-[#101A2E] p-5"
          >
            <View className="flex-row items-center">
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand/20">
                <Ionicons
                  name="play"
                  size={21}
                  color="#60A5FA"
                />
              </View>

              <View className="ml-4 flex-1">
                <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-brand-bright">
                  Workout in progress
                </Text>

                <Text className="mt-1 text-[19px] font-extrabold text-white">
                  {activeWorkout.name}
                </Text>

                <Text className="mt-1 text-[11px] text-white/35">
                  {activeWorkout.exercises.length}{" "}
                  exercises ·{" "}
                  {activeWorkout.completed_set_count}{" "}
                  sets done
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color="#60A5FA"
              />
            </View>
          </Pressable>
        ) : (
          <Pressable
            disabled={
              startMutation
                .isPending
            }
            onPress={
              startEmpty
            }
            className="mt-8 overflow-hidden rounded-[26px] bg-brand p-6"
            style={({
              pressed,
            }) => ({
              backgroundColor:
                pressed
                  ? "#1D4ED8"
                  : "#2563EB",

              transform: [
                {
                  scale:
                    pressed
                      ? 0.985
                      : 1,
                },
              ],
            })}
          >
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              {startMutation
                .isPending ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <Ionicons
                  name="play"
                  size={22}
                  color="#FFFFFF"
                />
              )}
            </View>

            <Text className="mt-6 text-[23px] font-extrabold text-white">
              Start empty workout
            </Text>

            <Text className="mt-2 text-[13px] leading-5 text-white/70">
              Add exercises as you train.
            </Text>
          </Pressable>
        )}

        <View className="mt-7 flex-row gap-3">
          <Pressable
            onPress={() => {
              router.push(
                "/workout-templates"
              );
            }}
            className="flex-1 rounded-[22px] border border-white/10 bg-white/[0.035] p-5"
          >
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand-muted">
              <Ionicons
                name="albums-outline"
                size={20}
                color="#60A5FA"
              />
            </View>

            <Text className="mt-5 text-[15px] font-bold text-white">
              Templates
            </Text>

            <Text className="mt-1 text-[12px] text-white/32">
              {templates
                .data
                ?.items
                .length ??
                0}{" "}
              saved
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              router.push(
                "/exercises"
              );
            }}
            className="flex-1 rounded-[22px] border border-white/10 bg-white/[0.035] p-5"
          >
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06]">
              <Ionicons
                name="barbell-outline"
                size={20}
                color="#FFFFFF"
              />
            </View>

            <Text className="mt-5 text-[15px] font-bold text-white">
              Exercises
            </Text>

            <Text className="mt-1 text-[12px] text-white/32">
              Browse library
            </Text>
          </Pressable>
        </View>

        <View className="mt-9 flex-row items-center justify-between">
          <Text className="text-[19px] font-extrabold text-white">
            Templates
          </Text>

          <Pressable
            onPress={() => {
              router.push(
                "/workout-templates"
              );
            }}
          >
            <Text className="text-[12px] font-bold text-brand-bright">
              Manage
            </Text>
          </Pressable>
        </View>

        <View className="mt-4 gap-3">
          {templates
            .data
            ?.items
            .slice(
              0,
              4,
            )
            .map(
              (
                template,
              ) => (
                <View
                  key={
                    template.id
                  }
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <View className="flex-row items-center">
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand-muted">
                      <Ionicons
                        name="barbell"
                        size={18}
                        color="#60A5FA"
                      />
                    </View>

                    <View className="ml-3 flex-1">
                      <Text className="text-[15px] font-bold text-white">
                        {template.name}
                      </Text>

                      <Text
                        numberOfLines={
                          1
                        }
                        className="mt-1 text-[11px] text-white/30"
                      >
                        {template.exercise_names.join(
                          " · "
                        )}
                      </Text>
                    </View>
                  </View>

                  <View className="mt-4 flex-row gap-2">
                    <Pressable
                      onPress={() => {
                        router.push(
                          `/workout-templates/${template.id}`
                        );
                      }}
                      className="min-h-[44px] flex-1 items-center justify-center rounded-xl bg-white/[0.05]"
                    >
                      <Text className="text-[12px] font-bold text-white/65">
                        Edit
                      </Text>
                    </Pressable>

                    <Pressable
                      disabled={
                        Boolean(
                          activeWorkout
                        ) ||
                        startMutation
                          .isPending
                      }
                      onPress={() => {
                        startMutation
                          .mutate({
                            template_id:
                              template.id,
                          });
                      }}
                      className="min-h-[44px] flex-1 items-center justify-center rounded-xl bg-brand"
                      style={{
                        opacity:
                          activeWorkout
                            ? 0.35
                            : 1,
                      }}
                    >
                      <Text className="text-[12px] font-extrabold text-white">
                        Start
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ),
            )}
        </View>

        <Pressable
          onPress={() => {
            router.push(
              "/workout-history"
            );
          }}
          className="mt-8 flex-row items-center rounded-2xl border border-white/10 bg-white/[0.03] p-4"
        >
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05]">
            <Ionicons
              name="time-outline"
              size={19}
              color="#FFFFFF"
            />
          </View>

          <View className="ml-3 flex-1">
            <Text className="text-[15px] font-bold text-white">
              Workout history
            </Text>

            <Text className="mt-1 text-[11px] text-white/30">
              Review your previous sessions
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={18}
            color="rgba(255,255,255,.2)"
          />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
