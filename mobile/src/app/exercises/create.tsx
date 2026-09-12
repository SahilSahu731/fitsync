import { Ionicons } from "@expo/vector-icons";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { router } from "expo-router";

import { Pressable, Text, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { createExercise } from "@/features/exercises/api";

import { ExerciseForm } from "@/features/exercises/components/exercise-form";

import { exerciseKeys } from "@/features/exercises/keys";

export default function CreateExerciseScreen() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createExercise,

    onSuccess: async (exercise) => {
      await queryClient.invalidateQueries({
        queryKey: exerciseKeys.all,
      });

      router.replace(`/exercises/${exercise.id}`);
    },
  });

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-5 pt-3">
        <Pressable
          onPress={router.back}
          className="h-11 w-11 items-center justify-center rounded-full bg-white/[0.05]"
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </Pressable>

        <Text className="ml-4 text-[22px] font-extrabold text-white">
          Custom exercise
        </Text>
      </View>

      <ExerciseForm
        loading={mutation.isPending}
        submitLabel="Create exercise"
        onSubmit={async (input) => {
          await mutation.mutateAsync(input);
        }}
      />
    </SafeAreaView>
  );
}
