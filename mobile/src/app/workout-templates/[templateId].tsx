import { Ionicons } from "@expo/vector-icons";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { router, useLocalSearchParams } from "expo-router";

import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import {
  archiveWorkoutTemplate,
  duplicateWorkoutTemplate,
  updateWorkoutTemplate,
} from "@/features/workouts/api";

import { TemplateEditor } from "@/features/workouts/components/template-editor";

import { workoutTemplateKeys } from "@/features/workouts/keys";

import { useWorkoutTemplate } from "@/features/workouts/queries";

import type { WorkoutTemplateInput } from "@/features/workouts/types";

export default function EditTemplateScreen() {
  const params = useLocalSearchParams<{
    templateId?: string;
  }>();

  const templateId =
    typeof params.templateId === "string" ? params.templateId : "";

  const queryClient = useQueryClient();

  const query = useWorkoutTemplate(templateId);

  const updateMutation = useMutation({
    mutationFn: (input: WorkoutTemplateInput) =>
      updateWorkoutTemplate(templateId, input),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: workoutTemplateKeys.all,
      });

      router.back();
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: () => duplicateWorkoutTemplate(templateId),

    onSuccess: async (template) => {
      await queryClient.invalidateQueries({
        queryKey: workoutTemplateKeys.all,
      });

      router.replace(`/workout-templates/${template.id}`);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => archiveWorkoutTemplate(templateId),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: workoutTemplateKeys.all,
      });

      router.dismissAll();

      router.replace("/workout-templates");
    },
  });

  function showActions() {
    Alert.alert("Template", undefined, [
      {
        text: "Duplicate",

        onPress: () => {
          void duplicateMutation.mutateAsync();
        },
      },

      {
        text: "Archive",

        style: "destructive",

        onPress: () => {
          void archiveMutation.mutateAsync();
        },
      },

      {
        text: "Cancel",

        style: "cancel",
      },
    ]);
  }

  if (query.isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#3B82F6" />
      </SafeAreaView>
    );
  }

  if (!query.data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <Text className="text-white/50">Template not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-5 pt-3">
        <Pressable
          onPress={router.back}
          className="h-11 w-11 items-center justify-center rounded-full bg-white/[0.05]"
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </Pressable>

        <Text className="ml-4 flex-1 text-[22px] font-extrabold text-white">
          Edit template
        </Text>

        <Pressable
          onPress={showActions}
          className="h-11 w-11 items-center justify-center rounded-full bg-white/[0.05]"
        >
          <Ionicons name="ellipsis-horizontal" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <TemplateEditor
        initial={query.data}
        saving={updateMutation.isPending}
        onSave={async (input) => {
          await updateMutation.mutateAsync(input);
        }}
      />
    </SafeAreaView>
  );
}
