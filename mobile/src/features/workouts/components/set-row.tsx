import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, TextInput, View } from "react-native";
import { useExperience } from "@/src/features/experience/experience-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { C } from "@/src/constants/theme";
import { useAppAlert } from "@/src/components/app-dialog";
import { Txt } from "@/src/components/ui";
import { type WorkoutSet, type workoutApi } from "../api";
import { useWorkout } from "../workout-context";
import { NumberEntry, WorkoutDrawer } from "./workout-controls";
import { SetTypePicker } from "./set-type-picker";
import { setAppearance } from "../set-types";
import { validTempo } from "../routine-draft";
import type { WorkingSetSuggestion } from "../../pro/companion-insights";

type Patch = Parameters<typeof workoutApi.updateSet>[2];
export const SetRow = React.memo(function SetRow({
  set,
  number,
  restSeconds,
  trackingType = "reps_weight",
  onFocus,
  exerciseId,
  isNext = false,
  suppressRest = false,
  recommendation,
  previousDate,
}: {
  exerciseId: string;
  set: WorkoutSet;
  number: number;
  restSeconds: number;
  trackingType?: string;
  onFocus?: (exerciseId: string) => void;
  isNext?: boolean;
  suppressRest?: boolean;
  recommendation?: WorkingSetSuggestion;
  previousDate?: string | null;
}) {
  const { updateSet, removeSet, startRest, busy, pendingSetIds = [] } = useWorkout();
  const creating = pendingSetIds.includes(set.id);
  const Alert = useAppAlert();
  const { feedback } = useExperience();
  const [weight, setWeight] = useState(
    set.weight_kg == null ? (trackingType === "reps" ? "0" : "") : String(set.weight_kg),
  );
  const [reps, setReps] = useState(set.reps == null ? "" : String(set.reps));
  const [duration, setDuration] = useState(
    set.duration_seconds == null ? "" : String(set.duration_seconds),
  );
  const [distance, setDistance] = useState(
    set.distance_meters == null ? "" : String(set.distance_meters),
  );
  const [type, setType] = useState(set.set_type ?? "normal");
  const [notes, setNotes] = useState(set.notes ?? "");
  const [rpe, setRpe] = useState(set.rpe?.toString() ?? "");
  const [rir, setRir] = useState(set.rir?.toString() ?? "");
  const [rest, setRest] = useState(set.rest_seconds == null ? "" : String(set.rest_seconds));
  const [completed, setCompleted] = useState(Boolean(set.completed_at));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [drawer, setDrawer] = useState<"details" | null>(null);
  const [tempo, setTempo] = useState(set.tempo ?? "");
  const [showWhy, setShowWhy] = useState(false);
  const inFlight = useRef(false);
  const dirtyFields = useRef(new Set<string>());
  const inputVersions = useRef<Record<string, number>>({});
  useEffect(() => {
    if (!dirtyFields.current.has("weightKg"))
      setWeight(
        set.weight_kg == null ? (trackingType === "reps" ? "0" : "") : String(set.weight_kg),
      );
  }, [set.weight_kg, trackingType]);
  useEffect(() => {
    if (!dirtyFields.current.has("reps")) setReps(set.reps == null ? "" : String(set.reps));
  }, [set.reps]);
  useEffect(() => {
    if (!dirtyFields.current.has("durationSeconds"))
      setDuration(set.duration_seconds == null ? "" : String(set.duration_seconds));
  }, [set.duration_seconds]);
  useEffect(() => {
    if (!dirtyFields.current.has("distanceMeters"))
      setDistance(set.distance_meters == null ? "" : String(set.distance_meters));
  }, [set.distance_meters]);
  useEffect(() => {
    setCompleted(!!set.completed_at);
  }, [set.completed_at]);
  useEffect(() => {
    setType(set.set_type ?? "normal");
  }, [set.set_type]);
  useEffect(() => {
    if (!drawer) {
      setNotes(set.notes ?? "");
      setRpe(set.rpe?.toString() ?? "");
      setRir(set.rir?.toString() ?? "");
      setRest(set.rest_seconds == null ? "" : String(set.rest_seconds));
      setTempo(set.tempo ?? "");
    }
  }, [drawer, set.notes, set.rpe, set.rir, set.rest_seconds, set.tempo, restSeconds]);
  const timed = trackingType === "duration" || trackingType === "distance_duration";
  const weighted = !timed;
  const configuredRest = rest.trim() === "" ? restSeconds : Number(rest);
  const focus = () => onFocus?.(exerciseId);
  async function save(patch: Patch, toggle = false) {
    if (inFlight.current || busy || creating) return;
    onFocus?.(exerciseId);
    setError("");
    inFlight.current = true;
    setSaving(true);
    const before = completed;
    if (toggle) {
      setCompleted(!before);
    }
    try {
      await updateSet(set.id, patch);
      if (toggle && !before) feedback("set");
      if (toggle && !before && configuredRest > 0 && !suppressRest) startRest(configuredRest);
    } catch (e) {
      if (toggle) setCompleted(before);
      setError(e instanceof Error ? e.message : "Not saved. Try again.");
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }
  const validNumber = (value: string, max: number, integer = false) =>
    value.trim() !== "" &&
    Number.isFinite(Number(value)) &&
    Number(value) >= 0 &&
    Number(value) <= max &&
    (!integer || Number.isInteger(Number(value)));
  function persistMetric(
    key: "weightKg" | "reps" | "durationSeconds" | "distanceMeters",
    value: string,
    max: number,
    integer = false,
  ) {
    dirtyFields.current.add(key);
    const version = (inputVersions.current[key] ?? 0) + 1;
    inputVersions.current[key] = version;
    const normalized = value.replace(",", ".");
    if (normalized !== "" && !validNumber(normalized, max, integer)) {
      setError("Enter a valid number. This value has not been saved.");
      return;
    }
    setError("");
    void updateSet(set.id, { [key]: normalized.trim() === "" ? null : Number(normalized) })
      .then(() => {
        if (inputVersions.current[key] === version) dirtyFields.current.delete(key);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not save this value."));
  }
  function metrics(): Patch | null {
    if (
      (weighted && !(trackingType === "reps" && !weight.trim()) && !validNumber(weight, 100000)) ||
      (!timed && (!validNumber(reps, 1000, true) || Number(reps) === 0)) ||
      (timed && (!validNumber(duration, 86400, true) || Number(duration) === 0)) ||
      (trackingType === "distance_duration" &&
        distance.trim() !== "" &&
        !validNumber(distance, 1000000))
    ) {
      setError(
        "Enter your weight and positive reps, or a duration greater than zero, before logging.",
      );
      return null;
    }
    return {
      ...(weighted ? { weightKg: Number(weight) } : {}),
      ...(!timed ? { reps: Number(reps) } : { durationSeconds: Number(duration) }),
      ...(trackingType === "distance_duration"
        ? { distanceMeters: distance.trim() ? Number(distance) : null }
        : {}),
    };
  }
  const appearance = setAppearance(type);
  return (
    <View
      className={`mb-2 rounded-2xl border bg-black/15 px-2 pt-2 ${completed ? "border-[#94DBB2]/50" : isNext ? "border-[#ADC7F0]/60" : "border-transparent"}`}
    >
      <View className="flex-row items-end gap-2">
        <SetTypePicker
          table
          value={type}
          number={number}
          disabled={saving || busy || creating}
          onChange={async (next) => {
            if (inFlight.current || busy || creating) return;
            focus();
            const previous = type;
            setType(next);
            inFlight.current = true;
            setSaving(true);
            setError("");
            try {
              await updateSet(set.id, { setType: next });
            } catch (e) {
              setType(previous);
              setError(e instanceof Error ? e.message : "Could not save set type.");
            } finally {
              inFlight.current = false;
              setSaving(false);
            }
          }}
        />
        {weighted && (
          <NumberEntry
            compact
            showStepper={false}
            showLabel={false}
            allowDrag={false}
            onFocus={focus}
            label={`Set ${number}, ${trackingType === "reps" ? "added weight" : "weight"} in kg`}
            value={weight}
            onChange={(value) => {
              const next = value.replace(",", ".");
              setWeight(next);
              persistMetric("weightKg", next, 100000);
            }}
            step={0.5}
            max={100000}
            disabled={saving || busy || creating || completed}
          />
        )}
        {!timed && (
          <NumberEntry
            compact
            showStepper={false}
            showLabel={false}
            allowDrag={false}
            onFocus={focus}
            label={`Set ${number}, reps`}
            value={reps}
            onChange={(value) => {
              setReps(value);
              persistMetric("reps", value, 1000, true);
            }}
            disabled={saving || busy || creating || completed}
          />
        )}
        {timed && (
          <NumberEntry
            compact
            showStepper={false}
            showLabel={false}
            allowDrag={false}
            onFocus={focus}
            label={`Set ${number}, duration in seconds`}
            value={duration}
            onChange={(value) => {
              setDuration(value);
              persistMetric("durationSeconds", value, 86400, true);
            }}
            max={86400}
            disabled={saving || busy || creating || completed}
          />
        )}
        {trackingType === "distance_duration" && (
          <NumberEntry
            compact
            showStepper={false}
            showLabel={false}
            allowDrag={false}
            onFocus={focus}
            label={`Set ${number}, distance in meters, optional`}
            step={0.1}
            value={distance}
            onChange={(value) => {
              const next = value.replace(",", ".");
              setDistance(next);
              persistMetric("distanceMeters", next, 1000000);
            }}
            max={1000000}
            disabled={saving || busy || creating || completed}
          />
        )}
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{
            checked: completed,
            disabled: saving || busy || creating,
            busy: saving,
          }}
          accessibilityLabel={completed ? `Undo completed set ${number}` : `Log set ${number}`}
          disabled={saving || busy || creating}
          onPress={() => {
            if (completed) {
              void save({ completed: false }, true);
              return;
            }
            const values = metrics();
            if (values) void save({ ...values, setType: type, completed: !completed }, true);
          }}
          className={`h-12 w-12 items-center justify-center rounded-xl ${completed ? "bg-white/10" : "bg-transparent"} ${saving || busy || creating ? "opacity-60" : ""}`}
        >
          {saving ? (
            <ActivityIndicator size="small" color={C.ink} />
          ) : (
            <MaterialCommunityIcons
              name={completed ? "check-circle" : "circle-outline"}
              size={25}
              color={completed ? "#BFECD0" : C.muted}
            />
          )}
        </Pressable>
      </View>
      {recommendation && type === "normal" && (
        <View className="mx-1 mt-2 rounded-xl bg-white/5 p-3">
          <Txt className="text-[10px] text-muted">
            Previous{previousDate ? ` · ${previousDate}` : ""}:{" "}
            {recommendation.previous.weightKg !== null
              ? `${recommendation.previous.weightKg} kg × `
              : ""}
            {recommendation.previous.reps ?? recommendation.previous.durationSeconds ?? "—"}
            {timed ? "s" : " reps"}
          </Txt>
          <Txt className="mt-1 text-[11px]">
            Suggested:{" "}
            {recommendation.suggested.weightKg !== null && !timed
              ? `${recommendation.suggested.weightKg} kg × `
              : ""}
            {recommendation.suggested.reps ?? recommendation.suggested.durationSeconds ?? "—"}
            {timed ? "s" : " reps"}
          </Txt>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showWhy }}
            onPress={() => setShowWhy(!showWhy)}
            className="min-h-11 justify-center"
          >
            <Txt className="text-[11px] text-[#D4F89A]">Why this target? {showWhy ? "−" : "+"}</Txt>
          </Pressable>
          {showWhy && (
            <Txt className="mb-2 text-[10px] leading-4 text-muted">
              {recommendation.reason} Optional guidance from recorded history; adjust to
              today&apos;s technique and effort.
            </Txt>
          )}
          {!completed &&
            ((!weight.trim() && recommendation.suggested.weightKg !== null && weighted) ||
              (!reps.trim() && recommendation.suggested.reps !== null && !timed) ||
              (!duration.trim() && recommendation.suggested.durationSeconds !== null && timed)) && (
              <Pressable
                disabled={saving || busy || creating}
                accessibilityRole="button"
                onPress={() => {
                  const patch: Patch = {};
                  if (!weight.trim() && recommendation.suggested.weightKg !== null && weighted)
                    patch.weightKg = recommendation.suggested.weightKg;
                  if (!reps.trim() && recommendation.suggested.reps !== null && !timed)
                    patch.reps = recommendation.suggested.reps;
                  if (
                    !duration.trim() &&
                    recommendation.suggested.durationSeconds !== null &&
                    timed
                  )
                    patch.durationSeconds = recommendation.suggested.durationSeconds;
                  void save(patch);
                }}
                className="min-h-11 justify-center"
              >
                <Txt className="text-[11px] text-[#D4F89A]">Fill empty fields</Txt>
              </Pressable>
            )}
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          focus();
          setDrawer("details");
        }}
        disabled={saving || busy || creating}
        accessibilityLabel={`Edit rest, notes and effort for set ${number}`}
        className="min-h-11 flex-row items-center gap-1.5 px-1"
      >
        <MaterialCommunityIcons name="timer-outline" size={14} color={C.muted} />
        <Txt className="text-[10px] text-muted">
          {suppressRest
            ? "Rest after round"
            : configuredRest
              ? `${configuredRest}s rest`
              : "No rest"}
          {set.tempo ? ` · ${set.tempo}` : ""}
        </Txt>
        <MaterialCommunityIcons
          name={set.notes ? "note-text" : "note-text-outline"}
          size={14}
          color={set.notes ? appearance.color : C.muted}
        />
        <Txt className="flex-1 text-[10px] text-muted" numberOfLines={1}>
          {set.notes ||
            [set.rpe != null ? `RPE ${set.rpe}` : "", set.rir != null ? `RIR ${set.rir}` : ""]
              .filter(Boolean)
              .join(" · ") ||
            "Set options"}
        </Txt>
        <Txt className={`text-[10px] ${completed ? "text-[#BFECD0]" : "text-muted"}`}>
          {creating ? "Adding…" : saving ? "Saving…" : completed ? "Logged" : isNext ? "Next" : ""}
        </Txt>
        <MaterialCommunityIcons name="chevron-down" size={14} color={C.muted} />
      </Pressable>
      {!!error && (
        <Txt accessibilityRole="alert" className="mt-1 text-xs text-red-300">
          {error} Your input is kept; try again.
        </Txt>
      )}
      {drawer === "details" && (
        <WorkoutDrawer
          title={`Set ${number} · notes & recovery`}
          onClose={() => {
            if (!saving) setDrawer(null);
          }}
        >
          <Txt className="mb-2 text-muted">Rest after this set · synced with your workout</Txt>
          <NumberEntry
            onFocus={focus}
            label="Rest override · seconds (blank = default, 0 = off)"
            value={rest}
            onChange={setRest}
            max={900}
          />
          <Txt className="mb-2 mt-5 text-xs text-muted">
            Tempo · lowering / pause / lifting / pause (optional)
          </Txt>
          <TextInput
            value={tempo}
            onChangeText={setTempo}
            autoCapitalize="characters"
            maxLength={7}
            placeholder="3-1-X-0"
            placeholderTextColor={C.muted}
            accessibilityLabel="Set tempo"
            className="font-poppins-regular rounded-xl bg-bg p-4 text-ink"
          />
          <Txt className="mt-2 text-[10px] leading-4 text-muted">
            Each number is seconds; X means an intended explosive movement. Log rest-pause mini-sets
            separately with a short rest.
          </Txt>
          <Txt className="mb-2 mt-5 text-muted">Set notes</Txt>
          <TextInput
            maxLength={1000}
            placeholder="Technique, discomfort, equipment…"
            placeholderTextColor={C.muted}
            value={notes}
            onChangeText={setNotes}
            className="font-poppins-regular min-h-[90px] rounded-xl bg-bg p-4 text-ink"
          />
          <View className="mt-5 flex-row gap-3">
            <View className="flex-1">
              <Txt className="mb-2 text-xs text-muted">RPE · effort 1–10 (optional)</Txt>
              <TextInput
                keyboardType="decimal-pad"
                value={rpe}
                onChangeText={setRpe}
                placeholder="—"
                placeholderTextColor={C.muted}
                className="font-poppins-regular rounded-xl bg-bg p-4 text-ink"
              />
            </View>
            <View className="flex-1">
              <Txt className="mb-2 text-xs text-muted">RIR · reps left 0–10</Txt>
              <TextInput
                keyboardType="number-pad"
                value={rir}
                onChangeText={setRir}
                placeholder="—"
                placeholderTextColor={C.muted}
                className="font-poppins-regular rounded-xl bg-bg p-4 text-ink"
              />
            </View>
          </View>
          {!!error && <Txt className="mt-3 text-red-300">{error}</Txt>}
          <Pressable
            disabled={saving || busy || creating}
            onPress={async () => {
              if (inFlight.current || busy || creating) return;
              if (
                (rest.trim() !== "" && !validNumber(rest, 900, true)) ||
                (rpe !== "" && (!validNumber(rpe, 10) || Number(rpe) < 1)) ||
                (rir !== "" && !validNumber(rir, 10, true))
              ) {
                setError("Rest must be 0–900 seconds, RPE 1–10, and RIR a whole number from 0–10.");
                return;
              }
              inFlight.current = true;
              setSaving(true);
              setError("");
              try {
                const checkedTempo = tempo.trim() ? validTempo(tempo) : null;
                await updateSet(set.id, {
                  notes,
                  rpe: rpe === "" ? null : Number(rpe),
                  rir: rir === "" ? null : Number(rir),
                  restSeconds: rest.trim() === "" ? null : Number(rest),
                  tempo: checkedTempo,
                });
                setDrawer(null);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not save details.");
              } finally {
                inFlight.current = false;
                setSaving(false);
              }
            }}
            className="mt-6 items-center rounded-2xl bg-ink p-4"
          >
            <Txt weight="semibold" className="text-bg">
              {saving ? "Saving…" : "Save set details"}
            </Txt>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove set ${number}`}
            disabled={saving || busy || creating}
            onPress={() => {
              Alert.alert(
                "Remove set?",
                completed
                  ? "This removes the set and its logged performance from this workout."
                  : "This removes the set from this workout.",
                [
                  { text: "Keep set", style: "cancel" },
                  {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                      setSaving(true);
                      try {
                        await removeSet(set.id);
                        setDrawer(null);
                      } catch (e) {
                        setError(e instanceof Error ? e.message : "Could not remove set.");
                      } finally {
                        setSaving(false);
                      }
                    },
                  },
                ],
              );
            }}
            className="mt-3 min-h-12 items-center justify-center"
          >
            <Txt className="text-sm" style={{ color: "#F87171" }}>
              Remove set
            </Txt>
          </Pressable>
        </WorkoutDrawer>
      )}
    </View>
  );
});
