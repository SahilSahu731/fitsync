import { Ionicons } from "@expo/vector-icons";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { router } from "expo-router";

import { Pressable, Text, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { createWorkoutTemplate } from "@/features/workouts/api";

import { TemplateEditor } from "@/features/workouts/components/template-editor";

import { workoutTemplateKeys } from "@/features/workouts/keys";

export default function CreateTemplateScreen() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createWorkoutTemplate,

    onSuccess: async (template) => {
      await queryClient.invalidateQueries({
        queryKey: workoutTemplateKeys.all,
      });

      router.replace(`/workout-templates/${template.id}`);
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
          New template
        </Text>
      </View>

      <TemplateEditor
        saving={mutation.isPending}
        onSave={async (input) => {
          await mutation.mutateAsync(input);
        }}
      />
    </SafeAreaView>
  );
}
