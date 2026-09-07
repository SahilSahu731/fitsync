import {
  Ionicons,
} from "@expo/vector-icons";

import * as ImagePicker
  from "expo-image-picker";

import * as Haptics
  from "expo-haptics";

import {
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  EQUIPMENT_OPTIONS,
  MUSCLE_OPTIONS,
  prettifyEnum,
} from "../constants";

import type {
  Equipment,
  Exercise,
  ExerciseMechanic,
  ExerciseMutationInput,
  MovementPattern,
  MuscleGroup,
} from "../types";

import {
  uploadMediaAsset,
} from "@/features/media/upload";

import type {
  LocalMediaAsset,
} from "@/features/media/types";


interface Props {
  initial?: Exercise;

  submitLabel:
    string;

  loading:
    boolean;

  onSubmit: (
    input:
      ExerciseMutationInput,
  ) => Promise<void>;
}


function ToggleChip({
  label,
  selected,
  onPress,
}: {
  label: string;

  selected: boolean;

  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={
        onPress
      }
      className="rounded-xl border px-3 py-2"
      style={{
        borderColor:
          selected
            ? "rgba(59,130,246,.65)"
            : "rgba(255,255,255,.10)",

        backgroundColor:
          selected
            ? "rgba(37,99,235,.14)"
            : "rgba(255,255,255,.035)",
      }}
    >
      <Text
        className="text-[12px] font-semibold"
        style={{
          color:
            selected
              ? "#60A5FA"
              : "rgba(255,255,255,.6)",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}


export function ExerciseForm({
  initial,
  submitLabel,
  loading,
  onSubmit,
}: Props) {
  const [
    name,
    setName,
  ] = useState(
    initial?.name ??
      "",
  );

  const [
    description,
    setDescription,
  ] = useState(
    initial
      ?.description ??
      "",
  );

  const [
    primaryMuscles,
    setPrimaryMuscles,
  ] = useState<
    MuscleGroup[]
  >(
    initial
      ?.primary_muscles ??
      [],
  );

  const [
    secondaryMuscles,
    setSecondaryMuscles,
  ] = useState<
    MuscleGroup[]
  >(
    initial
      ?.secondary_muscles ??
      [],
  );

  const [
    equipment,
    setEquipment,
  ] = useState<
    Equipment[]
  >(
    initial
      ?.equipment ??
      [],
  );

  const [
    mechanic,
    setMechanic,
  ] = useState<
    ExerciseMechanic
  >(
    initial?.mechanic ??
      "COMPOUND",
  );

  const [
    movementPattern,
    setMovementPattern,
  ] = useState<
    MovementPattern
  >(
    initial
      ?.movement_pattern ??
      "OTHER",
  );

  const [
    instructionsText,
    setInstructionsText,
  ] = useState(
    initial
      ?.instructions
      .join("\n") ??
      "",
  );

  const [
    tipsText,
    setTipsText,
  ] = useState(
    initial
      ?.tips
      .join("\n") ??
      "",
  );

  const [
    selectedMedia,
    setSelectedMedia,
  ] = useState<
    LocalMediaAsset[]
  >([]);

  const [
    uploadProgress,
    setUploadProgress,
  ] = useState<
    number | null
  >(null);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const existingMedia =
    initial?.media ??
    [];

  const videoCount =
    useMemo(
      () =>
        selectedMedia
          .filter(
            (
              item,
            ) =>
              item.type ===
              "video",
          )
          .length +
        existingMedia
          .filter(
            (
              item,
            ) =>
              item.type ===
              "VIDEO",
          )
          .length,
      [
        selectedMedia,
        existingMedia,
      ],
    );

  const imageCount =
    selectedMedia
      .filter(
        (
          item,
        ) =>
          item.type ===
          "image",
      )
      .length +
    existingMedia
      .filter(
        (
          item,
        ) =>
          item.type ===
          "IMAGE",
      )
      .length;

  async function pickMedia() {
    setError(
      null
    );

    const permission =
      await ImagePicker
        .requestMediaLibraryPermissionsAsync();

    if (
      !permission.granted
    ) {
      setError(
        "Photo library permission is required."
      );

      return;
    }

    const result =
      await ImagePicker
        .launchImageLibraryAsync({
          mediaTypes: [
            "images",
            "videos",
          ],

          allowsMultipleSelection:
            false,

          quality:
            0.9,

          videoMaxDuration:
            60,
        });

    if (
      result.canceled ||
      !result.assets[0]
    ) {
      return;
    }

    const asset =
      result.assets[0];

    const type =
      asset.type ===
      "video"
        ? "video"
        : "image";

    if (
      type ===
        "video" &&
      videoCount >=
        1
    ) {
      setError(
        "Only one video can be added."
      );

      return;
    }

    if (
      type ===
        "image" &&
      imageCount >=
        2
    ) {
      setError(
        "Only two images can be added."
      );

      return;
    }

    if (
      selectedMedia.length +
        existingMedia.length >=
      3
    ) {
      setError(
        "Maximum 3 media files."
      );

      return;
    }

    setSelectedMedia(
      (
        current,
      ) => [
        ...current,
        {
          uri:
            asset.uri,

          type,

          fileName:
            asset.fileName ??
            null,

          mimeType:
            asset.mimeType ??
            null,

          width:
            asset.width,

          height:
            asset.height,

          duration:
            asset.duration ??
            null,

          fileSize:
            asset.fileSize ??
            null,
        },
      ],
    );

    await Haptics
      .selectionAsync();
  }

  async function submit() {
    if (
      name
        .trim()
        .length < 2
    ) {
      setError(
        "Enter an exercise name."
      );

      return;
    }

    if (
      primaryMuscles
        .length === 0
    ) {
      setError(
        "Choose at least one primary muscle."
      );

      return;
    }

    setError(
      null
    );

    try {
      const uploaded = [];

      for (
        let index = 0;
        index <
        selectedMedia.length;
        index += 1
      ) {
        const asset =
          selectedMedia[
            index
          ];

        const result =
          await uploadMediaAsset(
            asset,
            {
              onProgress:
                (
                  value,
                ) => {
                  const total =
                    selectedMedia.length;

                  setUploadProgress(
                    (
                      index +
                      value
                    ) /
                      total,
                  );
                },
            },
          );

        uploaded.push({
          type:
            result
              .resourceType ===
            "video"
              ? "VIDEO" as const
              : "IMAGE" as const,

          public_id:
            result.publicId,

          width:
            result.width,

          height:
            result.height,

          duration_seconds:
            result.durationSeconds,

          format:
            result.format,

          sort_order:
            existingMedia
              .length +
            index,
        });
      }

      const retainedExisting =
        existingMedia.map(
          (
            item,
            index,
          ) => ({
            type:
              item.type,

            public_id:
              item.public_id,

            width:
              item.width,

            height:
              item.height,

            duration_seconds:
              item
                .duration_seconds,

            format:
              item.format,

            sort_order:
              index,
          }),
        );

      await onSubmit({
        name:
          name.trim(),

        description:
          description.trim() ||
          null,

        primary_muscles:
          primaryMuscles,

        secondary_muscles:
          secondaryMuscles,

        equipment,

        mechanic,

        movement_pattern:
          movementPattern,

        instructions:
          instructionsText
            .split("\n")
            .map(
              (
                value,
              ) =>
                value.trim(),
            )
            .filter(
              Boolean,
            ),

        tips:
          tipsText
            .split("\n")
            .map(
              (
                value,
              ) =>
                value.trim(),
            )
            .filter(
              Boolean,
            ),

        media: [
          ...retainedExisting,
          ...uploaded,
        ],
      });

    } catch (
      submitError
    ) {
      setError(
        submitError instanceof
          Error
          ? submitError.message
          : "Unable to save exercise.",
      );

    } finally {
      setUploadProgress(
        null
      );
    }
  }

  return (
    <ScrollView
      className="flex-1"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={
        false
      }
      contentContainerStyle={{
        padding:
          24,

        paddingBottom:
          60,
      }}
    >
      <Text className="text-[12px] font-bold uppercase tracking-[1.8px] text-white/35">
        Exercise
      </Text>

      <TextInput
        value={
          name
        }
        onChangeText={
          setName
        }
        placeholder="Exercise name"
        placeholderTextColor="rgba(255,255,255,.25)"
        selectionColor="#3B82F6"
        className="mt-3 min-h-[58px] rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-[16px] font-semibold text-white"
      />

      <TextInput
        value={
          description
        }
        onChangeText={
          setDescription
        }
        placeholder="Short description (optional)"
        placeholderTextColor="rgba(255,255,255,.25)"
        selectionColor="#3B82F6"
        multiline
        className="mt-3 min-h-[100px] rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-[15px] leading-6 text-white"
      />

      <Text className="mt-8 text-[12px] font-bold uppercase tracking-[1.8px] text-white/35">
        Primary muscles
      </Text>

      <View className="mt-3 flex-row flex-wrap gap-2">
        {MUSCLE_OPTIONS.map(
          (
            option,
          ) => {
            const selected =
              primaryMuscles.includes(
                option.value
              );

            return (
              <ToggleChip
                key={
                  option.value
                }
                label={
                  option.label
                }
                selected={
                  selected
                }
                onPress={() => {
                  setPrimaryMuscles(
                    (
                      current,
                    ) =>
                      selected
                        ? current.filter(
                            (
                              value,
                            ) =>
                              value !==
                              option.value,
                          )
                        : [
                            ...current,
                            option.value,
                          ],
                  );
                }}
              />
            );
          },
        )}
      </View>

      <Text className="mt-8 text-[12px] font-bold uppercase tracking-[1.8px] text-white/35">
        Secondary muscles
      </Text>

      <View className="mt-3 flex-row flex-wrap gap-2">
        {MUSCLE_OPTIONS.map(
          (
            option,
          ) => {
            const selected =
              secondaryMuscles.includes(
                option.value
              );

            return (
              <ToggleChip
                key={
                  option.value
                }
                label={
                  option.label
                }
                selected={
                  selected
                }
                onPress={() => {
                  setSecondaryMuscles(
                    (
                      current,
                    ) =>
                      selected
                        ? current.filter(
                            (
                              value,
                            ) =>
                              value !==
                              option.value,
                          )
                        : [
                            ...current,
                            option.value,
                          ],
                  );
                }}
              />
            );
          },
        )}
      </View>

      <Text className="mt-8 text-[12px] font-bold uppercase tracking-[1.8px] text-white/35">
        Equipment
      </Text>

      <View className="mt-3 flex-row flex-wrap gap-2">
        {EQUIPMENT_OPTIONS.map(
          (
            option,
          ) => {
            const selected =
              equipment.includes(
                option.value
              );

            return (
              <ToggleChip
                key={
                  option.value
                }
                label={
                  option.label
                }
                selected={
                  selected
                }
                onPress={() => {
                  setEquipment(
                    (
                      current,
                    ) =>
                      selected
                        ? current.filter(
                            (
                              value,
                            ) =>
                              value !==
                              option.value,
                          )
                        : [
                            ...current,
                            option.value,
                          ],
                  );
                }}
              />
            );
          },
        )}
      </View>

      <Text className="mt-8 text-[12px] font-bold uppercase tracking-[1.8px] text-white/35">
        Exercise type
      </Text>

      <View className="mt-3 flex-row gap-2">
        {(
          [
            "COMPOUND",
            "ISOLATION",
          ] as const
        ).map(
          (
            value,
          ) => (
            <ToggleChip
              key={
                value
              }
              label={
                prettifyEnum(
                  value
                )
              }
              selected={
                mechanic ===
                value
              }
              onPress={() => {
                setMechanic(
                  value
                );
              }}
            />
          ),
        )}
      </View>

      <Text className="mt-8 text-[12px] font-bold uppercase tracking-[1.8px] text-white/35">
        Movement
      </Text>

      <View className="mt-3 flex-row flex-wrap gap-2">
        {(
          [
            "HORIZONTAL_PUSH",
            "VERTICAL_PUSH",
            "HORIZONTAL_PULL",
            "VERTICAL_PULL",
            "SQUAT",
            "HINGE",
            "LUNGE",
            "CARRY",
            "ROTATION",
            "CORE",
            "OTHER",
          ] as const
        ).map(
          (
            value,
          ) => (
            <ToggleChip
              key={
                value
              }
              label={
                prettifyEnum(
                  value
                )
              }
              selected={
                movementPattern ===
                value
              }
              onPress={() => {
                setMovementPattern(
                  value
                );
              }}
            />
          ),
        )}
      </View>

      <Text className="mt-8 text-[12px] font-bold uppercase tracking-[1.8px] text-white/35">
        Instructions
      </Text>

      <TextInput
        value={
          instructionsText
        }
        onChangeText={
          setInstructionsText
        }
        placeholder={
          "One instruction per line"
        }
        placeholderTextColor="rgba(255,255,255,.25)"
        multiline
        selectionColor="#3B82F6"
        className="mt-3 min-h-[130px] rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-[14px] leading-6 text-white"
      />

      <Text className="mt-8 text-[12px] font-bold uppercase tracking-[1.8px] text-white/35">
        Tips
      </Text>

      <TextInput
        value={
          tipsText
        }
        onChangeText={
          setTipsText
        }
        placeholder={
          "One tip per line"
        }
        placeholderTextColor="rgba(255,255,255,.25)"
        multiline
        selectionColor="#3B82F6"
        className="mt-3 min-h-[100px] rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-[14px] leading-6 text-white"
      />

      <View className="mt-8 flex-row items-center justify-between">
        <View>
          <Text className="text-[12px] font-bold uppercase tracking-[1.8px] text-white/35">
            Media
          </Text>

          <Text className="mt-1 text-[11px] text-white/25">
            Up to 2 images + 1 video
          </Text>
        </View>

        <Pressable
          onPress={() => {
            void pickMedia();
          }}
          className="flex-row items-center gap-2 rounded-xl bg-brand px-4 py-3"
        >
          <Ionicons
            name="add"
            size={18}
            color="#FFFFFF"
          />

          <Text className="text-[13px] font-bold text-white">
            Add media
          </Text>
        </Pressable>
      </View>

      {existingMedia.length >
      0 ? (
        <View className="mt-4 flex-row flex-wrap gap-3">
          {existingMedia.map(
            (
              media,
            ) => (
              <Image
                key={
                  media.id
                }
                source={{
                  uri:
                    media
                      .thumbnail_url,
                }}
                className="h-24 w-24 rounded-2xl bg-elevated"
              />
            ),
          )}
        </View>
      ) : null}

      {selectedMedia.length >
      0 ? (
        <View className="mt-4 gap-3">
          {selectedMedia.map(
            (
              media,
              index,
            ) => (
              <View
                key={
                  `${media.uri}-${index}`
                }
                className="flex-row items-center rounded-2xl border border-white/10 bg-white/[0.035] p-3"
              >
                {media.type ===
                "image" ? (
                  <Image
                    source={{
                      uri:
                        media.uri,
                    }}
                    className="h-16 w-16 rounded-xl"
                  />
                ) : (
                  <View className="h-16 w-16 items-center justify-center rounded-xl bg-brand-muted">
                    <Ionicons
                      name="videocam"
                      size={24}
                      color="#60A5FA"
                    />
                  </View>
                )}

                <View className="ml-3 flex-1">
                  <Text className="text-[14px] font-semibold text-white">
                    {media.type ===
                    "video"
                      ? "Exercise video"
                      : "Exercise image"}
                  </Text>

                  <Text className="mt-1 text-[11px] text-white/30">
                    {media.width} ×{" "}
                    {media.height}
                  </Text>
                </View>

                <Pressable
                  onPress={() => {
                    setSelectedMedia(
                      (
                        current,
                      ) =>
                        current.filter(
                          (
                            _,
                            itemIndex,
                          ) =>
                            itemIndex !==
                            index,
                        ),
                    );
                  }}
                  className="h-9 w-9 items-center justify-center rounded-full bg-white/[0.06]"
                >
                  <Ionicons
                    name="close"
                    size={18}
                    color="#FFFFFF"
                  />
                </Pressable>
              </View>
            ),
          )}
        </View>
      ) : null}

      {uploadProgress !==
      null ? (
        <View className="mt-6">
          <View className="h-1 overflow-hidden rounded-full bg-white/10">
            <View
              className="h-full rounded-full bg-brand-bright"
              style={{
                width:
                  `${Math.round(
                    uploadProgress *
                      100,
                  )}%`,
              }}
            />
          </View>

          <Text className="mt-2 text-[11px] text-white/35">
            Uploading{" "}
            {Math.round(
              uploadProgress *
                100,
            )}
            %
          </Text>
        </View>
      ) : null}

      {error ? (
        <View className="mt-6 rounded-2xl border border-red-400/15 bg-red-400/[0.05] p-4">
          <Text className="text-[13px] leading-5 text-red-300">
            {error}
          </Text>
        </View>
      ) : null}

      <Pressable
        disabled={
          loading ||
          uploadProgress !==
            null
        }
        onPress={() => {
          void submit();
        }}
        className="mt-10 min-h-[58px] items-center justify-center rounded-2xl"
        style={({
          pressed,
        }) => ({
          backgroundColor:
            pressed
              ? "#1D4ED8"
              : "#2563EB",

          opacity:
            loading
              ? 0.65
              : 1,

          transform: [
            {
              scale:
                pressed
                  ? 0.985
                  : 1,
            },
          ],
        })}
      >
        {loading ? (
          <ActivityIndicator
            color="#FFFFFF"
          />
        ) : (
          <Text className="text-[16px] font-extrabold text-white">
            {submitLabel}
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}