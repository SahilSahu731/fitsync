import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { BasicFieldsSection } from "../form/components/basic-fields-section";

import { ClassificationSection } from "../form/components/classification-section";

import { GuidanceSection } from "../form/components/guidance-section";

import { MediaSection } from "../form/components/media-section";

import { TrackingSection } from "../form/components/tracking-section";

import { useExerciseForm } from "../form/hooks/use-exercise-form";

import type { Exercise, ExerciseMutationInput } from "../types";

interface Props {
  initial?: Exercise;

  submitLabel: string;

  loading: boolean;

  onSubmit: (input: ExerciseMutationInput) => Promise<void>;
}

export function ExerciseForm({
  initial,
  submitLabel,
  loading,
  onSubmit,
}: Props) {
  const form = useExerciseForm({
    initial,
    onSubmit,
  });

  const disabled = loading || form.uploadProgress !== null;

  return (
    <ScrollView
      className="flex-1"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        padding: 24,

        paddingBottom: 60,
      }}
    >
      <BasicFieldsSection
        name={form.name}
        description={form.description}
        onNameChange={form.setName}
        onDescriptionChange={form.setDescription}
      />

      <TrackingSection
        trackingType={form.trackingType}
        laterality={form.laterality}
        loadMode={form.loadMode}
        defaultRestSeconds={form.defaultRestSeconds}
        onTrackingTypeChange={form.setTrackingType}
        onLateralityChange={form.setLaterality}
        onLoadModeChange={form.setLoadMode}
        onDefaultRestChange={form.setDefaultRestSeconds}
      />

      <ClassificationSection
        primaryMuscles={form.primaryMuscles}
        secondaryMuscles={form.secondaryMuscles}
        equipment={form.equipment}
        mechanic={form.mechanic}
        movementPattern={form.movementPattern}
        onTogglePrimaryMuscle={form.togglePrimaryMuscle}
        onToggleSecondaryMuscle={form.toggleSecondaryMuscle}
        onToggleEquipment={form.toggleEquipment}
        onMechanicChange={form.setMechanic}
        onMovementPatternChange={form.setMovementPattern}
      />

      <GuidanceSection
        instructionsText={form.instructionsText}
        tipsText={form.tipsText}
        onInstructionsChange={form.setInstructionsText}
        onTipsChange={form.setTipsText}
      />

      <MediaSection
        existingMedia={form.existingMedia}
        selectedMedia={form.selectedMedia}
        uploadProgress={form.uploadProgress}
        onPickMedia={() => {
          void form.pickMedia();
        }}
        onRemoveSelectedMedia={form.removeSelectedMedia}
      />

      {form.error ? (
        <View className="mt-6 rounded-2xl border border-red-400/15 bg-red-400/[0.05] p-4">
          <Text className="text-[13px] leading-5 text-red-300">
            {form.error}
          </Text>
        </View>
      ) : null}

      <Pressable
        disabled={disabled}
        onPress={() => {
          void form.submit();
        }}
        className="mt-10 min-h-[58px] items-center justify-center rounded-2xl"
        style={({ pressed }) => ({
          backgroundColor: pressed ? "#1D4ED8" : "#2563EB",

          opacity: disabled ? 0.65 : 1,

          transform: [
            {
              scale: pressed ? 0.985 : 1,
            },
          ],
        })}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-[16px] font-extrabold text-white">
            {submitLabel}
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
