import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { useSession } from "@/src/context/session";
import {
  cachedPickerPage,
  loadPickerPage,
  subscribePickerCache,
  type PickerExercise,
} from "@/src/features/exercises/picker-cache";
import type { ExerciseScope } from "@/src/features/exercises/custom-discovery";
import { ExerciseImage } from "./exercise-image";

type ExercisePickerProps = {
  existingIds: string[];
  onClose: () => void;
  onConfirm: (items: PickerExercise[]) => Promise<void>;
  disabled?: boolean;
  title?: string;
};

export function ExercisePicker(props: ExercisePickerProps) {
  const { user } = useSession();
  return <OwnedExercisePicker key={user?.id ?? "guest"} ownerId={user?.id ?? ""} {...props} />;
}

function OwnedExercisePicker({
  existingIds,
  onClose,
  onConfirm,
  disabled = false,
  title = "Add exercises",
  ownerId,
}: ExercisePickerProps & { ownerId: string }) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<ExerciseScope>("all");
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<PickerExercise[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const insets = useSafeAreaInsets();
  const picked = selected.filter((item) => !existingIds.includes(item.id));
  const limit = Math.max(0, 50 - existingIds.length);
  const search = query.trim().toLowerCase();
  useEffect(
    () =>
      subscribePickerCache(() => {
        setRevision((value) => value + 1);
        // A saved custom selection may have just been archived or edited.
        setSelected((items) => items.filter((item) => !item.isCustom));
      }),
    [],
  );
  useFocusEffect(
    useCallback(() => {
      setRevision((value) => value + 1);
    }, []),
  );
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-bg"
    >
      <View className="flex-row items-center px-5 py-4">
        <Pressable
          accessibilityLabel="Back"
          disabled={saving}
          onPress={onClose}
          className="h-11 w-11 items-center justify-center"
        >
          <MaterialCommunityIcons name="arrow-left" color={C.ink} size={26} />
        </Pressable>
        <View className="ml-3 flex-1">
          <Txt weight="semibold" className="text-2xl">
            {title}
          </Txt>
        </View>
      </View>
      <View className="mx-5 mb-3 flex-row items-center rounded-2xl bg-panel px-3">
        <MaterialCommunityIcons name="magnify" color={C.muted} size={23} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          maxLength={120}
          editable={!saving}
          autoCorrect={false}
          placeholder="Name, muscle or equipment"
          placeholderTextColor={C.muted}
          accessibilityLabel="Search exercises"
          className="font-poppins-regular h-14 flex-1 px-3 text-ink"
        />
        {!!query && (
          <Pressable accessibilityLabel="Clear search" onPress={() => setQuery("")} className="p-2">
            <MaterialCommunityIcons name="close-circle" color={C.muted} size={22} />
          </Pressable>
        )}
      </View>
      <View className="mx-5 mb-3 flex-row items-center gap-3">
        <View className="flex-1 flex-row rounded-full bg-panel p-1">
          {(
            [
              ["all", "All exercises"],
              ["custom", "My exercises"],
            ] as const
          ).map(([value, label]) => (
            <Pressable
              key={value}
              accessibilityRole="tab"
              accessibilityState={{ selected: scope === value }}
              disabled={saving}
              onPress={() => setScope(value)}
              className={`min-h-11 flex-1 items-center justify-center rounded-full px-2 ${scope === value ? "bg-ink" : ""}`}
            >
              <Txt
                weight="semibold"
                className={`text-xs ${scope === value ? "text-bg" : "text-muted"}`}
              >
                {label}
              </Txt>
            </Pressable>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Manage custom exercises"
          disabled={saving}
          onPress={() => {
            onClose();
            router.push("/exercises/custom");
          }}
          className="h-12 w-12 items-center justify-center rounded-full bg-panel"
        >
          <MaterialCommunityIcons name="playlist-edit" color={C.ink} size={24} />
        </Pressable>
      </View>
      <View className="mx-5 mb-3 flex-row justify-between">
        <Txt className="text-sm text-muted">{picked.length} selected</Txt>
        <Pressable disabled={saving} onPress={() => setSelected([])}>
          <Txt className="text-sm text-ink">Clear selection</Txt>
        </Pressable>
      </View>
      <PickerResults
        key={`${ownerId}:${scope}:${revision}:${search}`}
        query={search}
        scope={scope}
        ownerId={ownerId}
        selected={picked}
        existingIds={existingIds}
        disabled={saving || disabled}
        limit={limit}
        onToggle={(item) =>
          setSelected((rows) =>
            rows.some((row) => row.id === item.id)
              ? rows.filter((row) => row.id !== item.id)
              : rows.length < limit
                ? [...rows, item]
                : rows,
          )
        }
      />
      <View className="bg-panel px-5 pt-3" style={{ paddingBottom: Math.max(16, insets.bottom) }}>
        {!!error && (
          <Txt accessibilityRole="alert" className="mb-3 text-sm text-red-300">
            {error}
          </Txt>
        )}
        <Pressable
          disabled={saving || disabled || !picked.length}
          accessibilityRole="button"
          onPress={async () => {
            if (submitting.current) return;
            submitting.current = true;
            setSaving(true);
            setError("");
            try {
              await onConfirm(picked);
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Could not add exercises. Your selection is kept.",
              );
            } finally {
              submitting.current = false;
              setSaving(false);
            }
          }}
          className={`h-14 flex-row items-center justify-center rounded-2xl ${picked.length ? "bg-ink" : "bg-elevated"}`}
        >
          {saving && <ActivityIndicator color={C.bg} style={{ marginRight: 10 }} />}
          <Txt weight="semibold" className={picked.length ? "text-bg text-lg" : "text-muted "}>
            {saving
              ? "Adding…"
              : picked.length
                ? `Add ${picked.length} exercise${picked.length === 1 ? "" : "s"}`
                : "Select exercises"}
          </Txt>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
function PickerResults({
  query,
  scope,
  ownerId,
  selected,
  existingIds,
  disabled,
  limit,
  onToggle,
}: {
  query: string;
  scope: ExerciseScope;
  ownerId: string;
  selected: PickerExercise[];
  existingIds: string[];
  disabled: boolean;
  limit: number;
  onToggle: (item: PickerExercise) => void;
}) {
  const [items, setItems] = useState<PickerExercise[]>(
    () => cachedPickerPage(query, 1, { scope, ownerId })?.items ?? [],
  );
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const page = useRef(0);
  const fetching = useRef(false);
  const mounted = useRef(true);
  const scrolled = useRef(false);
  const next = useCallback(async () => {
    if (fetching.current) return;
    fetching.current = true;
    setLoading(true);
    setError("");
    try {
      const result = await loadPickerPage(query, page.current + 1, { scope, ownerId });
      if (!mounted.current) return;
      const first = page.current === 0;
      page.current++;
      setItems((rows) =>
        first
          ? result.items
          : [...rows, ...result.items.filter((item) => !rows.some((row) => row.id === item.id))],
      );
      setHasMore(result.hasMore);
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : "Could not load exercises.");
    } finally {
      fetching.current = false;
      if (mounted.current) setLoading(false);
    }
  }, [query, scope, ownerId]);
  useEffect(() => {
    mounted.current = true;
    const timer = setTimeout(() => void next(), query ? 150 : 0);
    return () => {
      mounted.current = false;
      clearTimeout(timer);
    };
  }, [next, query]);
  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      keyboardShouldPersistTaps="handled"
      initialNumToRender={15}
      windowSize={5}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
      onScrollBeginDrag={() => {
        scrolled.current = true;
      }}
      onEndReachedThreshold={0.4}
      onEndReached={() => {
        if (scrolled.current && hasMore && !error) void next();
      }}
      ListEmptyComponent={
        !loading && !error ? (
          <View className="items-center rounded-3xl bg-panel px-6 py-8">
            <MaterialCommunityIcons
              name={scope === "custom" ? "dumbbell" : "magnify"}
              size={32}
              color={C.ink}
            />
            <Txt weight="semibold" className="mt-4 text-center text-base">
              {scope === "custom" && !query
                ? "Your own movements, right here"
                : "No exercises found"}
            </Txt>
            <Txt className="mt-2 text-center text-sm leading-6 text-muted">
              {scope === "custom" && !query
                ? "Create an exercise in your library, then select it here for a workout or routine."
                : "Try another name, muscle or piece of equipment."}
            </Txt>
          </View>
        ) : null
      }
      ListFooterComponent={
        <View className="items-center py-4">
          {loading ? (
            <ActivityIndicator color={C.ink} />
          ) : error ? (
            <Pressable onPress={() => void next()} className="rounded-xl bg-panel p-4">
              <Txt className="text-red-300">{error} Tap to retry.</Txt>
            </Pressable>
          ) : hasMore ? (
            <Pressable onPress={() => void next()} className="p-3">
              <Txt className="text-ink">Load 15 more</Txt>
            </Pressable>
          ) : items.length > 0 ? (
            <Txt className="text-xs text-muted">All matching exercises loaded</Txt>
          ) : null}
        </View>
      }
      renderItem={({ item }) => {
        const position = selected.findIndex((row) => row.id === item.id);
        const exists = existingIds.includes(item.id);
        const blocked = disabled || exists || (position < 0 && selected.length >= limit);
        return (
          <Pressable
            onPress={() => onToggle(item)}
            disabled={blocked}
            accessibilityRole="checkbox"
            accessibilityLabel={`${item.name}${exists ? ", already added" : ""}`}
            accessibilityState={{
              checked: position >= 0 || exists,
              disabled: blocked,
            }}
            className={`mb-2 flex-row items-center rounded-2xl  p-3 ${position >= 0 ? " bg-white/5" : " bg-panel"}`}
          >
            <ExerciseImage uri={item.imageUrl} name={item.name} size={60} />
            <View className="mx-3 flex-1">
              {item.isCustom && (
                <Txt
                  weight="semibold"
                  className="mb-1 text-[10px] uppercase tracking-wider text-muted"
                >
                  My exercise
                </Txt>
              )}
              <Txt weight="semibold">{item.name}</Txt>
              <Txt numberOfLines={2} className="mt-1 text-xs text-muted">
                {item.primaryMuscles.join(" · ").replace(/-/g, " ") || item.regionLabel} ·{" "}
                {item.equipment.join(", ").replace(/-/g, " ")}
              </Txt>
              {exists && <Txt className="mt-1 text-xs text-muted">Already added</Txt>}
            </View>
            <View
              className={`h-8 w-8 items-center justify-center rounded-full ${position >= 0 ? "bg-ink" : "bg-elevated"}`}
            >
              {position >= 0 ? (
                <Txt weight="semibold" className="text-bg">
                  {position + 1}
                </Txt>
              ) : (
                <MaterialCommunityIcons
                  name={exists ? "minus" : "plus"}
                  size={21}
                  color={exists ? C.muted : C.brand}
                />
              )}
            </View>
          </Pressable>
        );
      }}
    />
  );
}
