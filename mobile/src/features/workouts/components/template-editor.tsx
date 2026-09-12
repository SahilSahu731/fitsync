import { Ionicons } from "@expo/vector-icons";

import { useState } from "react";

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import type { Exercise } from "@/features/exercises/types";

import { ExercisePickerModal } from "@/features/workout-session/components/exercise-picker-modal";

import {
  addSelectedExercises,
  buildTemplateInput,
  moveLocalExercise,
  templateToLocalExercises,
  type LocalTemplateExercise,
  type LocalTemplateSet,
} from "@/features/workout-templates/editor/model";

import { TemplateExerciseCard } from "@/features/workout-templates/editor/template-exercise-card";

import type { WorkoutTemplate, WorkoutTemplateInput } from "../types";

interface Props {
  initial?: WorkoutTemplate;

  saving: boolean;

  onSave: (input: WorkoutTemplateInput) => Promise<void>;
}

export function TemplateEditor({ initial, saving, onSave }: Props) {
  const [name, setName] = useState(initial?.name ?? "");

  const [description, setDescription] = useState(initial?.description ?? "");

  const [exercises, setExercises] = useState<LocalTemplateExercise[]>(
    initial ? templateToLocalExercises(initial) : [],
  );

  const [pickerOpen, setPickerOpen] = useState(false);

  const [error, setError] = useState<string | null>(null);

  function addExercises(selected: Exercise[]) {
    setExercises((current) => addSelectedExercises(current, selected));
  }

  function removeExercise(localId: string) {
    setExercises((current) =>
      current.filter((item) => item.localId !== localId),
    );
  }

  function moveExercise(
    index: number,

    direction: -1 | 1,
  ) {
    setExercises((current) => moveLocalExercise(current, index, direction));
  }

  function updateExercise(
    localId: string,

    patch: Partial<LocalTemplateExercise>,
  ) {
    setExercises((current) =>
      current.map((item) =>
        item.localId === localId
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    );
  }

  function updateSet(
    exerciseId: string,

    setId: string,

    patch: Partial<LocalTemplateSet>,
  ) {
    setExercises((current) =>
      current.map((exercise) =>
        exercise.localId === exerciseId
          ? {
              ...exercise,

              sets: exercise.sets.map((set) =>
                set.id === setId
                  ? {
                      ...set,
                      ...patch,
                    }
                  : set,
              ),
            }
          : exercise,
      ),
    );
  }

  async function save() {
    if (!name.trim()) {
      setError("Give your template a name.");

      return;
    }

    if (exercises.length === 0) {
      setError("Add at least one exercise.");

      return;
    }

    setError(null);

    await onSave(
      buildTemplateInput(
        name,

        description,

        exercises,
      ),
    );
  }

  return (
    <>
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 24,

          paddingBottom: 150,
        }}
      >
        <Text className="text-[12px] font-bold uppercase tracking-[1.8px] text-white/30">
          Template
        </Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Push Day"
          placeholderTextColor="rgba(255,255,255,.25)"
          selectionColor="#3B82F6"
          className="mt-3 min-h-[58px] rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-[17px] font-bold text-white"
        />

        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Description (optional)"
          placeholderTextColor="rgba(255,255,255,.25)"
          multiline
          selectionColor="#3B82F6"
          className="mt-3 min-h-[90px] rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-[14px] leading-5 text-white"
        />

        <View className="mt-9 flex-row items-center justify-between">
          <Text className="text-[20px] font-extrabold text-white">
            Exercises
          </Text>

          <Pressable
            onPress={() => {
              setPickerOpen(true);
            }}
            className="flex-row items-center gap-2 rounded-xl bg-brand px-4 py-3"
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />

            <Text className="text-[13px] font-bold text-white">Add</Text>
          </Pressable>
        </View>

        <View className="mt-5 gap-4">
          {exercises.map((exercise, exerciseIndex) => (
            <TemplateExerciseCard
              key={exercise.localId}
              exercise={exercise}
              index={exerciseIndex}
              onMove={moveExercise}
              onRemove={removeExercise}
              onChange={updateExercise}
              onSetChange={updateSet}
            />
          ))}
        </View>

        {error ? (
          <Text className="mt-6 text-[13px] text-red-300">{error}</Text>
        ) : null}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-white/[0.06] bg-background px-5 pb-5 pt-4">
        <Pressable
          disabled={saving}
          onPress={() => {
            void save();
          }}
          className="min-h-[58px] items-center justify-center rounded-2xl"
          style={({ pressed }) => ({
            backgroundColor: pressed ? "#1D4ED8" : "#2563EB",

            opacity: saving ? 0.6 : 1,

            transform: [
              {
                scale: pressed ? 0.985 : 1,
              },
            ],
          })}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-[16px] font-extrabold text-white">
              Save template
            </Text>
          )}
        </Pressable>
      </View>

      <ExercisePickerModal
        visible={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
        }}
        onAdd={addExercises}
      />
    </>
  );
}
