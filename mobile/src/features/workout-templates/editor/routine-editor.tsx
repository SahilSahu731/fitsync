import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { ExercisePickerModal } from "@/features/workout-session/components/exercise-picker-modal";
import type {
  WorkoutTemplate,
  WorkoutTemplateInput,
} from "@/features/workouts/types";
import { FolderPicker } from "../components/folder-picker";
import type { LocalFolderRecord } from "../types";
import { RoutineExerciseCard } from "./routine-exercise-card";
import { useRoutineEditor } from "./use-routine-editor";

export function RoutineEditor({
  initial = null,
  folders,
  saving,
  onCreateFolder,
  onCancel,
  onSave,
}: {
  initial?: WorkoutTemplate | null;
  folders: LocalFolderRecord[];
  saving: boolean;
  onCreateFolder: () => void;
  onCancel: () => void;
  onSave: (
    input: WorkoutTemplateInput,
    metadata: { folderId: string | null; favorite: boolean },
  ) => Promise<void>;
}) {
  const editor = useRoutineEditor({ initial });
  const [folderOpen, setFolderOpen] = React.useState(false);
  const save = async () => {
    const result = editor.validate();
    if (!result.valid) {
      Alert.alert(
        "Can't save routine",
        result.message ?? "Check your routine.",
      );
      return;
    }
    await onSave(editor.buildInput(), {
      folderId: editor.folderId,
      favorite: editor.favorite,
    });
  };
  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center border-b border-white/[0.06] px-4 py-3">
        <Pressable
          onPress={onCancel}
          className="h-10 w-10 items-center justify-center"
        >
          <Ionicons name="close" size={21} color="#fff" />
        </Pressable>
        <Text className="ml-2 flex-1 text-[18px] font-extrabold text-white">
          {initial ? "Edit Routine" : "New Routine"}
        </Text>
        <Pressable
          disabled={saving}
          onPress={() => void save()}
          className="rounded-xl bg-brand px-4 py-3"
        >
          <Text className="font-extrabold text-white">
            {saving ? "Saving…" : "Save"}
          </Text>
        </Pressable>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        <View className="px-5 py-6">
          <TextInput
            value={editor.name}
            onChangeText={editor.setName}
            placeholder="Push Day"
            placeholderTextColor="rgba(255,255,255,.18)"
            className="min-h-[50px] rounded-2xl bg-white/[0.04] px-4 text-[17px] font-bold text-white"
          />
          <TextInput
            value={editor.description}
            onChangeText={editor.setDescription}
            multiline
            placeholder="Optional description"
            placeholderTextColor="rgba(255,255,255,.18)"
            className="mt-3 min-h-[75px] rounded-2xl bg-white/[0.04] px-4 py-3 text-white/65"
          />
          <Pressable
            onPress={() => setFolderOpen(true)}
            className="mt-4 flex-row items-center rounded-2xl bg-white/[0.035] p-4"
          >
            <Ionicons name="folder-outline" size={19} color="#60A5FA" />
            <Text className="ml-3 flex-1 font-semibold text-white/65">
              {folders.find(
                (folder) => folder.clientFolderId === editor.folderId,
              )?.name ?? "No folder"}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={17}
              color="rgba(255,255,255,.22)"
            />
          </Pressable>
          <View className="mt-3 flex-row items-center rounded-2xl bg-white/[0.035] p-4">
            <Ionicons
              name={editor.favorite ? "star" : "star-outline"}
              size={19}
              color={editor.favorite ? "#FACC15" : "#60A5FA"}
            />
            <Text className="ml-3 flex-1 font-semibold text-white/70">
              Favorite routine
            </Text>
            <Switch
              value={editor.favorite}
              onValueChange={editor.setFavorite}
            />
          </View>
        </View>
        <View className="border-t border-white/[0.06]">
          <View className="flex-row items-center justify-between px-5 py-4">
            <Text className="text-[18px] font-extrabold text-white">
              Exercises
            </Text>
            <Pressable
              onPress={() => editor.setPickerOpen(true)}
              className="rounded-xl bg-brand-muted px-3 py-2.5"
            >
              <Text className="font-bold text-brand-bright">+ Add</Text>
            </Pressable>
          </View>
          {editor.exercises.map((exercise, index) => (
            <RoutineExerciseCard
              key={exercise.localId}
              exercise={exercise}
              expanded={editor.expandedId === exercise.localId}
              index={index}
              totalExercises={editor.exercises.length}
              onToggle={() =>
                editor.setExpandedId(
                  editor.expandedId === exercise.localId
                    ? null
                    : exercise.localId,
                )
              }
              onChange={(next) => editor.updateExercise(exercise.localId, next)}
              onMoveUp={() => editor.moveExercise(index, -1)}
              onMoveDown={() => editor.moveExercise(index, 1)}
              onReplace={() => editor.setReplacementIndex(index)}
              onSupersetNext={() => editor.createSuperset(index)}
              onRemoveSuperset={() =>
                exercise.supersetGroupId &&
                editor.removeSuperset(exercise.supersetGroupId)
              }
              onRemove={() => editor.removeExercise(exercise.localId)}
            />
          ))}
        </View>
      </ScrollView>
      <FolderPicker
        visible={folderOpen}
        folders={folders}
        selectedId={editor.folderId}
        onSelect={editor.setFolderId}
        onCreate={onCreateFolder}
        onClose={() => setFolderOpen(false)}
      />
      <ExercisePickerModal
        visible={editor.pickerOpen}
        title="Add exercises"
        selectionMode="multiple"
        excludeExerciseIds={editor.exercises.map((item) => item.exerciseId)}
        onClose={() => editor.setPickerOpen(false)}
        onAdd={editor.addExercises}
      />
      <ExercisePickerModal
        visible={editor.replacementIndex !== null}
        title="Replace exercise"
        selectionMode="single"
        excludeExerciseIds={editor.exercises.map((item) => item.exerciseId)}
        onClose={() => editor.setReplacementIndex(null)}
        onAdd={(items) => {
          if (items[0] && editor.replacementIndex !== null)
            editor.replaceExercise(editor.replacementIndex, items[0]);
        }}
      />
    </View>
  );
}
