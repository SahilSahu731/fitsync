import React, { useEffect, useRef, useState } from "react";
import { Pressable, TextInput, View, useWindowDimensions } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  const { updateSet, removeSet, startRest, busy } = useWorkout();
  const Alert = useAppAlert();
  const { width } = useWindowDimensions();
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
    setType(set.set_type);
  }, [set.set_type]);
  useEffect(() => {
    if (!drawer) {
      setNotes(set.notes ?? "");
      setRpe(set.rpe?.toString() ?? "");
      setRir(set.rir?.toString() ?? "");
    }
  }, [drawer, set.notes, set.rpe, set.rir]);
  const restKey = `fitsync.set-rest.v1.${set.id}`;
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(restKey)
      .then((value) => {
        if (active && value !== null && Number.isFinite(Number(value))) setRest(value);
      })
      .catch(console.warn);
    return () => {
      active = false;
    };
  }, [restKey]);
  const timed = trackingType === "duration" || trackingType === "distance_duration";
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
    }
    try {
      await updateSet(set.id, patch);
      if (toggle && !before) feedback("set");
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
    <View className="mb-2 rounded-xl bg-elevated px-2 py-2">
      <View className="flex-row flex-wrap items-end gap-2">
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
            showStepper={width >= 360}
            onFocus={focus}
            label={trackingType === "reps" ? "Added kg" : "Kg"}
            value={weight}
            onChange={(value) => {
              const next = value.replace(",", ".");
              setWeight(next);
              persistMetric("weightKg", next, 100000);
            }}
            step={0.5}
            max={100000}
            disabled={saving || busy || completed}
          />
        )}
        {!timed && (
          <NumberEntry
            compact
            showStepper={width >= 360}
            onFocus={focus}
            label="Reps"
            value={reps}
            onChange={(value) => {
              setReps(value);
              persistMetric("reps", value, 1000, true);
            }}
            disabled={saving || busy || completed}
          />
        )}
        {timed && (
          <NumberEntry
            compact
            showStepper={width >= 360}
            onFocus={focus}
            label="Seconds"
            value={duration}
            onChange={(value) => {
              setDuration(value);
              persistMetric("durationSeconds", value, 86400, true);
            }}
            max={86400}
            disabled={saving || busy || completed}
          />
        )}
        {trackingType === "distance_duration" && (
          <NumberEntry
            compact
            showStepper={width >= 360}
            onFocus={focus}
            label="Meters · optional"
            step={0.1}
            value={distance}
            onChange={(value) => {
              const next = value.replace(",", ".");
              setDistance(next);
              persistMetric("distanceMeters", next, 1000000);
            }}
            max={1000000}
            disabled={saving || busy || completed}
          />
        )}
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: completed, disabled: saving || busy, busy: saving }}
          accessibilityLabel={completed ? `Undo completed set ${number}` : `Log set ${number}`}
          disabled={saving || busy}
          onPress={() => {
            if (completed) {
              void save({ completed: false }, true);
              return;
            }
            const values = metrics();
            if (values) void save({ ...values, setType: type, completed: !completed }, true);
          }}
          className={`h-11 w-12 items-center justify-center rounded-lg ${completed ? "bg-ink" : "bg-white/10"}`}
        >
          <MaterialCommunityIcons
            name={completed ? "check" : "circle-outline"}
            size={20}
            color={completed ? C.bg : C.muted}
          />
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
        <MaterialCommunityIcons name="timer-outline" size={14} color={C.muted} />
        <Txt className="text-xs text-muted">{Number(rest) ? `${rest}s` : "Off"}</Txt>
        <MaterialCommunityIcons
          name={set.notes ? "note-text" : "note-text-outline"}
          size={14}
          color={set.notes ? appearance.color : C.muted}
        />
        <Txt className="flex-1 text-xs text-muted" numberOfLines={1}>
          {set.notes ||
            [set.rpe != null ? `RPE ${set.rpe}` : "", set.rir != null ? `RIR ${set.rir}` : ""]
              .filter(Boolean)
              .join(" · ") ||
            "Notes & effort"}
        </Txt>
        <Txt className="text-[11px] text-muted">
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
          onClose={() => {
            if (!saving) setDrawer(null);
          }}
        >
          <Txt className="mb-2 text-muted">Rest after this set · saved on this device</Txt>
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
            disabled={saving || busy}
            onPress={async () => {
              if (inFlight.current || busy) return;
              if (
                !validNumber(rest, 900, true) ||
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
                await updateSet(set.id, {
                  notes,
                  rpe: rpe === "" ? null : Number(rpe),
                  rir: rir === "" ? null : Number(rir),
                });
                await AsyncStorage.setItem(restKey, rest);
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
            disabled={saving || busy}
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
