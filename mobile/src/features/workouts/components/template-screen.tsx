import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { parseApiError } from "@/lib/api/errors";
import { createWorkoutTemplate, updateWorkoutTemplate } from "../api";
import { workoutTemplateKeys } from "../keys";
import { useWorkoutTemplate } from "../queries";
import type { WorkoutTemplateInput } from "../types";
import { TemplateEditor } from "./template-editor";

export function TemplateScreen({ templateId }: { templateId?: string }) {
  const query = useWorkoutTemplate(templateId ?? "");
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: WorkoutTemplateInput) =>
      templateId
        ? updateWorkoutTemplate(templateId, input)
        : createWorkoutTemplate(input),
    onSuccess: async (template) => {
      queryClient.setQueryData(
        workoutTemplateKeys.detail(template.id),
        template,
      );
      await queryClient.invalidateQueries({
        queryKey: workoutTemplateKeys.all,
      });
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
        <Text className="text-[22px] font-bold text-white">
          {templateId ? "Edit template" : "Create template"}
        </Text>
      </View>
      {mutation.isError ? (
        <Text accessibilityRole="alert" className="px-6 py-3 text-red-300">
          {
            parseApiError(mutation.error, "Could not save your template.")
              .message
          }
        </Text>
      ) : null}
      {templateId && query.isLoading ? (
        <ActivityIndicator color="#38BDF8" />
      ) : templateId && !query.data ? (
        <View className="px-6 py-8">
          <Text className="text-white">Could not load this template.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void query.refetch();
            }}
          >
            <Text className="py-4 text-sky-400">Try again</Text>
          </Pressable>
        </View>
      ) : (
        <TemplateEditor
          key={templateId ?? "create"}
          initial={templateId ? query.data : undefined}
          saving={mutation.isPending}
          onSave={async (input) => {
            try {
              await mutation.mutateAsync(input);
            } catch {
              // The mutation error is displayed above; retain the form for retry.
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}
