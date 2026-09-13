import * as Crypto from "expo-crypto";
import { useMemo, useState } from "react";

import type { Exercise } from "@/features/exercises/types";
import type { WorkoutTemplate } from "@/features/workouts/types";

import {
  addSelectedExercises,
  buildTemplateInput,
  moveLocalExercise,
  normalizeSupersetGroups,
  templateToLocalExercises,
  type LocalTemplateExercise,
} from "./model";
import { validateRoutineEditor } from "./validation";

export function useRoutineEditor({
  initial = null,
}: { initial?: WorkoutTemplate | null } = {}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [folderId, setFolderId] = useState(initial?.folder_client_id ?? null);
  const [favorite, setFavorite] = useState(initial?.is_favorite ?? false);
  const [exercises, setExercises] = useState<LocalTemplateExercise[]>(
    initial ? templateToLocalExercises(initial) : [],
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [replacementIndex, setReplacementIndex] = useState<number | null>(null);
  const initialSignature = useMemo(
    () => JSON.stringify({ name, description, folderId, favorite, exercises }),
    // Capture the initial draft exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const dirty =
    initialSignature !==
    JSON.stringify({ name, description, folderId, favorite, exercises });

  const addExercises = (selected: Exercise[]) =>
    setExercises((current) => {
      const next = addSelectedExercises(current, selected);
      const added = next.find(
        (item) => !current.some((old) => old.exerciseId === item.exerciseId),
      );
      if (added) setExpandedId(added.localId);
      return next;
    });
  const updateExercise = (localId: string, exercise: LocalTemplateExercise) =>
    setExercises((current) =>
      current.map((item) => (item.localId === localId ? exercise : item)),
    );
  const removeExercise = (localId: string) =>
    setExercises((current) =>
      normalizeSupersetGroups(
        current.filter((item) => item.localId !== localId),
      ),
    );
  const moveExercise = (index: number, direction: -1 | 1) =>
    setExercises((current) => moveLocalExercise(current, index, direction));
  const createSuperset = (index: number) =>
    setExercises((current) => {
      if (!current[index] || !current[index + 1]) return current;
      const group = Crypto.randomUUID();
      return current.map((item, position) =>
        position === index || position === index + 1
          ? { ...item, supersetGroupId: group }
          : item,
      );
    });
  const removeSuperset = (group: string) =>
    setExercises((current) =>
      current.map((item) =>
        item.supersetGroupId === group
          ? { ...item, supersetGroupId: null }
          : item,
      ),
    );
  const replaceExercise = (index: number, replacement: Exercise) => {
    setExercises((current) =>
      current.map((item, position) => {
        if (position !== index) return item;
        const incompatible = item.trackingType !== replacement.tracking_type;
        return {
          ...item,
          exerciseId: replacement.id,
          exerciseName: replacement.name,
          trackingType: replacement.tracking_type,
          laterality: replacement.laterality,
          loadMode: replacement.load_mode,
          restSeconds: replacement.default_rest_seconds,
          sets: incompatible
            ? item.sets.map((set) => ({
                ...set,
                repsMin: "",
                repsMax: "",
                weight: "",
                duration: "",
                distance: "",
                rpe: "",
              }))
            : item.sets,
        };
      }),
    );
    setReplacementIndex(null);
  };

  return {
    name,
    setName,
    description,
    setDescription,
    folderId,
    setFolderId,
    favorite,
    setFavorite,
    exercises,
    expandedId,
    setExpandedId,
    pickerOpen,
    setPickerOpen,
    replacementIndex,
    setReplacementIndex,
    dirty,
    addExercises,
    updateExercise,
    removeExercise,
    moveExercise,
    createSuperset,
    removeSuperset,
    replaceExercise,
    validate: () =>
      validateRoutineEditor(name, normalizeSupersetGroups(exercises)),
    buildInput: () =>
      buildTemplateInput(name, description, normalizeSupersetGroups(exercises)),
  };
}
