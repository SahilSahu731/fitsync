import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable as Pressable, useReducedAppMotion } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { catalogApi, type Routine } from "@/src/features/training-catalog/api";

const RECOMMENDATIONS = [
  {
    slug: "push-gym",
    title: "Push Day",
    subtitle: "Chest, shoulders & triceps",
    icon: "dumbbell",
    color: "#C5F460",
  },
  {
    slug: "pull-gym",
    title: "Back Day",
    subtitle: "Back & biceps · Pull session",
    icon: "arm-flex-outline",
    color: "#7DCFFF",
  },
  {
    slug: "legs-gym",
    title: "Leg Day",
    subtitle: "Quads, hamstrings & glutes",
    icon: "run",
    color: "#FFB38A",
  },
] as const;

type Props = {
  disabled: boolean;
  onStart: (templateId?: string) => Promise<void>;
  onStarted: () => void;
  onClose: () => void;
};

export function StartWorkoutDialog({ disabled, onStart, onStarted, onClose }: Props) {
  const reduced = useReducedAppMotion();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [startError, setStartError] = useState("");
  const [retry, setRetry] = useState(0);
  const [pending, setPending] = useState<string | null>(null);
  const selecting = useRef(false);
  const mounted = useRef(true);
  const savedTemplates = useRef(new Map<string, string>());
  const locked = pending !== null || disabled;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setLoadError("");
    void catalogApi
      .routines("gym")
      .then((result) => {
        if (current) setRoutines(result);
      })
      .catch((error) => {
        if (current) setLoadError(error instanceof Error ? error.message : "Please try again.");
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [retry]);

  const close = () => {
    if (!selecting.current) onClose();
  };

  async function choose(routine?: Routine) {
    if (selecting.current || disabled) return;
    selecting.current = true;
    setPending(routine?.id ?? "custom");
    setStartError("");
    try {
      let templateId: string | undefined;
      if (routine) {
        templateId = savedTemplates.current.get(routine.id);
        if (!templateId) {
          const saved = await catalogApi.saveRoutine(routine.id);
          if (!saved.templateId)
            throw new Error("Could not prepare this routine. Please try again.");
          templateId = saved.templateId;
          savedTemplates.current.set(routine.id, templateId);
        }
      }
      if (!mounted.current) return;
      await onStart(templateId);
      if (mounted.current) onStarted();
    } catch (error) {
      if (mounted.current)
        setStartError(
          error instanceof Error
            ? error.message
            : "Could not start your workout. Please try again.",
        );
    } finally {
      selecting.current = false;
      if (mounted.current) setPending(null);
    }
  }

  const unavailable =
    !loading &&
    !loadError &&
    !RECOMMENDATIONS.some((item) => routines.some((routine) => routine.slug === item.slug));

  return (
    <Modal transparent animationType={reduced ? "none" : "slide"} onRequestClose={close}>
      <View className="flex-1 justify-end bg-black/75">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close workout picker"
          disabled={pending !== null}
          onPress={close}
          className="absolute inset-0"
        />
        <SafeAreaView
          edges={["bottom"]}
          accessibilityViewIsModal
          className="w-full max-w-2xl self-center rounded-t-[32px] bg-panel"
          style={{ maxHeight: "90%" }}
        >
          <View className="px-6 pb-4 pt-5">
            <View className="mb-4 h-1 w-10 self-center rounded-full bg-white/20" />
            <View className="flex-row items-center justify-between gap-4">
              <Txt
                accessibilityRole="header"
                weight="semibold"
                className="flex-1 text-[24px] tracking-[-0.8px]"
              >
                Choose your workout.
              </Txt>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel workout selection"
                disabled={pending !== null}
                onPress={close}
                className="h-11 w-11 items-center justify-center rounded-full bg-elevated"
              >
                <MaterialCommunityIcons name="close" size={22} color={C.ink} />
              </Pressable>
            </View>
            <Txt className="mt-1 text-sm leading-6 text-muted">
              Pick a ready-made session, or build your own.
            </Txt>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          >
            <View className="mb-3 flex-row items-center gap-2">
              <MaterialCommunityIcons name="check-circle" size={18} color={"white"} />
              <Txt weight="medium" className="text-[13px] text-muted">
                Recommended · GYM
              </Txt>
              {loading && (
                <ActivityIndicator
                  size="small"
                  color={C.brand}
                  accessibilityLabel="Loading recommended workouts"
                />
              )}
            </View>
            {RECOMMENDATIONS.map((item) => {
              const routine = routines.find((row) => row.slug === item.slug);
              const starting = Boolean(routine && pending === routine.id);
              const blocked = loading || !routine || locked;
              return (
                <Pressable
                  key={item.slug}
                  accessibilityRole="button"
                  accessibilityLabel={`Start ${item.title}`}
                  accessibilityState={{ disabled: blocked, busy: starting }}
                  disabled={blocked}
                  onPress={() => {
                    if (routine) void choose(routine);
                  }}
                  className={`mb-3 flex-row items-center gap-3 rounded-[22px] p-4 ${blocked && !starting ? "opacity-50" : ""}`}
                  style={{ borderColor: `${item.color}26`, backgroundColor: `${item.color}08` }}
                >
                  <View
                    className="h-12 w-12 items-center justify-center rounded-2xl"
                    // style={{ backgroundColor: `${item.color}18` }}
                  >
                    <MaterialCommunityIcons name={item.icon} size={25} color={item.color} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Txt weight="semibold" className="text-base">
                      {item.title}
                    </Txt>
                    <Txt className="mt-1 text-xs leading-5 text-muted">{item.subtitle}</Txt>
                    <Txt className="mt-1 text-[11px]" style={{ color: item.color }}>
                      {starting
                        ? "Preparing your workout…"
                        : loading
                          ? "Loading routine…"
                          : routine
                            ? routine.estimated_minutes > 0
                              ? `${routine.estimated_minutes} min · Ready-made routine`
                              : "Ready-made routine"
                            : "Not available right now"}
                    </Txt>
                  </View>
                  {starting ? (
                    <ActivityIndicator color={item.color} />
                  ) : (
                    <MaterialCommunityIcons name="arrow-right" size={20} color={item.color} />
                  )}
                </Pressable>
              );
            })}
            {(!!loadError || unavailable) && (
              <View className="mb-4 rounded-2xl bg-elevated p-4">
                <Txt className="text-xs leading-5 text-muted">
                  {loadError
                    ? `Couldn't load recommendations. ${loadError}`
                    : "Recommended routines aren't available yet. You can still start a custom workout."}
                </Txt>
                <Pressable
                  accessibilityRole="button"
                  disabled={loading || locked}
                  onPress={() => setRetry((value) => value + 1)}
                  className="mt-2 min-h-11 justify-center self-start"
                >
                  <Txt weight="medium" className="text-xs text-ink">
                    Retry recommendations
                  </Txt>
                </Pressable>
              </View>
            )}
            <View className="mb-4 mt-1 h-px bg-white/10" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start a custom workout"
              accessibilityState={{ disabled: locked, busy: pending === "custom" }}
              disabled={locked}
              onPress={() => void choose()}
              className={`min-h-20 flex-row items-center gap-3 rounded-[22px] bg-ink p-4 ${locked && pending !== "custom" ? "opacity-50" : ""}`}
            >
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-black/10">
                <MaterialCommunityIcons name="plus" size={25} color={C.bg} />
              </View>
              <View className="min-w-0 flex-1">
                <Txt weight="semibold" className="text-sm text-black">
                  {pending === "custom" ? "Starting your workout…" : "Start a custom workout"}
                </Txt>
                <Txt className="mt-1 text-xs leading-5 text-black/60">
                  Start empty. Add exercises as you go.
                </Txt>
              </View>
              {pending === "custom" ? (
                <ActivityIndicator color={C.bg} />
              ) : (
                <MaterialCommunityIcons name="arrow-right" size={21} color={C.bg} />
              )}
            </Pressable>
            {!!startError && (
              <Txt accessibilityRole="alert" className="mt-4 text-sm leading-6 text-red-300">
                {startError}
              </Txt>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
