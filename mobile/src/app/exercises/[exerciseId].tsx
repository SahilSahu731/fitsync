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
  ExerciseMediaGallery,
} from "@/features/exercises/components/exercise-media-gallery";

import {
  prettifyEnum,
} from "@/features/exercises/constants";

import {
  useExercise,
} from "@/features/exercises/queries";


export default function ExerciseDetailScreen() {
  const params =
    useLocalSearchParams<{
      exerciseId?: string;
    }>();

  const exerciseId =
    typeof params.exerciseId ===
    "string"
      ? params.exerciseId
      : "";

  const query =
    useExercise(
      exerciseId
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

  if (
    !query.data
  ) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <Text className="text-white/50">
          Exercise not found.
        </Text>
      </SafeAreaView>
    );
  }

  const exercise =
    query.data;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="absolute left-5 top-14 z-20">
        <Pressable
          onPress={
            router.back
          }
          className="h-11 w-11 items-center justify-center rounded-full bg-black/65"
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color="#FFFFFF"
          />
        </Pressable>
      </View>

      {exercise.can_edit ? (
        <View className="absolute right-5 top-14 z-20">
          <Pressable
            onPress={() => {
              router.push({
                pathname: "/exercises/edit/[exerciseId]",
                params: { exerciseId: exercise.id },
              });
            }}
            className="h-11 w-11 items-center justify-center rounded-full bg-black/65"
          >
            <Ionicons
              name="create-outline"
              size={20}
              color="#FFFFFF"
            />
          </Pressable>
        </View>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
      >
        <ExerciseMediaGallery
          media={
            exercise.media
          }
        />

        <View className="px-6 pb-16 pt-7">
          <View className="flex-row items-center">
            <Text className="flex-1 text-[32px] font-extrabold leading-[37px] tracking-[-1.4px] text-white">
              {exercise.name}
            </Text>

            {exercise.is_custom ? (
              <View className="rounded-full bg-brand-muted px-3 py-2">
                <Text className="text-[10px] font-bold uppercase tracking-[1px] text-brand-bright">
                  Custom
                </Text>
              </View>
            ) : null}
          </View>

          <Text className="mt-3 text-[14px] text-white/45">
            {[
              exercise.mechanic,
              ...exercise.equipment,
            ]
              .map(
                prettifyEnum,
              )
              .join(" · ")}
          </Text>

          {exercise.description ? (
            <Text className="mt-6 text-[15px] leading-6 text-white/62">
              {exercise.description}
            </Text>
          ) : null}

          <View className="mt-8 h-px bg-white/[0.07]" />

          <Text className="mt-8 text-[12px] font-bold uppercase tracking-[1.8px] text-white/30">
            Primary muscles
          </Text>

          <View className="mt-3 flex-row flex-wrap gap-2">
            {exercise
              .primary_muscles
              .map(
                (
                  muscle,
                ) => (
                  <View
                    key={
                      muscle
                    }
                    className="rounded-xl bg-brand-muted px-3 py-2"
                  >
                    <Text className="text-[12px] font-semibold text-brand-bright">
                      {prettifyEnum(
                        muscle
                      )}
                    </Text>
                  </View>
                ),
              )}
          </View>

          {exercise
            .secondary_muscles
            .length >
          0 ? (
            <>
              <Text className="mt-7 text-[12px] font-bold uppercase tracking-[1.8px] text-white/30">
                Also works
              </Text>

              <Text className="mt-3 text-[14px] leading-6 text-white/50">
                {exercise
                  .secondary_muscles
                  .map(
                    prettifyEnum,
                  )
                  .join(" · ")}
              </Text>
            </>
          ) : null}

          {exercise.instructions
            .length >
          0 ? (
            <>
              <View className="mt-8 h-px bg-white/[0.07]" />

              <Text className="mt-8 text-[20px] font-extrabold text-white">
                How to perform
              </Text>

              <View className="mt-5 gap-5">
                {exercise.instructions.map(
                  (
                    instruction,
                    index,
                  ) => (
                    <View
                      key={
                        `${instruction}-${index}`
                      }
                      className="flex-row"
                    >
                      <View className="h-8 w-8 items-center justify-center rounded-xl bg-brand-muted">
                        <Text className="text-[11px] font-extrabold text-brand-bright">
                          {String(
                            index +
                              1
                          ).padStart(
                            2,
                            "0",
                          )}
                        </Text>
                      </View>

                      <Text className="ml-4 flex-1 text-[14px] leading-6 text-white/58">
                        {instruction}
                      </Text>
                    </View>
                  ),
                )}
              </View>
            </>
          ) : null}

          {exercise.tips.length >
          0 ? (
            <>
              <Text className="mt-10 text-[20px] font-extrabold text-white">
                Tips
              </Text>

              <View className="mt-4 gap-3">
                {exercise.tips.map(
                  (
                    tip,
                    index,
                  ) => (
                    <View
                      key={
                        `${tip}-${index}`
                      }
                      className="flex-row rounded-2xl bg-white/[0.035] p-4"
                    >
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={18}
                        color="#60A5FA"
                      />

                      <Text className="ml-3 flex-1 text-[13px] leading-5 text-white/55">
                        {tip}
                      </Text>
                    </View>
                  ),
                )}
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}