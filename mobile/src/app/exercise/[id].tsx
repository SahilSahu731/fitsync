
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  View
} from "react-native";

import { Image } from "expo-image";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter
} from "expo-router";

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";

import { C } from "@/src/constants/theme";
import { Txt } from "@/src/components/ui";

import {
  Exercise,
  getExercise,
  pretty
} from "@/src/features/exercises/api";

function DemoVideo({ url }: { url: string }) {
  const player = useVideoPlayer(url, player => {
    player.loop = true;
  });

  return (
    <VideoView
      player={player}
      style={{ width: "100%", height: 260 }}
      nativeControls
      contentFit="contain"
    />
  );
}

function GuideSection({
  title,
  items
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) return null;

  return (
    <View className="mt-8">
      <Txt weight="extra" className="text-xl">
        {title}
      </Txt>

      {items.map((item, index) => (
        <View
          key={`${title}-${index}`}
          className="mt-3 flex-row rounded-2xl border border-border bg-panel p-4"
        >
          <Txt weight="extra" className="mr-3 text-sm text-brand">
            {String(index + 1).padStart(2, "0")}
          </Txt>

          <Txt className="flex-1 text-sm leading-6">
            {item}
          </Txt>
        </View>
      ))}
    </View>
  );
}

export default function ExerciseDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      let active = true;

      setLoading(true);
      setError("");

      getExercise(id)
        .then(result => {
          if (!active) return;

          setExercise(result);
        })
        .catch(error => {
          if (active) setError(error.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }, [id])
  );

  const images = exercise?.media.filter(
    media => media.kind === "image"
  ) ?? [];

  const video = exercise?.media.find(
    media => media.kind === "video"
  );

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
    >
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-full border border-border"
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={22}
            color={C.ink}
          />
        </Pressable>

      </View>

      {loading && (
        <ActivityIndicator
          className="mt-20"
          color={C.brand}
        />
      )}

      {!!error && (
        <Txt className="mt-8">{error}</Txt>
      )}

      {exercise && !loading && (
        <>
          <Txt weight="medium" className="mt-7 text-xs tracking-[2px] text-brand">
            {exercise.categoryLabel.toUpperCase()} / {exercise.regionLabel.toUpperCase()}
          </Txt>

          <Txt weight="extra" className="mt-2 text-[30px] leading-[37px]">
            {exercise.name.toUpperCase()}
          </Txt>

          {exercise.status !== "published" && (
            <Txt className="mt-2 text-brand">
              {pretty(exercise.status)} · Admin preview
            </Txt>
          )}

          {images.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-6"
              contentContainerStyle={{ gap: 10 }}
            >
              {images.map(image => (
                <Image
                  key={image.id}
                  source={{ uri: image.url }}
                  style={{
                    width: 290,
                    height: 250,
                    borderRadius: 22,
                    backgroundColor: C.panel
                  }}
                  contentFit="contain"
                />
              ))}
            </ScrollView>
          ) : (
            <View className="mt-6 h-56 items-center justify-center rounded-3xl border border-border bg-panel">
              <MaterialCommunityIcons
                name="dumbbell"
                size={60}
                color={C.brand}
              />
            </View>
          )}

          {video && (
            <View className="mt-4 overflow-hidden rounded-3xl border border-border bg-panel">
              <DemoVideo url={video.url} />
            </View>
          )}

          <View className="mt-5 flex-row flex-wrap gap-2">
            {[
              exercise.activityLabel,
              exercise.regionLabel,
              pretty(exercise.difficulty),
              ...exercise.equipment.map(pretty)
            ].map((label, index) => (
              <View
                key={index}
                className="rounded-full border border-border bg-elevated px-3 py-2"
              >
                <Txt weight="semibold" className="text-xs">
                  {label}
                </Txt>
              </View>
            ))}
          </View>

          {!!exercise.description && (
            <Txt className="mt-6 text-sm leading-6 text-muted">
              {exercise.description}
            </Txt>
          )}

          <Txt weight="extra" className="mt-8 text-xl">
            TARGET MUSCLES
          </Txt>

          <Txt className="mt-2 text-sm">
            Primary: {exercise.primaryMuscles.map(pretty).join(", ") || "Not applicable"}
          </Txt>

          {exercise.secondaryMuscles.length > 0 && (
            <Txt className="mt-2 text-sm text-muted">
              Secondary: {exercise.secondaryMuscles.map(pretty).join(", ")}
            </Txt>
          )}

          <GuideSection
            title="HOW TO PERFORM"
            items={exercise.instructions}
          />

          <GuideSection
            title="TECHNIQUE TIPS"
            items={exercise.tips}
          />

          <GuideSection
            title="COMMON MISTAKES"
            items={exercise.mistakes}
          />

          <GuideSection
            title="SAFETY NOTES"
            items={exercise.safetyNotes}
          />

          {!!exercise.breathingTip && (
            <View className="mt-8 rounded-2xl border border-border bg-panel p-4">
              <Txt weight="extra" className="text-lg">
                BREATHING
              </Txt>

              <Txt className="mt-2 leading-6 text-muted">
                {exercise.breathingTip}
              </Txt>
            </View>
          )}

          {exercise.media.some(media => media.credit || media.license || media.sourceUrl) && (
            <View className="mt-8">
              <Txt weight="extra" className="text-lg">
                MEDIA CREDITS
              </Txt>

              {exercise.media.map(media => (
                <View key={media.id} className="mt-3 rounded-xl border border-border bg-panel p-4">
                  <Txt weight="semibold">
                    {pretty(media.kind)}
                  </Txt>

                  {!!media.credit && (
                    <Txt className="mt-1 text-xs text-muted">
                      Creator: {media.credit}
                    </Txt>
                  )}

                  {!!media.license && (
                    <Txt className="mt-1 text-xs text-muted">
                      Usage rights: {media.license}
                    </Txt>
                  )}

                  {!!media.sourceUrl && (
                    <Pressable onPress={() => Linking.openURL(media.sourceUrl)}>
                      <Txt className="mt-2 text-xs text-brand">
                        VIEW ORIGINAL SOURCE ↗
                      </Txt>
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}
