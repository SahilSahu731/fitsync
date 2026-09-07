import {
  Ionicons,
} from "@expo/vector-icons";

import {
  useVideoPlayer,
  VideoView,
} from "expo-video";

import {
  useState,
} from "react";

import {
  Image,
  Pressable,
  Text,
  View,
} from "react-native";

import type {
  ExerciseMedia,
} from "../types";


function VideoSlide({
  media,
}: {
  media: ExerciseMedia;
}) {
  const player =
    useVideoPlayer(
      media.secure_url,
      (
        instance,
      ) => {
        instance.loop =
          true;

        instance.muted =
          true;

        instance.play();
      },
    );

  return (
    <VideoView
      player={
        player
      }
      nativeControls={
        false
      }
      contentFit="cover"
      style={{
        width:
          "100%",

        height:
          330,
      }}
    />
  );
}


interface Props {
  media:
    ExerciseMedia[];
}


export function ExerciseMediaGallery({
  media,
}: Props) {
  const [
    index,
    setIndex,
  ] = useState(0);

  if (
    media.length ===
    0
  ) {
    return (
      <View className="h-[270px] items-center justify-center bg-elevated">
        <View className="h-16 w-16 items-center justify-center rounded-3xl bg-white/[0.05]">
          <Ionicons
            name="barbell-outline"
            size={28}
            color="#737373"
          />
        </View>

        <Text className="mt-3 text-[12px] text-white/30">
          No exercise demo yet
        </Text>
      </View>
    );
  }

  const current =
    media[index];

  return (
    <View>
      <View className="overflow-hidden bg-elevated">
        {current.type ===
        "VIDEO" ? (
          <VideoSlide
            key={
              current.id
            }
            media={
              current
            }
          />
        ) : (
          <Image
            source={{
              uri:
                current.secure_url,
            }}
            resizeMode="cover"
            className="h-[330px] w-full"
          />
        )}
      </View>

      {media.length > 1 ? (
        <View className="mt-4 flex-row items-center justify-center gap-2">
          {media.map(
            (
              item,
              itemIndex,
            ) => (
              <Pressable
                key={
                  item.id
                }
                onPress={() => {
                  setIndex(
                    itemIndex
                  );
                }}
                className="h-2 rounded-full"
                style={{
                  width:
                    itemIndex ===
                    index
                      ? 22
                      : 8,

                  backgroundColor:
                    itemIndex ===
                    index
                      ? "#3B82F6"
                      : "rgba(255,255,255,.2)",
                }}
              />
            ),
          )}
        </View>
      ) : null}
    </View>
  );
}