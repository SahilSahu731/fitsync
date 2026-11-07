import { Image } from "expo-image";
import * as Linking from "expo-linking";
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
  const steps = resource.steps;
  const [clock, setClock] = useState({ index: 0, remaining: steps[0]?.seconds ?? 0, complete: false, running: false });
  const { index, remaining, complete, running } = clock;
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setClock(current => {
      if (!current.running) return current;
      if (current.remaining > 1) return { ...current, remaining: current.remaining - 1 };
      const next = current.index + 1;
      return next < steps.length
        ? { ...current, index: next, remaining: steps[next].seconds }
        : { ...current, remaining: 0, running: false, complete: true };
    }), 1000);
    return () => clearInterval(timer);
  }, [running, steps]);

  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        setClock(current => ({ ...current, running: false }));
      }
    });

    return () => listener.remove();
  }, []);

  const jump = (next: number) => {
    const safe = Math.max(0, Math.min(steps.length - 1, next));

    setClock({ index: safe, remaining: steps[safe]?.seconds ?? 0, complete: false, running: false });
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

        {steps[index].image_url && <Image source={{ uri: steps[index].image_url }} style={{ width: "100%", height: 220, borderRadius: 16, marginTop: 16 }} contentFit="contain" accessibilityLabel={steps[index].image_alt || steps[index].title} />}
        <Txt className="mt-2 text-sm leading-6 text-muted">
          {steps[index].instruction}
        </Txt>

        {steps[index].modification && <View className="mt-4 rounded-xl bg-elevated p-4"><Txt weight="bold" className="text-sm text-brand">Make it easier</Txt><Txt className="mt-2 text-sm leading-6 text-muted">{steps[index].modification}</Txt></View>}
        {steps[index].video_url && <ExternalLink label="Watch demonstration" url={steps[index].video_url!} />}
        <View className="mt-4 h-2 overflow-hidden rounded-full bg-elevated"><View style={{ height: "100%", width: `${complete ? 100 : Math.round((index + (steps[index].seconds - remaining) / steps[index].seconds) / steps.length * 100)}%`, backgroundColor: C.brand }} /></View>
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

              setClock(current => ({ ...current, running: !current.running }));
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
          {resource.cover_url && <Image source={{ uri: resource.cover_url }} style={{ width: "100%", height: 210, borderRadius: 22, marginBottom: 20 }} contentFit="cover" accessibilityLabel={resource.title} />}
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

                  {section.image_url && <Image source={{ uri: section.image_url }} style={{ width: "100%", height: 210, borderRadius: 16, marginTop: 12 }} contentFit="contain" accessibilityLabel={section.image_alt || section.heading} />}
                  {section.links?.map((link, j) => <ExternalLink key={j} label={link.label} url={link.url} />)}
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

function ExternalLink({ label, url }: { label: string; url: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  return <View><Pressable accessibilityRole="link" onPress={() => {
    if (/^\/explore\/resources\/[a-z0-9-]+$/.test(url)) { router.push({ pathname: "/explore/resources/[slug]", params: { slug: url.split("/").pop()! } }); return; }
    if (!url.startsWith("https://")) return;
    void Linking.openURL(url).catch(() => setError("Could not open this link."));
  }}><Txt className="mt-3 text-sm text-brand">{label} ↗</Txt></Pressable>{error && <Txt className="text-xs text-muted">{error}</Txt>}</View>;
}
