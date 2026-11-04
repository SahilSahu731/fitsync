import React, { useEffect, useState } from "react";

import {
  ActivityIndicator,
  AppState,
  Pressable,
  ScrollView,
  View,
} from "react-native";

import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useLocalSearchParams, useRouter } from "expo-router";

import { C } from "@/src/constants/theme";
import { Txt } from "@/src/components/ui";

import { ExploreHeader } from "@/src/features/explore/components";

import { exploreApi, type ExploreResource } from "@/src/features/explore/api";

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");

  const remainder = (seconds % 60).toString().padStart(2, "0");

  return `${minutes}:${remainder}`;
}

function MobilitySession({ resource }: { resource: ExploreResource }) {
  const steps = resource.steps ?? [];

  const [index, setIndex] = useState(0);

  const [remaining, setRemaining] = useState(steps[0]?.seconds ?? 0);

  const [running, setRunning] = useState(false);

  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (!running) {
      return;
    }

    const timer = setInterval(
      () => setRemaining((value) => Math.max(0, value - 1)),
      1000,
    );

    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (!running || remaining > 0) {
      return;
    }

    if (index + 1 < steps.length) {
      setIndex(index + 1);

      setRemaining(steps[index + 1].seconds);
    } else {
      setRunning(false);
      setComplete(true);
    }
  }, [running, remaining, index, steps]);

  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        setRunning(false);
      }
    });

    return () => listener.remove();
  }, []);

  const jump = (next: number) => {
    const safe = Math.max(0, Math.min(steps.length - 1, next));

    setIndex(safe);

    setRemaining(steps[safe]?.seconds ?? 0);

    setComplete(false);
    setRunning(false);
  };

  if (!steps.length) {
    return (
      <Txt className="text-muted">
        No movements have been published for this session.
      </Txt>
    );
  }

  return (
    <View>
      <View className="mt-5 rounded-[26px] bg-panel p-5">
        <Txt className="text-xs uppercase tracking-widest text-brand">
          {complete
            ? "Session complete"
            : `Movement ${index + 1} of ${steps.length}`}
        </Txt>

        <Txt weight="bold" className="mt-3 text-[25px]">
          {complete ? "Nice work!" : steps[index].title}
        </Txt>

        <Txt className="mt-2 text-sm leading-6 text-muted">
          {steps[index].instruction}
        </Txt>

        <Txt weight="bold" className="mt-6 text-center text-[54px]">
          {formatClock(remaining)}
        </Txt>

        <View className="mt-4 flex-row items-center gap-3">
          <Pressable
            disabled={index === 0}
            onPress={() => jump(index - 1)}
            className="h-14 w-14 items-center justify-center rounded-2xl bg-elevated"
            accessibilityLabel="Previous movement"
          >
            <MaterialCommunityIcons
              name="skip-previous"
              size={25}
              color={index === 0 ? C.muted : C.ink}
            />
          </Pressable>

          <Pressable
            onPress={() => {
              if (complete) {
                jump(0);
                return;
              }

              setRunning((value) => !value);
            }}
            accessibilityRole="button"
            className="h-14 flex-1 flex-row items-center justify-center rounded-2xl bg-brand"
          >
            <MaterialCommunityIcons
              name={complete ? "restart" : running ? "pause" : "play"}
              size={22}
              color={C.bg}
            />

            <Txt weight="bold" className="ml-2 text-bg">
              {complete
                ? "Restart"
                : running
                  ? "Pause"
                  : remaining === steps[index].seconds
                    ? "Start"
                    : "Resume"}
            </Txt>
          </Pressable>

          <Pressable
            disabled={index === steps.length - 1}
            onPress={() => jump(index + 1)}
            className="h-14 w-14 items-center justify-center rounded-2xl bg-elevated"
            accessibilityLabel="Next movement"
          >
            <MaterialCommunityIcons
              name="skip-next"
              size={25}
              color={index === steps.length - 1 ? C.muted : C.ink}
            />
          </Pressable>
        </View>
      </View>

      <Txt weight="bold" className="mb-3 mt-7 text-xl">
        Movement list
      </Txt>

      {steps.map((step, idx) => (
        <Pressable
          key={`${idx}-${step.title}`}
          onPress={() => jump(idx)}
          className="mb-2 flex-row items-center rounded-xl bg-panel p-4"
          accessibilityRole="button"
        >
          <View
            className={`h-9 w-9 items-center justify-center rounded-xl ${
              idx === index ? "bg-brand" : "bg-elevated"
            }`}
          >
            <Txt
              weight="bold"
              className={idx === index ? "text-bg" : "text-ink"}
            >
              {idx + 1}
            </Txt>
          </View>

          <View className="ml-3 flex-1">
            <Txt weight="semibold">{step.title}</Txt>

            <Txt className="mt-1 text-xs text-muted">
              {formatClock(step.seconds)}
            </Txt>
          </View>

          {idx === index ? (
            <MaterialCommunityIcons
              name="circle-small"
              size={24}
              color={C.brand}
            />
          ) : null}
        </Pressable>
      ))}

      <Txt className="mt-4 text-xs leading-5 text-muted">
        Move gently and stop if something causes pain, dizziness, or discomfort.
        This session is general fitness education, not treatment or
        rehabilitation.
      </Txt>
    </View>
  );
}

export default function ExploreResourceDetail() {
  const { slug } = useLocalSearchParams<{
    slug: string;
  }>();

  const router = useRouter();

  const [resource, setResource] = useState<ExploreResource | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!slug) {
      return;
    }

    let active = true;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setResource(null);
    setError("");

    void exploreApi
      .resource(slug)
      .then((data) => {
        if (active) {
          setResource(data);
        }
      })
      .catch((e) => {
        if (active) {
          setError(e instanceof Error ? e.message : "Unable to load resource.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [slug, retry]);

  return (
    <ScrollView
      className="flex-1 bg-bg"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        padding: 20,
        paddingBottom: 110,
      }}
    >
      <ExploreHeader
        title={resource?.title ?? (loading ? "Loading..." : "Resource")}
        subtitle={resource?.summary}
        onBack={() => router.back()}
      />

      {loading ? <ActivityIndicator color={C.brand} className="mt-8" /> : null}

      {error ? (
        <View className="rounded-2xl bg-panel p-5">
          <Txt className="text-muted">{error}</Txt>

          <Pressable
            onPress={() => setRetry((r) => r + 1)}
            className="mt-4 self-start rounded-full bg-brand px-4 py-2"
          >
            <Txt weight="bold" className="text-bg">
              Retry
            </Txt>
          </Pressable>
        </View>
      ) : null}

      {resource ? (
        <>
          <View className="flex-row flex-wrap gap-2">
            <View className="rounded-full bg-brand/10 px-3 py-2">
              <Txt className="text-xs text-brand">
                {resource.duration_minutes} min{" "}
                {resource.kind === "guide" ? "read" : "session"}
              </Txt>
            </View>

            {resource.tags.map((tag) => (
              <View key={tag} className="rounded-full bg-panel px-3 py-2">
                <Txt className="text-xs text-muted">{tag}</Txt>
              </View>
            ))}
          </View>

          {resource.kind === "mobility" ? (
            <MobilitySession key={resource.id} resource={resource} />
          ) : (
            <View className="mt-7 gap-6">
              {(resource.body ?? []).map((section, i) => (
                <View key={`${i}-${section.heading}`}>
                  <Txt weight="bold" className="text-[22px]">
                    {section.heading}
                  </Txt>

                  {section.paragraphs.map((paragraph, j) => (
                    <Txt
                      key={j}
                      className="mt-3 text-[15px] leading-7 text-ink"
                    >
                      {paragraph}
                    </Txt>
                  ))}
                </View>
              ))}

              <View className="rounded-xl bg-panel p-4">
                <Txt className="text-xs leading-5 text-muted">
                  Educational information only. Adjust training to your health,
                  experience and situation; seek qualified guidance when needed.
                </Txt>
              </View>
            </View>
          )}
        </>
      ) : null}
    </ScrollView>
  );
}
