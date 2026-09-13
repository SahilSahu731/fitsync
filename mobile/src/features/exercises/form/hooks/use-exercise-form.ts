import * as Haptics from "expo-haptics";

import * as ImagePicker from "expo-image-picker";

import { useMemo, useState } from "react";

import { uploadMediaAsset } from "@/features/media/upload";

import type { LocalMediaAsset } from "@/features/media/types";

import type {
  Equipment,
  Exercise,
  ExerciseLaterality,
  ExerciseLoadMode,
  ExerciseMechanic,
  ExerciseMutationInput,
  ExerciseTrackingType,
  MovementPattern,
  MuscleGroup,
} from "../../types";

interface Props {
  initial?: Exercise;

  onSubmit: (input: ExerciseMutationInput) => Promise<void>;
}

function toggleValue<T>(
  current: T[],

  value: T,
): T[] {
  return current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
}

function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function useExerciseForm({ initial, onSubmit }: Props) {
  const [name, setName] = useState(initial?.name ?? "");

  const [description, setDescription] = useState(initial?.description ?? "");

  const [primaryMuscles, setPrimaryMuscles] = useState<MuscleGroup[]>(
    initial?.primary_muscles ?? [],
  );

  const [secondaryMuscles, setSecondaryMuscles] = useState<MuscleGroup[]>(
    initial?.secondary_muscles ?? [],
  );

  const [equipment, setEquipment] = useState<Equipment[]>(
    initial?.equipment ?? [],
  );

  const [mechanic, setMechanic] = useState<ExerciseMechanic>(
    initial?.mechanic ?? "COMPOUND",
  );

  const [movementPattern, setMovementPattern] = useState<MovementPattern>(
    initial?.movement_pattern ?? "OTHER",
  );

  const [trackingType, setTrackingType] = useState<ExerciseTrackingType>(
    initial?.tracking_type ?? "WEIGHT_REPS",
  );

  const [laterality, setLaterality] = useState<ExerciseLaterality>(
    initial?.laterality ?? "BILATERAL",
  );

  const [loadMode, setLoadMode] = useState<ExerciseLoadMode>(
    initial?.load_mode ?? "TOTAL",
  );

  const [defaultRestSeconds, setDefaultRestSeconds] = useState(
    initial?.default_rest_seconds ??
      (initial?.mechanic === "ISOLATION" ? 90 : 180),
  );

  const [instructionsText, setInstructionsText] = useState(
    initial?.instructions.join("\n") ?? "",
  );

  const [tipsText, setTipsText] = useState(initial?.tips.join("\n") ?? "");

  const [selectedMedia, setSelectedMedia] = useState<LocalMediaAsset[]>([]);

  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);

  const existingMedia = useMemo(() => initial?.media ?? [], [initial?.media]);

  const videoCount = useMemo(
    () =>
      selectedMedia.filter((item) => item.type === "video").length +
      existingMedia.filter((item) => item.type === "VIDEO").length,
    [selectedMedia, existingMedia],
  );

  const imageCount = useMemo(
    () =>
      selectedMedia.filter((item) => item.type === "image").length +
      existingMedia.filter((item) => item.type === "IMAGE").length,
    [selectedMedia, existingMedia],
  );

  async function pickMedia() {
    setError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setError("Photo library permission is required.");

      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],

      allowsMultipleSelection: false,

      quality: 0.9,

      videoMaxDuration: 60,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];

    const type: LocalMediaAsset["type"] =
      asset.type === "video" ? "video" : "image";

    if (type === "video" && videoCount >= 1) {
      setError("Only one video can be added.");

      return;
    }

    if (type === "image" && imageCount >= 2) {
      setError("Only two images can be added.");

      return;
    }

    if (selectedMedia.length + existingMedia.length >= 3) {
      setError("Maximum 3 media files.");

      return;
    }

    setSelectedMedia((current) => [
      ...current,

      {
        uri: asset.uri,

        type,

        fileName: asset.fileName ?? null,

        mimeType: asset.mimeType ?? null,

        width: asset.width,

        height: asset.height,

        duration: asset.duration ?? null,

        fileSize: asset.fileSize ?? null,
      },
    ]);

    await Haptics.selectionAsync();
  }

  function removeSelectedMedia(index: number) {
    setSelectedMedia((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  async function submit() {
    if (name.trim().length < 2) {
      setError("Enter an exercise name.");

      return;
    }

    if (primaryMuscles.length === 0) {
      setError("Choose at least one primary muscle.");

      return;
    }

    setError(null);

    try {
      const uploaded: ExerciseMutationInput["media"] = [];

      for (let index = 0; index < selectedMedia.length; index += 1) {
        const asset = selectedMedia[index];

        const result = await uploadMediaAsset(
          asset,

          {
            onProgress: (value) => {
              setUploadProgress((index + value) / selectedMedia.length);
            },
          },
        );

        uploaded.push({
          type: result.resourceType === "video" ? "VIDEO" : "IMAGE",

          public_id: result.publicId,

          width: result.width,

          height: result.height,

          duration_seconds: result.durationSeconds,

          format: result.format,

          sort_order: existingMedia.length + index,
        });
      }

      const retainedExisting: ExerciseMutationInput["media"] =
        existingMedia.map((item, index) => ({
          type: item.type,

          public_id: item.public_id,

          width: item.width,

          height: item.height,

          duration_seconds: item.duration_seconds,

          format: item.format,

          sort_order: index,
        }));

      await onSubmit({
        name: name.trim(),

        description: description.trim() || null,

        primary_muscles: primaryMuscles,

        secondary_muscles: secondaryMuscles,

        equipment,

        mechanic,

        movement_pattern: movementPattern,

        tracking_type: trackingType,

        laterality,

        load_mode: loadMode,

        default_rest_seconds: defaultRestSeconds,

        instructions: splitLines(instructionsText),

        tips: splitLines(tipsText),

        media: [...retainedExisting, ...uploaded],
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to save exercise.",
      );
    } finally {
      setUploadProgress(null);
    }
  }

  return {
    name,

    description,

    primaryMuscles,

    secondaryMuscles,

    equipment,

    mechanic,

    movementPattern,

    trackingType,

    laterality,

    loadMode,

    defaultRestSeconds,

    instructionsText,

    tipsText,

    selectedMedia,

    existingMedia,

    uploadProgress,

    error,

    setName,

    setDescription,

    setMechanic,

    setMovementPattern,

    setTrackingType,

    setLaterality,

    setLoadMode,

    setDefaultRestSeconds,

    setInstructionsText,

    setTipsText,

    togglePrimaryMuscle: (value: MuscleGroup) => {
      setPrimaryMuscles((current) => toggleValue(current, value));
    },

    toggleSecondaryMuscle: (value: MuscleGroup) => {
      setSecondaryMuscles((current) => toggleValue(current, value));
    },

    toggleEquipment: (value: Equipment) => {
      setEquipment((current) => toggleValue(current, value));
    },

    pickMedia,

    removeSelectedMedia,

    submit,
  };
}
