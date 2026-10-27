import React, { useEffect, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { C } from "@/src/constants/theme";
import { Txt } from "@/src/components/ui";
import { type WorkoutSet, type workoutApi } from "../api";
import { useWorkout } from "../workout-context";
import { NumberEntry, WorkoutDrawer } from "./workout-controls";
import { SetTypePicker } from "./set-type-picker";
import { setAppearance } from "../set-types";

type Patch = Parameters<typeof workoutApi.updateSet>[2];
export const SetRow = React.memo(function SetRow({
  set,
  number,
  restSeconds,
  trackingType = "reps_weight",
  onFocus,
  exerciseId,
}: {
  exerciseId: string;
  set: WorkoutSet;
  number: number;
  restSeconds: number;
  trackingType?: string;
  onFocus?: (exerciseId: string) => void;
}) {
  const { updateSet, startRest, busy } = useWorkout();
  const [weight, setWeight] = useState(String(set.weight_kg ?? 0));
  const [reps, setReps] = useState(String(set.reps ?? 8));
  const [duration, setDuration] = useState(String(set.duration_seconds ?? 30));
  const [distance, setDistance] = useState(String(set.distance_meters ?? 100));
  const [type, setType] = useState(set.set_type);
  const [notes, setNotes] = useState(set.notes ?? "");
  const [rpe, setRpe] = useState(set.rpe?.toString() ?? "");
  const [rir, setRir] = useState(set.rir?.toString() ?? "");
  const [rest, setRest] = useState(String(restSeconds));
  const [completed, setCompleted] = useState(Boolean(set.completed_at));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [drawer, setDrawer] = useState<"details" | null>(null);
  const inFlight = useRef(false);
  const restKey = `fitsync.set-rest.v1.${set.id}`;
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(restKey)
      .then((value) => {
        if (active && value !== null && Number.isFinite(Number(value)))
          setRest(value);
      })
      .catch(console.warn);
    return () => {
      active = false;
    };
  }, [restKey]);
  const timed =
    trackingType === "duration" || trackingType === "distance_duration";
  const weighted = !timed;
  const focus = () => onFocus?.(exerciseId);
  async function save(patch: Patch, toggle = false) {
    if (inFlight.current || busy) return;
    onFocus?.(exerciseId);
    setError("");
    inFlight.current = true;
    setSaving(true);
    const before = completed;
    if (toggle) {
      setCompleted(!before);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
        () => {},
      );
    }
    try {
      await updateSet(set.id, patch);
      if (toggle && !before && Number(rest) > 0) startRest(Number(rest));
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
  function metrics(): Patch | null {
    if (
      (weighted && !validNumber(weight, 100000)) ||
      (!timed && !validNumber(reps, 1000, true)) ||
      (timed && !validNumber(duration, 86400, true)) ||
      (trackingType === "distance_duration" && !validNumber(distance, 1000000))
    ) {
      setError("Enter valid, non-negative numbers before saving.");
      return null;
    }
    return {
      ...(weighted ? { weightKg: Number(weight) } : {}),
      ...(!timed
        ? { reps: Number(reps) }
        : { durationSeconds: Number(duration) }),
      ...(trackingType === "distance_duration"
        ? { distanceMeters: Number(distance) }
        : {}),
    };
  }
  const appearance = setAppearance(type);
  return (
    <View className="mb-2 rounded-xl border bg-elevated px-2 py-2">
      <View className="flex-row items-end gap-2">
        <SetTypePicker
          value={type}
          number={number}
          disabled={saving || busy}
          onChange={async (next) => {
            if (inFlight.current || busy) return;
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
              setError(
                e instanceof Error ? e.message : "Could not save set type.",
              );
            } finally {
              inFlight.current = false;
              setSaving(false);
            }
          }}
        />
        {weighted && (
          <NumberEntry
            compact
            onFocus={focus}
            label={trackingType === "reps" ? "Added kg" : "Kg"}
            value={weight}
            onChange={setWeight}
            step={0.5}
            max={100000}
            disabled={saving || busy || completed}
          />
        )}
        {!timed && (
          <NumberEntry
            compact
            onFocus={focus}
            label="Reps"
            value={reps}
            onChange={setReps}
            disabled={saving || busy || completed}
          />
        )}
        {timed && (
          <NumberEntry
            compact
            onFocus={focus}
            label="Seconds"
            value={duration}
            onChange={setDuration}
            max={86400}
            disabled={saving || busy || completed}
          />
        )}
        {trackingType === "distance_duration" && (
          <NumberEntry
            compact
            onFocus={focus}
            label="Meters"
            value={distance}
            onChange={setDistance}
            max={1000000}
            disabled={saving || busy || completed}
          />
        )}
        <Pressable
          accessibilityLabel={completed ? "Undo completed set" : "Log set"}
          disabled={saving || busy}
          onPress={() => {
            const values = metrics();
            if (values)
              void save(
                { ...values, setType: type, completed: !completed },
                true,
              );
          }}
          className={`h-11 w-12 items-center justify-center rounded-lg ${completed ? "bg-green-400" : "bg-white"}`}
        >
          <Txt weight="bold" className="text-xs text-bg">
            {completed ? (
              <MaterialCommunityIcons
                name={completed ? "close-circle" :"close-circle-outline"}
                size={18}
                color={"black"}
              />
              
            ) : (
              <MaterialCommunityIcons
                name={completed ? "check-circle" : "check-circle-outline"}
                size={18}
                color={"black"}
              />
            )}
          </Txt>
        </Pressable>
      </View>
      <Pressable
        onPress={() => {
          focus();
          setDrawer("details");
        }}
        disabled={saving || busy}
        accessibilityLabel={`Edit rest, notes and effort for set ${number}`}
        className="mt-1 min-h-9 flex-row items-center gap-1"
      >
        <MaterialCommunityIcons
          name="timer-outline"
          size={14}
          color={C.muted}
        />
        <Txt className="text-xs text-muted">
          {Number(rest) ? `${rest}s` : "Off"}
        </Txt>
        <MaterialCommunityIcons
          name={notes ? "note-text" : "note-text-outline"}
          size={14}
          color={notes ? appearance.color : C.muted}
        />
        <Txt className="flex-1 text-xs text-muted" numberOfLines={1}>
          {notes || "Notes & effort"}
        </Txt>
        <Txt className="text-[10px] text-muted">
          {saving ? "Saving…" : completed ? "Logged" : ""}
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
          onClose={() => setDrawer(null)}
        >
          <Txt className="mb-2 text-muted">
            Rest after this set · saved on this device
          </Txt>
          <NumberEntry
            onFocus={focus}
            label="Rest · seconds (0 = off)"
            value={rest}
            onChange={setRest}
            max={900}
          />
          <Txt className="mb-2 mt-5 text-muted">Set notes</Txt>
          <TextInput
            maxLength={1000}
            placeholder="Technique, discomfort, equipment…"
            placeholderTextColor={C.muted}
            value={notes}
            onChangeText={setNotes}
            className="min-h-[90px] rounded-xl bg-bg p-4 text-ink"
          />
          <View className="mt-5 flex-row gap-3">
            <View className="flex-1">
              <Txt className="mb-2 text-xs text-muted">
                RPE · effort 1–10 (optional)
              </Txt>
              <TextInput
                keyboardType="decimal-pad"
                value={rpe}
                onChangeText={setRpe}
                placeholder="—"
                placeholderTextColor={C.muted}
                className="rounded-xl bg-bg p-4 text-ink"
              />
            </View>
            <View className="flex-1">
              <Txt className="mb-2 text-xs text-muted">
                RIR · reps left 0–10
              </Txt>
              <TextInput
                keyboardType="number-pad"
                value={rir}
                onChangeText={setRir}
                placeholder="—"
                placeholderTextColor={C.muted}
                className="rounded-xl bg-bg p-4 text-ink"
              />
            </View>
          </View>
          {!!error && <Txt className="mt-3 text-red-300">{error}</Txt>}
          <Pressable
            disabled={saving}
            onPress={async () => {
              if (
                !validNumber(rest, 900, true) ||
                (rpe !== "" && (!validNumber(rpe, 10) || Number(rpe) < 1)) ||
                (rir !== "" && !validNumber(rir, 10, true))
              ) {
                setError(
                  "Rest must be 0–900 seconds, RPE 1–10, and RIR a whole number from 0–10.",
                );
                return;
              }
              setSaving(true);
              setError("");
              try {
                await updateSet(set.id, {
                  notes,
                  rpe: rpe === "" ? null : Number(rpe),
                  rir: rir === "" ? null : Number(rir),
                });
                await AsyncStorage.setItem(restKey, rest);
                setDrawer(null);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Could not save details.",
                );
              } finally {
                setSaving(false);
              }
            }}
            className="mt-6 items-center rounded-2xl bg-brand p-4"
          >
            <Txt weight="bold" className="text-bg">
              {saving ? "Saving…" : "Save set details"}
            </Txt>
          </Pressable>
        </WorkoutDrawer>
      )}
    </View>
  );
});
