import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSession } from "@/src/context/session";
import { MotionPressable, ScreenEntrance } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { useAppAlert } from "@/src/components/app-dialog";
import { useBilling } from "../billing/billing-context";
import { GlassCard, ProAction, ProButton, ProPill, ProSection, ProScene, PRO } from "../pro/ui";
import { Sheet } from "../progress/editors";
import { getTaxonomies, pretty, type Exercise, type ExerciseTaxonomies } from "./api";
import { customExerciseApi, type CustomExerciseInput } from "./custom-api";
import { clearPickerCache } from "./picker-cache";

const INITIAL: CustomExerciseInput = {
  name: "",
  description: "",
  category: "strength",
  activityType: "weight-training",
  bodyRegion: "upper-body",
  difficulty: "beginner",
  trackingType: "reps_weight",
  movementPattern: "other",
  primaryMuscles: [],
  secondaryMuscles: [],
  equipment: [],
  instructions: [],
  tips: [],
  mistakes: [],
  safetyNotes: [],
  breathingTip: "",
};
const tracking = {
  reps_weight: "External weight + reps",
  reps: "Repetitions",
  duration: "Duration",
  distance_duration: "Distance + time",
} as const;
export function CustomExercisesScreen() {
  const { user } = useSession();
  return <CustomLibrary key={user?.id ?? "none"} ownerId={user?.id ?? ""} />;
}
function CustomLibrary({ ownerId }: { ownerId: string }) {
  const billing = useBilling();
  const { alert } = useAppAlert();
  const api = useMemo(() => customExerciseApi(ownerId), [ownerId]);
  const [items, setItems] = useState<Exercise[]>([]);
  const [tax, setTax] = useState<ExerciseTaxonomies | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [archived, setArchived] = useState(false);
  const [draft, setDraft] = useState<CustomExerciseInput | null>(null);
  const [editing, setEditing] = useState<string | undefined>();
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const locked = useRef(false);
  const alive = useRef(true);
  const sequence = useRef(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const refresh = useCallback(async () => {
    if (!ownerId) {
      setLoading(false);
      return;
    }
    const id = ++sequence.current;
    setLoading(true);
    setError("");
    const results = await Promise.allSettled([api.list(), getTaxonomies()]);
    if (!alive.current || sequence.current !== id) return;
    if (results[0].status === "fulfilled") setItems(results[0].value);
    else
      setError(
        results[0].reason instanceof Error
          ? results[0].reason.message
          : "Could not load your exercises.",
      );
    if (results[1].status === "fulfilled") setTax(results[1].value);
    else
      setError((current) => current || "Could not load muscle and equipment choices. Try again.");
    setLoading(false);
  }, [api, ownerId]);
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );
  const edit = (exercise?: Exercise) => {
    if (!billing.isPro) {
      router.push("/membership");
      return;
    }
    setEditing(exercise?.id);
    setDraft(
      exercise
        ? {
            name: exercise.name,
            description: exercise.description,
            category: exercise.category,
            activityType: exercise.activityType,
            bodyRegion: exercise.bodyRegion,
            difficulty: exercise.difficulty,
            trackingType: exercise.trackingType,
            movementPattern: exercise.movementPattern,
            primaryMuscles: [...exercise.primaryMuscles],
            secondaryMuscles: [...exercise.secondaryMuscles],
            equipment: [...exercise.equipment],
            instructions: [...exercise.instructions],
            tips: [...exercise.tips],
            mistakes: [...exercise.mistakes],
            safetyNotes: [...exercise.safetyNotes],
            breathingTip: exercise.breathingTip,
          }
        : { ...INITIAL, primaryMuscles: [], secondaryMuscles: [], equipment: [] },
    );
    setInstructions(exercise?.instructions.join("\n") ?? "");
    setSaveError("");
  };
  const change = <K extends keyof CustomExerciseInput>(key: K, value: CustomExerciseInput[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  const toggle = (key: "primaryMuscles" | "secondaryMuscles" | "equipment", value: string) =>
    setDraft((d) => {
      if (!d) return d;
      const next = d[key].includes(value) ? d[key].filter((v) => v !== value) : [...d[key], value];
      return {
        ...d,
        [key]: next,
        ...(key === "primaryMuscles"
          ? { secondaryMuscles: d.secondaryMuscles.filter((m) => !next.includes(m)) }
          : {}),
      };
    });
  const save = async () => {
    if (!draft || locked.current) return;
    const lines = instructions
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (draft.name.trim().length < 2 || !draft.primaryMuscles.length || !lines.length) {
      setSaveError("Enter a name, choose a primary muscle and add at least one instruction.");
      return;
    }
    locked.current = true;
    setBusy(true);
    setSaveError("");
    try {
      await api.save({ ...draft, name: draft.name.trim(), instructions: lines }, editing);
      clearPickerCache();
      if (alive.current) {
        setDraft(null);
        await refresh();
      }
    } catch (e) {
      if (alive.current)
        setSaveError(e instanceof Error ? e.message : "Could not save. Your draft is kept.");
    } finally {
      locked.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const archive = (exercise: Exercise) =>
    alert(
      exercise.status === "archived" ? "Restore exercise?" : "Archive exercise?",
      exercise.status === "archived"
        ? "It will be available in your exercise picker again."
        : "It will leave the exercise picker. Your completed logs and records stay saved. You can restore it here.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: exercise.status === "archived" ? "Restore" : "Archive",
          style: exercise.status === "archived" ? "default" : "destructive",
          onPress: async () => {
            if (locked.current) return;
            locked.current = true;
            setBusy(true);
            try {
              await (exercise.status === "archived"
                ? api.restore(exercise.id)
                : api.archive(exercise.id));
              clearPickerCache();
              if (alive.current) await refresh();
            } catch (e) {
              if (alive.current) setError(e instanceof Error ? e.message : "Could not update.");
            } finally {
              locked.current = false;
              if (alive.current) setBusy(false);
            }
          },
        },
      ],
    );
  const visible = items.filter(
    (e) =>
      (archived ? e.status === "archived" : e.status !== "archived") &&
      e.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <ProScene>
      <ScreenEntrance className="flex-1">
        <View className="flex-row items-center gap-3 px-5 py-3">
          <MotionPressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-full bg-white/5"
          >
            <MaterialCommunityIcons name="arrow-left" size={23} color="white" />
          </MotionPressable>
          <Txt weight="medium" className="flex-1 text-lg">
            Custom exercises
          </Txt>
          <ProPill
            label="New"
            selected
            onPress={() => edit()}
            disabled={loading || !tax || billing.loading || busy}
          />
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="w-full max-w-2xl self-center px-6 pb-24 pt-4"
        >
          <GlassCard accent>
            <Txt className="text-[10px] tracking-[2px]" style={{ color: PRO.accent }}>
              YOUR OWN MOVEMENT LIBRARY
            </Txt>
            <Txt weight="medium" className="mt-3 text-[33px] leading-10 tracking-[-1px]">
              Train your way.
            </Txt>
            <Txt className="mt-3 text-sm leading-6 text-muted">
              Create exercises with your own equipment, muscle labels, instructions and tracking
              type. Save as many as you need and use them in routines and workouts.
            </Txt>
            <Txt className="mt-3 text-[11px] leading-5 text-muted">
              Your exercises are private to your account. Existing custom exercises remain available
              after Pro ends.
            </Txt>
          </GlassCard>
          <TextInput
            accessibilityLabel="Search your custom exercises"
            value={search}
            onChangeText={setSearch}
            maxLength={120}
            placeholder="Search your exercises…"
            placeholderTextColor={PRO.muted}
            className="my-5 min-h-14 rounded-2xl bg-white/5 px-4 font-poppins-regular text-sm text-ink"
          />
          <View className="mb-5 flex-row gap-2">
            <ProPill label="Active" selected={!archived} onPress={() => setArchived(false)} />
            <ProPill label="Archived" selected={archived} onPress={() => setArchived(true)} />
          </View>
          {loading && <ActivityIndicator color={PRO.accent} className="my-6" />}
          {!!error && (
            <ProAction
              title="Try again"
              subtitle={error}
              icon="refresh"
              onPress={() => void refresh()}
            />
          )}
          {!loading && !error && !visible.length && (
            <GlassCard>
              <Txt className="text-sm leading-6 text-muted">
                {search
                  ? "No matching custom exercises."
                  : archived
                    ? "No archived exercises."
                    : "Your library starts with your first custom exercise."}
              </Txt>
            </GlassCard>
          )}
          <View className="gap-3">
            {visible.map((exercise) => (
              <GlassCard key={exercise.id}>
                <Txt weight="medium" className="text-xl">
                  {exercise.name}
                </Txt>
                <Txt className="mt-2 text-xs leading-5 text-muted">
                  {tracking[exercise.trackingType]} ·{" "}
                  {exercise.primaryMuscles.map(pretty).join(", ")}
                </Txt>
                <View className="mt-4 flex-row gap-2">
                  <ProPill
                    label="Edit"
                    selected={false}
                    disabled={busy || !tax}
                    onPress={() => edit(exercise)}
                  />
                  <ProPill
                    label={exercise.status === "archived" ? "Restore" : "Archive"}
                    selected={false}
                    disabled={busy}
                    onPress={() => archive(exercise)}
                  />
                </View>
              </GlassCard>
            ))}
          </View>
          <View className="mt-6">
            <ProAction
              title="Build a routine"
              subtitle="Use public and private exercises together"
              icon="playlist-plus"
              onPress={() => router.push("/workout/create")}
            />
          </View>
        </ScrollView>
      </ScreenEntrance>
      {draft && tax && (
        <Sheet
          title={editing ? "Edit your exercise" : "Create an exercise"}
          subtitle="Private to your FitSync account"
          onClose={() => {
            if (!busy) setDraft(null);
          }}
          busy={busy}
        >
          <Txt className="mb-2 text-xs text-muted">Exercise name</Txt>
          <TextInput
            accessibilityLabel="Custom exercise name"
            editable={!busy}
            maxLength={120}
            value={draft.name}
            onChangeText={(v) => change("name", v)}
            placeholder="e.g. My cable lateral raise"
            placeholderTextColor={PRO.muted}
            className="min-h-14 rounded-2xl bg-white/5 px-4 font-poppins-medium text-base text-ink"
          />
          <ProSection title="How you track it" />
          <View className="flex-row flex-wrap gap-2">
            {(Object.keys(tracking) as Exercise["trackingType"][]).map((key) => (
              <ProPill
                key={key}
                label={tracking[key]}
                selected={draft.trackingType === key}
                disabled={busy}
                onPress={() => change("trackingType", key)}
              />
            ))}
          </View>
          <Txt className="mt-2 text-[11px] leading-5 text-muted">
            Use external weight for resistance, not assistance or total body weight. Tracking type
            is fixed after an exercise is used. Create another exercise to track a different kind of
            movement.
          </Txt>
          <ProSection title="Primary muscles" />
          <View className="flex-row flex-wrap gap-2">
            {tax.muscleGroups.map((m) => (
              <ProPill
                key={m.code}
                label={m.label}
                selected={draft.primaryMuscles.includes(m.code)}
                disabled={busy}
                onPress={() => toggle("primaryMuscles", m.code)}
              />
            ))}
          </View>
          <ProSection title="Supporting muscles" />
          <View className="flex-row flex-wrap gap-2">
            {tax.muscleGroups
              .filter((m) => !draft.primaryMuscles.includes(m.code))
              .map((m) => (
                <ProPill
                  key={m.code}
                  label={m.label}
                  selected={draft.secondaryMuscles.includes(m.code)}
                  disabled={busy}
                  onPress={() => toggle("secondaryMuscles", m.code)}
                />
              ))}
          </View>
          <ProSection title="Equipment" />
          <View className="flex-row flex-wrap gap-2">
            {tax.equipmentTypes.map((m) => (
              <ProPill
                key={m.code}
                label={m.label}
                selected={draft.equipment.includes(m.code)}
                disabled={busy}
                onPress={() => toggle("equipment", m.code)}
              />
            ))}
          </View>
          <ProSection title="Classification" />
          <View className="flex-row flex-wrap gap-2">
            {tax.categories.map((c) => (
              <ProPill
                key={c.code}
                label={c.label}
                selected={draft.category === c.code}
                disabled={busy}
                onPress={() =>
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          category: c.code,
                          activityType:
                            tax.activityTypes.find((a) => a.category === c.code)?.code ?? "",
                        }
                      : d,
                  )
                }
              />
            ))}
          </View>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {tax.activityTypes
              .filter((a) => a.category === draft.category)
              .map((a) => (
                <ProPill
                  key={a.code}
                  label={a.label}
                  selected={draft.activityType === a.code}
                  disabled={busy}
                  onPress={() => change("activityType", a.code)}
                />
              ))}
          </View>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {tax.bodyRegions.map((r) => (
              <ProPill
                key={r.code}
                label={r.label}
                selected={draft.bodyRegion === r.code}
                disabled={busy}
                onPress={() => change("bodyRegion", r.code)}
              />
            ))}
          </View>
          <ProSection title="Movement pattern" />
          <View className="flex-row flex-wrap gap-2">
            {(
              [
                "push",
                "pull",
                "squat",
                "hinge",
                "lunge",
                "carry",
                "rotation",
                "locomotion",
                "mobility",
                "stillness",
                "other",
              ] as const
            ).map((p) => (
              <ProPill
                key={p}
                label={pretty(p)}
                selected={draft.movementPattern === p}
                disabled={busy}
                onPress={() => change("movementPattern", p)}
              />
            ))}
          </View>
          <ProSection title="Difficulty" />
          <View className="flex-row flex-wrap gap-2">
            {(["beginner", "intermediate", "advanced"] as const).map((v) => (
              <ProPill
                key={v}
                label={pretty(v)}
                selected={draft.difficulty === v}
                disabled={busy}
                onPress={() => change("difficulty", v)}
              />
            ))}
          </View>
          <ProSection title="Instructions" description="One clear step per line." />
          <TextInput
            accessibilityLabel="Custom exercise instructions"
            editable={!busy}
            value={instructions}
            onChangeText={setInstructions}
            multiline
            maxLength={15000}
            placeholder="Set up your equipment…"
            placeholderTextColor={PRO.muted}
            className="min-h-32 rounded-2xl bg-white/5 px-4 py-4 font-poppins-regular text-sm text-ink"
          />
          <ProSection title="Notes" />
          <TextInput
            accessibilityLabel="Custom exercise notes"
            editable={!busy}
            value={draft.description}
            onChangeText={(v) => change("description", v)}
            multiline
            maxLength={2000}
            placeholder="Setup details or cues"
            placeholderTextColor={PRO.muted}
            className="min-h-24 rounded-2xl bg-white/5 px-4 py-4 font-poppins-regular text-sm text-ink"
          />
          {!!saveError && (
            <Txt accessibilityRole="alert" className="my-4 text-sm leading-6 text-red-300">
              {saveError}
            </Txt>
          )}
          <View className="mt-6">
            <ProButton title="Save exercise" onPress={() => void save()} loading={busy} />
          </View>
        </Sheet>
      )}
    </ProScene>
  );
}
