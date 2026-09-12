import { Ionicons } from "@expo/vector-icons";

import { Image, Pressable, Text, View } from "react-native";

import type { LocalMediaAsset } from "@/features/media/types";

import type { ExerciseMedia } from "../../types";

interface Props {
  existingMedia: ExerciseMedia[];

  selectedMedia: LocalMediaAsset[];

  uploadProgress: number | null;

  onPickMedia: () => void;

  onRemoveSelectedMedia: (index: number) => void;
}

export function MediaSection({
  existingMedia,
  selectedMedia,
  uploadProgress,
  onPickMedia,
  onRemoveSelectedMedia,
}: Props) {
  return (
    <>
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
          onPress={onPickMedia}
          className="flex-row items-center gap-2 rounded-xl bg-brand px-4 py-3"
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />

          <Text className="text-[13px] font-bold text-white">Add media</Text>
        </Pressable>
      </View>

      {existingMedia.length > 0 ? (
        <View className="mt-4 flex-row flex-wrap gap-3">
          {existingMedia.map((media) => (
            <Image
              key={media.id}
              source={{
                uri: media.thumbnail_url,
              }}
              className="h-24 w-24 rounded-2xl bg-elevated"
            />
          ))}
        </View>
      ) : null}

      {selectedMedia.length > 0 ? (
        <View className="mt-4 gap-3">
          {selectedMedia.map((media, index) => (
            <View
              key={`${media.uri}-${index}`}
              className="flex-row items-center rounded-2xl border border-white/10 bg-white/[0.035] p-3"
            >
              {media.type === "image" ? (
                <Image
                  source={{
                    uri: media.uri,
                  }}
                  className="h-16 w-16 rounded-xl"
                />
              ) : (
                <View className="h-16 w-16 items-center justify-center rounded-xl bg-brand-muted">
                  <Ionicons name="videocam" size={24} color="#60A5FA" />
                </View>
              )}

              <View className="ml-3 flex-1">
                <Text className="text-[14px] font-semibold text-white">
                  {media.type === "video" ? "Exercise video" : "Exercise image"}
                </Text>

                <Text className="mt-1 text-[11px] text-white/30">
                  {media.width} × {media.height}
                </Text>
              </View>

              <Pressable
                onPress={() => {
                  onRemoveSelectedMedia(index);
                }}
                className="h-9 w-9 items-center justify-center rounded-full bg-white/[0.06]"
              >
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {uploadProgress !== null ? (
        <View className="mt-6">
          <View className="h-1 overflow-hidden rounded-full bg-white/10">
            <View
              className="h-full rounded-full bg-brand-bright"
              style={{
                width: `${Math.round(uploadProgress * 100)}%`,
              }}
            />
          </View>

          <Text className="mt-2 text-[11px] text-white/35">
            Uploading {Math.round(uploadProgress * 100)}%
          </Text>
        </View>
      ) : null}
    </>
  );
}
