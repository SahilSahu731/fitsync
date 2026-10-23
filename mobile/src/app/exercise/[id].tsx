import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions
} from "react-native";

import { Image } from "expo-image";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter
} from "expo-router";

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { C } from "@/src/constants/theme";
import { Txt } from "@/src/components/ui";

import {
  Exercise,
  getExercise,
  pretty
} from "@/src/features/exercises/api";

/* -------------------------------------------------------------------------- */
/*  Tabs                                                                       */
/* -------------------------------------------------------------------------- */

type TabKey = "about" | "how" | "history" | "records";

const TABS: { key: TabKey; label: string }[] = [
  { key: "about", label: "About" },
  { key: "how", label: "How to" },
  { key: "history", label: "History" },
  { key: "records", label: "Records" }
];

function TabBar({
  value,
  onChange
}: {
  value: TabKey;
  onChange: (key: TabKey) => void;
}) {
  return (
    <View className="mx-6 mt-6 flex-row border-b border-border">
      {TABS.map(tab => {
        const active = tab.key === value;

        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={`-mb-px flex-1 items-center border-b-2 py-3 ${active ? "border-brand" : "border-transparent"}`}
          >
            <Txt
              weight="medium"
              className={`text- ${active ? "text-brand" : "text-muted"}`}
            >
              {tab.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hero: swipeable images                                                     */
/* -------------------------------------------------------------------------- */

function Hero({ images }: { images: Exercise["media"] }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  if (images.length === 0) {
    return (
      <View className="h-[320px] items-center justify-center bg-panel">
        <MaterialCommunityIcons name="dumbbell" size={64} color={C.brand} />
      </View>
    );
  }

  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
      >
        {images.map(image => (
          <View key={image.id} style={{ width }} className="bg-panel">
            <Image
              source={{ uri: image.url }}
              style={{ width: "100%", height: 180 }}
              contentFit="cover"
              transition={200}
            />
          </View>
        ))}
      </ScrollView>

      {images.length > 1 && (
        <View className="absolute inset-x-0 bottom-3 flex-row justify-center" style={{ gap: 6 }}>
          {images.map((image, i) => (
            <View
              key={image.id}
              className={`h-1.5 rounded-full ${i === index ? "w-5 bg-brand" : "w-1.5 bg-border"}`}
            />
          ))}
        </View>
      )}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Shared pieces                                                              */
/* -------------------------------------------------------------------------- */

function DemoVideo({ url }: { url: string }) {
  const player = useVideoPlayer(url, p => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <VideoView
      player={player}
      style={{ width: "100%", height: 300, borderRadius: 50 }}
      nativeControls={false}
      contentFit="contain"
    />
  );
}

function Fact({
  icon,
  label,
  value
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View className="mb-3 w-[48.5%] rounded-2xl bg-panel p-4">
      <MaterialCommunityIcons name={icon} size={24} color={C.brand} />
      <Txt className="mt-3 text-sm text-muted">{label}</Txt>
      <Txt weight="semibold" numberOfLines={2} className="mt-0.5 text-[15px]">
        {value}
      </Txt>
    </View>
  );
}

function MuscleChip({ label, primary }: { label: string; primary?: boolean }) {
  return (
    <View
      className={`rounded-full border px-3.5 py-2 ${primary ? "border-brand bg-brand" : "border-border bg-panel"}`}
    >
      <Txt weight="semibold" className={`text-xs ${primary ? "text-bg" : "text-ink"}`}>
        {label}
      </Txt>
    </View>
  );
}

function Heading({ children }: { children: string }) {
  return (
    <Txt weight="extra" className="mb-3 mt-8 text-xl">
      {children}
    </Txt>
  );
}

/** Numbered steps: this content really is a sequence. */
function Steps({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <View>
      <Heading>How to perform</Heading>

      {items.map((item, i) => (
        <View key={i} className="mb-3 flex-row">
          <View className="mr-3 mt-0.5 h-7 w-7 items-center justify-center rounded-full bg-brand">
            <Txt weight="extra" className="text-xs text-bg">
              {i + 1}
            </Txt>
          </View>

          <Txt className="flex-1 text-[15px] leading-6">{item}</Txt>
        </View>
      ))}
    </View>
  );
}

/** Tips, mistakes and safety: bullet-style, no numbers. */
function Notes({
  title,
  items,
  icon,
  color
}: {
  title: string;
  items: string[];
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
}) {
  if (items.length === 0) return null;

  return (
    <View>
      <Heading>{title}</Heading>

      <View className="rounded-2xl border border-border bg-panel px-4 py-1">
        {items.map((item, i) => (
          <View
            key={i}
            className={`flex-row py-3.5 ${i > 0 ? "border-t border-border" : ""}`}
          >
            <MaterialCommunityIcons
              name={icon}
              size={20}
              color={color}
              style={{ marginRight: 12, marginTop: 1 }}
            />
            <Txt className="flex-1 text-sm leading-6">{item}</Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tab contents                                                               */
/* -------------------------------------------------------------------------- */

function AboutTab({ exercise }: { exercise: Exercise }) {
  const hasCredits = exercise.media.some(
    m => m.credit || m.license || m.sourceUrl
  );

  return (
    <View>
      {!!exercise.description && (
        <Txt className="text-[15px] leading-6">
          {exercise.description}
        </Txt>
      )}

      <View className="mt-6 flex-row flex-wrap justify-between">
        <Fact icon="signal-cellular-3" label="Difficulty" value={pretty(exercise.difficulty)} />
        <Fact icon="run-fast" label="Activity" value={exercise.activityLabel} />
        <Fact icon="human-handsup" label="Body region" value={exercise.regionLabel} />
        <Fact
          icon="dumbbell"
          label="Equipment"
          value={exercise.equipment.map(pretty).join(", ") || "No equipment"}
        />
      </View>

      <Heading>Target muscles</Heading>

      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        {exercise.primaryMuscles.map(m => (
          <MuscleChip key={`p-${m}`} label={pretty(m)} primary />
        ))}

        {exercise.secondaryMuscles.map(m => (
          <MuscleChip key={`s-${m}`} label={pretty(m)} />
        ))}

        {exercise.primaryMuscles.length === 0 &&
          exercise.secondaryMuscles.length === 0 && (
            <Txt className="text-sm text-muted">Not applicable</Txt>
          )}
      </View>

      {exercise.secondaryMuscles.length > 0 && (
        <Txt className="mt-3 text-xs text-muted">
          Filled chips are the main muscles worked. Outlined ones assist.
        </Txt>
      )}

      {/* {hasCredits && ({exercise.secondaryMuscles.length > 0 && (
        <Txt className="mt-3 text-xs text-muted">
          Filled chips are the main muscles worked. Outlined ones assist.
        </Txt>
      )}
        <View>
          <Heading>Media credits</Heading>

          {exercise.media.map(media => (
            <View
              key={media.id}
              className="mb-3 rounded-2xl border border-border bg-panel p-4"
            >
              <Txt weight="semibold">{pretty(media.kind)}</Txt>

              {!!media.credit && (
                <Txt className="mt-1 text-xs text-muted">Creator: {media.credit}</Txt>
              )}

              {!!media.license && (
                <Txt className="mt-1 text-xs text-muted">Usage rights: {media.license}</Txt>
              )}

              {!!media.sourceUrl && (
                <Pressable onPress={() => Linking.openURL(media.sourceUrl as string)}>
                  <Txt weight="semibold" className="mt-2 text-xs text-brand">
                    View original source
                  </Txt>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      )} */}
    </View>
  );
}

function HowToTab({ exercise }: { exercise: Exercise }) {
  const video = exercise.media.find(m => m.kind === "video");

  const nothing =
    !video &&
    exercise.instructions.length === 0 &&
    exercise.tips.length === 0 &&
    exercise.mistakes.length === 0 &&
    exercise.safetyNotes.length === 0 &&
    !exercise.breathingTip;

  if (nothing) {
    return (
      <EmptyState
        icon="book-open-variant"
        title="No guide yet"
        text="Instructions for this exercise haven't been added."
      />
    );
  }

  return (
    <View>
      {video && (
        <View className="overflow-hidden rounded-3xl">
          <DemoVideo url={video.url} />
        </View>
      )}

      <Steps items={exercise.instructions} />

      <Notes title="Technique tips" items={exercise.tips} icon="check-circle-outline" color={C.brand} />
      <Notes title="Common mistakes" items={exercise.mistakes} icon="close-circle-outline" color={C.muted} />
      <Notes title="Safety notes" items={exercise.safetyNotes} icon="shield-alert-outline" color={C.muted} />

      {!!exercise.breathingTip && (
        <View className="mt-8 flex-row rounded-2xl border border-border bg-panel p-4">
          <MaterialCommunityIcons name="weather-windy" size={22} color={C.brand} />
          <View className="ml-3 flex-1">
            <Txt weight="bold" className="text-[15px]">Breathing</Txt>
            <Txt className="mt-1 text-sm leading-6 text-muted">{exercise.breathingTip}</Txt>
          </View>
        </View>
      )}
    </View>
  );
}

function EmptyState({
  icon,
  title,
  text
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  text: string;
}) {
  return (
    <View className="items-center px-6 py-14">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-panel">
        <MaterialCommunityIcons name={icon} size={28} color={"white"} />
      </View>

      <Txt weight="bold" className="mt-5 text-base">{title}</Txt>
      <Txt className="mt-1 text-center text-sm leading-5 text-muted">{text}</Txt>
    </View>
  );
}

/** Empty for now. Later: render a list of logged sessions here. */
function HistoryTab() {
  return (
    <EmptyState
      icon="history"
      title="No history yet"
      text="Sessions where you log this exercise will show up here."
    />
  );
}

/** Empty for now. Later: replace the "none" values with real personal bests. */
const RECORD_TILES = [
  { label: "Heaviest weight", icon: "weight-kilogram" },
  { label: "Most reps", icon: "repeat" },
  { label: "Best set volume", icon: "chart-bar" },
  { label: "Estimated 1RM", icon: "trophy-outline" }
] as const;

function RecordsTab() {
  return (
    <View>
      <View className="flex-row flex-wrap justify-between">
        {RECORD_TILES.map(tile => (
          <View
            key={tile.label}
            className="mb-3 w-[48.5%] rounded-2xl bg-panel p-4"
          >
            <MaterialCommunityIcons name={tile.icon} size={20} color={"white"} />
            <Txt weight="extra" className="mt-3 text-2xl text-white">
              None
            </Txt>
            <Txt className="mt-0.5 text-xs text-muted">{tile.label}</Txt>
          </View>
        ))}
      </View>

      <Txt className="mt-2 text-center text-sm leading-5 text-muted">
        Your personal bests will appear here after you log this exercise.
      </Txt>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Screen                                                                     */
/* -------------------------------------------------------------------------- */

export default function ExerciseDetails() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabKey>("about");

  useFocusEffect(
    useCallback(() => {
      let active = true;

      setLoading(true);
      setError("");

      getExercise(id)
        .then(result => active && setExercise(result))
        .catch(e => active && setError(e.message))
        .finally(() => active && setLoading(false));

      return () => {
        active = false;
      };
    }, [id])
  );

  const images = exercise?.media.filter(m => m.kind === "image") ?? [];

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {loading && (
          <ActivityIndicator
            className="mt-40"
            color={C.brand}
          />
        )}

        {!!error && (
          <Txt className="px-6 text-center" style={{ marginTop: insets.top + 90 }}>
            {error}
          </Txt>
        )}

        {exercise && !loading && (
          <>
            <Hero images={images} />

            <View className="px-6 pt-6 ">
              <Txt weight="bold" className="text-[28px] leading-[34px]">
                {exercise.name}
              </Txt>

              <Txt className="mt-1.5 text-sm">
                {exercise.categoryLabel}, {exercise.regionLabel}
              </Txt>

              {exercise.status !== "published" && (
                <View className="mt-3 self-start rounded-full border border-brand px-3 py-1">
                  <Txt weight="semibold" className="text-xs text-brand">
                    {pretty(exercise.status)} (admin preview)
                  </Txt>
                </View>
              )}
            </View>

            <TabBar value={tab} onChange={setTab} />

            <View className="px-6 pt-6">
              {tab === "about" && <AboutTab exercise={exercise} />}
              {tab === "how" && <HowToTab exercise={exercise} />}
              {tab === "history" && <HistoryTab />}
              {tab === "records" && <RecordsTab />}
            </View>
          </>
        )}
      </ScrollView>

      {/* back button floats over the hero */}
      <Pressable
        onPress={() => router.back()}
        accessibilityLabel="Go back"
        className="absolute left-6 h-11 w-11 items-center justify-center rounded-full"
        style={{ top: insets.top + 8, backgroundColor: "rgba(0,0,0,0.55)" }}
      >
        <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
      </Pressable>
    </View>
  );
}