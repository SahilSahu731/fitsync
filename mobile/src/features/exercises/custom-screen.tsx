import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Line, Rect } from "react-native-svg";
import { useSession } from "@/src/context/session";
import { MotionPressable as Pressable, ScreenEntrance } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { useAppAlert } from "@/src/components/app-dialog";
import { useBilling } from "../billing/billing-context";
import { useWorkout } from "../workouts/workout-context";
import { ProAction, ProButton, ProPill, ProScene } from "../pro/hub-ui";
import { AnatomicalBody } from "../pro/anatomical-body";
import { Sheet } from "../progress/editors";
import { getTaxonomies, pretty, type Exercise, type ExerciseTaxonomies } from "./api";
import { customExerciseApi, type CustomExerciseInput } from "./custom-api";
import { clearPickerCache } from "./picker-cache";
import { matchesExercise } from "./picker-search";
import { CustomExerciseEditor, TRACKING } from "./custom-editor";

function LibraryArt() {
  return (
    <Svg width={96} height={96} viewBox="0 0 100 100" accessible={false}>
      <Rect
        x={25}
        y={12}
        width={61}
        height={74}
        rx={15}
        fill="#FFFFFF04"
        stroke="#FFFFFF15"
        transform="rotate(10 55 50)"
      />
      <Rect
        x={14}
        y={18}
        width={61}
        height={74}
        rx={15}
        fill="#191919"
        stroke="#FFFFFF40"
        transform="rotate(-9 45 55)"
      />
      <Line
        x1={26}
        y1={53}
        x2={64}
        y2={47}
        stroke="#FFFFFF"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <Rect
        x={26}
        y={40}
        width={8}
        height={24}
        rx={3}
        fill="#FFFFFF"
        transform="rotate(-9 30 52)"
      />
      <Rect
        x={56}
        y={35}
        width={8}
        height={24}
        rx={3}
        fill="#FFFFFF"
        transform="rotate(-9 60 47)"
      />
      <Line
        x1={27}
        y1={73}
        x2={60}
        y2={68}
        stroke="#FFFFFF30"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}
export function CustomExercisesScreen() {
  const { user } = useSession();
  return <CustomLibrary key={user?.id ?? "signed-out"} ownerId={user?.id ?? ""} />;
}
function CustomLibrary({ ownerId }: { ownerId: string }) {
  const billing = useBilling(),
    workout = useWorkout();
  const { alert } = useAppAlert();
  const api = useMemo(() => customExerciseApi(ownerId), [ownerId]);
  const [items, setItems] = useState<Exercise[]>([]),
    [tax, setTax] = useState<ExerciseTaxonomies | null>(null);
  const [loading, setLoading] = useState(!!ownerId),
    [error, setError] = useState("");
  const [search, setSearch] = useState(""),
    [archived, setArchived] = useState(false);
  const [editor, setEditor] = useState<Exercise | "new" | null>(null),
    [detail, setDetail] = useState<Exercise | null>(null);
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const locked = useRef(false),
    alive = useRef(true),
    sequence = useRef(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      sequence.current++;
    };
  }, []);
  const refresh = useCallback(async () => {
    if (!ownerId) {
      setLoading(false);
      return;
    }
    const request = ++sequence.current;
    setLoading(true);
    setError("");
    const results = await Promise.allSettled([api.list(), getTaxonomies()]);
    if (!alive.current || sequence.current !== request) return;
    if (results[0].status === "fulfilled") setItems(results[0].value);
    else
      setError(
        results[0].reason instanceof Error
          ? results[0].reason.message
          : "Could not open your exercise library.",
      );
    if (results[1].status === "fulfilled") setTax(results[1].value);
    else
      setError(
        (current) =>
          current ||
          "Exercise choices could not load. Retry before creating or editing a movement.",
      );
    setLoading(false);
  }, [api, ownerId]);
  useFocusEffect(
    useCallback(() => {
      void refresh();
      return () => {
        sequence.current++;
      };
    }, [refresh]),
  );
  const edit = (exercise?: Exercise) => {
    if (!ownerId) {
      router.push("/(auth)/sign-in");
      return;
    }
    if (!billing.isPro) {
      router.push("/membership");
      return;
    }
    setDetail(null);
    setEditor(exercise ?? "new");
  };
  async function save(input: CustomExerciseInput) {
    if (!billing.isPro) throw new Error("Pro is required to create or edit custom exercises.");
    if (locked.current || !alive.current)
      throw new Error("Another library change is still saving.");
    locked.current = true;
    setBusy(true);
    try {
      const saved = await api.save(input, editor && editor !== "new" ? editor.id : undefined);
      if (!alive.current) throw new Error("Your account changed. Reopen your library.");
      setItems((rows) => [...rows.filter((row) => row.id !== saved.id), saved]);
      clearPickerCache();
      setNotice("Exercise saved. Find it in My exercises when adding to a workout or routine.");
      await refresh();
    } finally {
      locked.current = false;
      if (alive.current) setBusy(false);
    }
  }
  function archive(exercise: Exercise) {
    const restore = exercise.status === "archived";
    alert(
      restore ? "Restore this movement?" : "Archive this movement?",
      restore
        ? "It will return to My exercises and your workout picker."
        : "It will leave the exercise picker. Your completed workout history stays saved. You can restore it here.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: restore ? "Restore" : "Archive",
          style: restore ? "default" : "destructive",
          onPress: async () => {
            if (locked.current || !alive.current) return;
            locked.current = true;
            setBusy(true);
            setError("");
            try {
              await (restore ? api.restore(exercise.id) : api.archive(exercise.id));
              clearPickerCache();
              if (alive.current) {
                setDetail(null);
                setNotice(
                  restore
                    ? "Exercise restored to your picker."
                    : "Exercise archived. Your workout history is kept.",
                );
                await refresh();
              }
            } catch (e) {
              if (alive.current)
                setError(e instanceof Error ? e.message : "Could not update your exercise.");
            } finally {
              locked.current = false;
              if (alive.current) setBusy(false);
            }
          },
        },
      ],
    );
  }
  const active = items.filter((item) => item.status !== "archived"),
    retired = items.filter((item) => item.status === "archived");
  const visible = (archived ? retired : active).filter((item) => matchesExercise(item, search));
  const alreadyAdded = detail
    ? workout.session?.workout_session_exercises.some((item) => item.exercise_id === detail.id)
    : false;
  async function addToWorkout() {
    if (!detail || !workout.session || locked.current) return;
    if (alreadyAdded) {
      setDetail(null);
      router.push("/workout");
      return;
    }
    if (workout.session.workout_session_exercises.length >= 50) {
      setError("Your workout already has 50 exercises. Remove one before adding another.");
      return;
    }
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await workout.addExercises([detail.id]);
      if (alive.current) {
        setDetail(null);
        router.push("/workout");
      }
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : "Could not add your exercise. Try again.");
    } finally {
      locked.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const browse = () => router.push({ pathname: "/explore/exercises", params: { scope: "custom" } });
  return (
    <ProScene>
      <ScreenEntrance className="flex-1">
        <View className="flex-row items-center gap-3 px-5 pb-3 pt-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/pro"))}
            className="h-11 w-11 items-center justify-center rounded-full bg-white/5"
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color="#FFFFFF" />
          </Pressable>
          <View className="min-w-0 flex-1">
            <Txt weight="medium" className="text-lg tracking-[-0.5px]">
              Custom exercises
            </Txt>
            <Txt className="mt-1 text-[10px] text-muted">Made by you. Ready to train.</Txt>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create custom exercise"
            disabled={loading || !tax || busy || billing.loading}
            onPress={() => edit()}
            className="h-11 w-11 items-center justify-center rounded-full bg-white"
            style={{ opacity: loading || !tax || busy ? 0.4 : 1 }}
          >
            <MaterialCommunityIcons name="plus" size={23} color="#000000" />
          </Pressable>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="w-full max-w-2xl self-center px-5 pb-36 pt-3"
          refreshControl={
            <RefreshControl
              refreshing={loading && items.length > 0}
              onRefresh={() => void refresh()}
              tintColor="#FFFFFF"
            />
          }
        >
          <View className="rounded-[28px] border border-white/10 bg-[#141414] p-5">
            <View className="flex-row items-center gap-2">
              <View className="min-w-0 flex-1">
                <Txt className="text-[9px] tracking-[1.5px] text-muted">YOUR MOVEMENT LIBRARY</Txt>
                <Txt weight="medium" className="mt-3 text-[27px] leading-9 tracking-[-0.8px]">
                  Your moves.{"\n"}Your way.
                </Txt>
              </View>
              <LibraryArt />
            </View>
            <View className="mt-5 flex-row gap-5 border-t border-white/10 pt-4">
              {[
                { label: "Active", value: active.length },
                { label: "Archived", value: retired.length },
                {
                  label: "Tracking types",
                  value: new Set(active.map((item) => item.trackingType)).size,
                },
              ].map((stat) => (
                <View key={stat.label} className="min-w-0 flex-1">
                  <Txt weight="medium" className="text-2xl">
                    {loading && !items.length ? "—" : stat.value}
                  </Txt>
                  <Txt className="mt-1 text-[10px] text-muted">{stat.label}</Txt>
                </View>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Browse my exercises"
              onPress={browse}
              className="mt-4 min-h-11 flex-row items-center justify-between gap-3"
            >
              <Txt className="text-xs text-muted">Find them in the exercise catalog</Txt>
              <MaterialCommunityIcons name="arrow-right" size={19} color="#FFFFFF" />
            </Pressable>
          </View>
          {!ownerId && (
            <View className="mt-5">
              <ProButton
                title="Sign in to open your library"
                onPress={() => router.push("/(auth)/sign-in")}
              />
            </View>
          )}
          <View className="mb-4 mt-5 flex-row items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-4">
            <MaterialCommunityIcons name="magnify" size={21} color="#777777" />
            <TextInput
              accessibilityLabel="Search your custom exercises"
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              maxLength={120}
              placeholder="Search movement, muscle, equipment"
              placeholderTextColor="#666666"
              className="min-h-14 min-w-0 flex-1 font-poppins-regular text-xs text-white"
            />
            {!!search && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear custom exercise search"
                onPress={() => setSearch("")}
                className="h-11 w-9 items-center justify-center"
              >
                <MaterialCommunityIcons name="close-circle" size={20} color="#777777" />
              </Pressable>
            )}
          </View>
          <View className="mb-5 flex-row gap-2">
            <ProPill
              label={`Active · ${active.length}`}
              selected={!archived}
              onPress={() => setArchived(false)}
            />
            <ProPill
              label={`Archived · ${retired.length}`}
              selected={archived}
              onPress={() => setArchived(true)}
            />
          </View>
          {!!notice && (
            <Txt accessibilityLiveRegion="polite" className="mb-4 text-xs leading-5 text-muted">
              {notice}
            </Txt>
          )}
          {!!error && (
            <View className="mb-4">
              <ProAction
                title="Library needs attention"
                subtitle={error}
                icon="refresh"
                onPress={() => void refresh()}
              />
            </View>
          )}
          {loading && !items.length && <ActivityIndicator color="#FFFFFF" className="my-8" />}
          {!loading && !error && !visible.length && ownerId && (
            <View className="items-center rounded-[28px] border border-dashed border-white/10 px-6 py-8">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-white/5">
                <MaterialCommunityIcons
                  name={archived ? "archive-outline" : search ? "magnify" : "dumbbell"}
                  size={29}
                  color="#FFFFFF"
                />
              </View>
              <Txt weight="medium" className="text-center text-base">
                {search
                  ? "No matching movements."
                  : archived
                    ? "A little room to start fresh."
                    : "Make your first movement."}
              </Txt>
              <Txt className="mb-5 mt-2 text-center text-xs leading-6 text-muted">
                {search
                  ? "Try a name, muscle or piece of equipment."
                  : archived
                    ? "Archived exercises live here. Restore one whenever you need it again."
                    : "A different machine, a personal variation, a movement that works for you."}
              </Txt>
              {!archived && !search && (
                <ProButton
                  title="Create an exercise"
                  onPress={() => edit()}
                  disabled={!tax || billing.loading}
                />
              )}
            </View>
          )}
          <View className="gap-3">
            {visible.map((exercise) => (
              <View
                key={exercise.id}
                className="overflow-hidden rounded-[26px] border border-white/10 bg-[#111111] p-5"
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`View ${exercise.name}`}
                  onPress={() => {
                    setError("");
                    setDetail(exercise);
                  }}
                  className="flex-row items-start gap-3"
                >
                  <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
                    <MaterialCommunityIcons
                      name={TRACKING[exercise.trackingType].icon}
                      size={24}
                      color="#FFFFFF"
                    />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Txt className="mb-1 text-[9px] tracking-[1px] text-muted">
                      {exercise.status === "archived" ? "ARCHIVED" : "CUSTOM MOVEMENT"}
                    </Txt>
                    <Txt weight="medium" className="text-base leading-6">
                      {exercise.name}
                    </Txt>
                    <Txt className="mt-2 text-[11px] leading-5 text-muted">
                      {exercise.primaryMuscles.map(pretty).join(" · ")}
                    </Txt>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    color="#777777"
                    size={19}
                    style={{ marginTop: 4 }}
                  />
                </Pressable>
                <View className="mt-4 flex-row flex-wrap gap-2">
                  <View className="rounded-full border border-white/10 px-3 py-2">
                    <Txt className="text-[10px] text-muted">
                      {TRACKING[exercise.trackingType].label}
                    </Txt>
                  </View>
                  {exercise.equipment.slice(0, 2).map((code) => (
                    <View key={code} className="rounded-full border border-white/10 px-3 py-2">
                      <Txt className="text-[10px] text-muted">{pretty(code)}</Txt>
                    </View>
                  ))}
                </View>
                <View className="mt-4 flex-row items-center gap-2 border-t border-white/5 pt-3">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${exercise.name}`}
                    disabled={busy || !tax}
                    onPress={() => edit(exercise)}
                    className="min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-full bg-white/5"
                  >
                    <MaterialCommunityIcons name="pencil-outline" size={16} color="#FFFFFF" />
                    <Txt className="text-xs">Edit</Txt>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${exercise.status === "archived" ? "Restore" : "Archive"} ${exercise.name}`}
                    disabled={busy}
                    onPress={() => archive(exercise)}
                    className="min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-full bg-white/5"
                  >
                    <MaterialCommunityIcons
                      name={
                        exercise.status === "archived"
                          ? "archive-arrow-up-outline"
                          : "archive-outline"
                      }
                      size={16}
                      color="#A3A3A3"
                    />
                    <Txt className="text-xs text-muted">
                      {exercise.status === "archived" ? "Restore" : "Archive"}
                    </Txt>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
          <Txt className="mt-6 text-[10px] leading-5 text-muted">
            Private to your account. Saved custom exercises stay available after Pro ends; Pro is
            needed to create or edit them.
          </Txt>
        </ScrollView>
      </ScreenEntrance>
      {editor && tax && (
        <CustomExerciseEditor
          exercise={editor === "new" ? undefined : editor}
          tax={tax}
          onSave={save}
          onClose={() => setEditor(null)}
        />
      )}
      {detail && (
        <Sheet
          title={detail.name}
          eyebrow="YOUR CUSTOM MOVEMENT"
          subtitle={TRACKING[detail.trackingType].label}
          busy={busy}
          onClose={() => {
            if (!locked.current) setDetail(null);
          }}
          footer={
            detail.status === "published" ? (
              <ProButton
                title={
                  workout.session
                    ? alreadyAdded
                      ? "Open workout"
                      : "Add to active workout"
                    : "Use in a new routine"
                }
                loading={busy}
                disabled={workout.busy || workout.loading}
                onPress={() => {
                  if (workout.session) void addToWorkout();
                  else {
                    setDetail(null);
                    router.push({ pathname: "/workout/create", params: { exerciseId: detail.id } });
                  }
                }}
              />
            ) : detail.status === "archived" ? (
              <ProButton title="Restore exercise" loading={busy} onPress={() => archive(detail)} />
            ) : (
              <ProButton
                title="Edit exercise"
                onPress={() => edit(detail)}
                disabled={!tax || busy}
              />
            )
          }
        >
          <View className="mb-5 flex-row items-center justify-center rounded-[26px] border border-white/10 bg-black/25 py-4">
            <AnatomicalBody size={90} muscles={detail.primaryMuscles} />
            <AnatomicalBody size={90} back muscles={detail.primaryMuscles} />
          </View>
          <Txt className="text-[10px] text-muted">PRIMARY MUSCLES</Txt>
          <Txt weight="medium" className="mb-5 mt-2 text-sm leading-6">
            {detail.primaryMuscles.map(pretty).join(", ")}
          </Txt>
          {!!detail.secondaryMuscles.length && (
            <>
              <Txt className="text-[10px] text-muted">SUPPORTING MUSCLES</Txt>
              <Txt className="mb-5 mt-2 text-xs leading-6 text-muted">
                {detail.secondaryMuscles.map(pretty).join(", ")}
              </Txt>
            </>
          )}
          {!!detail.description && (
            <Txt className="mb-5 text-xs leading-6 text-muted">{detail.description}</Txt>
          )}
          <Txt weight="medium" className="mb-4 text-base">
            Make every rep yours.
          </Txt>
          {detail.instructions.map((instruction, i) => (
            <View key={i} className="mb-4 flex-row gap-3">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-white/5">
                <Txt className="text-xs">{i + 1}</Txt>
              </View>
              <Txt className="min-w-0 flex-1 text-xs leading-6 text-muted">{instruction}</Txt>
            </View>
          ))}
          {!!detail.breathingTip && (
            <Txt className="mb-5 text-xs leading-6 text-muted">
              Breathing cue · {detail.breathingTip}
            </Txt>
          )}
          {!!error && (
            <Txt accessibilityRole="alert" className="my-4 text-xs leading-5 text-white">
              {error}
            </Txt>
          )}
          {detail.status === "published" && workout.session && (
            <View className="my-3">
              <ProButton
                title="Use in a new routine"
                secondary
                onPress={() => {
                  setDetail(null);
                  router.push({ pathname: "/workout/create", params: { exerciseId: detail.id } });
                }}
              />
            </View>
          )}
          <View className="mt-3">
            <ProButton
              title="Edit exercise"
              secondary
              disabled={!tax || busy}
              onPress={() => edit(detail)}
            />
          </View>
        </Sheet>
      )}
    </ProScene>
  );
}
