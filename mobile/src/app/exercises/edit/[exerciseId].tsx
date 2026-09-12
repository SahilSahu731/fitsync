import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { updateExercise } from "@/features/exercises/api";
import { ExerciseForm } from "@/features/exercises/components/exercise-form";
import { exerciseKeys } from "@/features/exercises/keys";
import { useExercise } from "@/features/exercises/queries";
import type { ExerciseMutationInput } from "@/features/exercises/types";

export default function EditExerciseScreen() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const query = useExercise(exerciseId);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: ExerciseMutationInput) =>
      updateExercise(exerciseId, input),
    onSuccess: async (exercise) => {
      queryClient.setQueryData(exerciseKeys.detail(exerciseId), exercise);
      await queryClient.invalidateQueries({ queryKey: exerciseKeys.all });
      router.back();
    },
  });

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center gap-4 px-6 py-4">
        <Pressable
          accessibilityRole="button"
          onPress={router.back}
          hitSlop={12}
        >
          <Text className="text-[16px] font-semibold text-sky-400">Back</Text>
        </Pressable>
        <Text className="text-[22px] font-bold text-white">Edit exercise</Text>
      </View>
      {query.isLoading ? (
        <ActivityIndicator color="#38BDF8" />
      ) : query.isError ? (
        <View className="px-6 py-8">
          <Text className="text-white">Could not load this exercise.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void query.refetch();
            }}
          >
            <Text className="py-4 text-sky-400">Try again</Text>
          </Pressable>
        </View>
      ) : !query.data?.can_edit ? (
        <Text className="px-6 py-8 text-white">
          This exercise is unavailable for editing.
        </Text>
      ) : (
        <ExerciseForm
          key={query.data.id}
          initial={query.data}
          submitLabel="Save changes"
          loading={mutation.isPending}
          onSubmit={async (input) => {
            await mutation.mutateAsync(input);
          }}
        />
      )}
    </SafeAreaView>
  );
}
