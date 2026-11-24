import React, { useEffect, useRef, useState } from "react";
import { useSession } from "@/src/context/session";
import { toKg, weightText, type WeightUnit } from "@/src/lib/weight";
import { Pressable, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import type { DraftExercise, DraftSet } from "../routine-draft";
import { ExerciseImage } from "./exercise-image";
import { WorkoutGlassSurface } from "./workout-glass";
import { NumberEntry } from "./workout-controls";
import { SetTypePicker } from "./set-type-picker";

export function RoutineExerciseCard({
  item,
  index,
  collapsed,
  disabled,
  onToggle,
  onMenu,
  onDetails,
  onSetOptions,
  onPatchSet,
  onAddSet,
}: {
  item: DraftExercise;
  index: number;
  collapsed: boolean;
  disabled: boolean;
  onToggle: () => void;
  onMenu: () => void;
  onDetails: () => void;
  onSetOptions: (setId: string) => void;
  onPatchSet: (setId: string, change: Partial<DraftSet>) => void;
  onAddSet: () => void;
}) {
  const { settings } = useSession();
  const unit = settings?.weightUnit ?? "kg";
  const timed =
    item.exercise.trackingType === "duration" || item.exercise.trackingType === "distance_duration";
  return (
    <View className="mb-4 overflow-hidden rounded-3xl border border-white/10">
      <WorkoutGlassSurface />
      <View className="flex-row items-center p-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${item.exercise.name}, ${item.sets.length} planned sets`}
          accessibilityState={{ expanded: !collapsed, disabled }}
          disabled={disabled}
          onPress={onToggle}
          className="min-w-0 flex-1 flex-row items-center gap-3"
        >
          <ExerciseImage uri={item.exercise.imageUrl} name={item.exercise.name} size={44} round />
          <View className="min-w-0 flex-1">
            <Txt className="mb-1 text-[10px] tracking-wider text-muted">
              {String(index + 1).padStart(2, "0")}
            </Txt>
            <Txt
              weight="semibold"
              numberOfLines={2}
              className="text-[15px] leading-[20px] tracking-[-0.3px]"
            >
              {item.exercise.name}
            </Txt>
            <Txt className="mt-1 text-[10px] text-muted">
              {item.sets.length} planned sets · {timed ? "Time targets" : "Weight & reps"}
            </Txt>
          </View>
          <MaterialCommunityIcons
            name={collapsed ? "chevron-down" : "chevron-up"}
            size={18}
            color={C.muted}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Options for ${item.exercise.name}`}
          disabled={disabled}
          onPress={onMenu}
          className="ml-1 h-11 w-11 items-center justify-center rounded-xl"
        >
          <MaterialCommunityIcons name="dots-horizontal" size={18} color={C.muted} />
        </Pressable>
      </View>
      {!collapsed && (
        <>
          {!!item.notes && (
            <Txt className="mx-4 mb-2 text-xs leading-5 text-muted">{item.notes}</Txt>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Rest and notes for ${item.exercise.name}`}
            disabled={disabled}
            onPress={onDetails}
            className="mx-4 mb-2 min-h-11 justify-center"
          >
            <Txt className="text-[11px] text-[#D4F89A]">
              {item.supersetGroup ? `Superset ${item.supersetGroup} · ` : ""}
              {item.rest}s default rest · Edit training method
            </Txt>
          </Pressable>
          <View className="mx-3 mb-2 flex-row items-center gap-2 px-2">
            <Txt className="w-11 text-center text-[10px] tracking-wider text-muted">TYPE</Txt>
            <Txt className="flex-1 text-center text-[10px] tracking-wider text-muted">
              {timed
                ? "SECONDS"
                : item.exercise.trackingType === "reps"
                  ? `ADDED ${unit.toUpperCase()}`
                  : unit.toUpperCase()}
            </Txt>
            {!timed && (
              <Txt className="flex-1 text-center text-[10px] tracking-wider text-muted">REPS</Txt>
            )}
            <Txt className="w-11 text-center text-[10px] tracking-wider text-muted">EDIT</Txt>
          </View>
          <View className="px-3">
            {item.sets.map((set, setIndex) => (
              <View key={set.id} className="mb-2 rounded-2xl bg-black/15 px-2 py-2">
                <View className="flex-row items-center gap-2">
                  <SetTypePicker
                    table
                    value={set.type}
                    number={setIndex + 1}
                    disabled={disabled}
                    onChange={(type) => onPatchSet(set.id, { type })}
                  />
                  {timed ? (
                    <NumberEntry
                      compact
                      showLabel={false}
                      showStepper={false}
                      allowDrag={false}
                      label={`${item.exercise.name}, set ${setIndex + 1} seconds`}
                      value={set.duration}
                      onChange={(duration) => onPatchSet(set.id, { duration })}
                      max={86400}
                      disabled={disabled}
                    />
                  ) : (
                    <>
                      <RoutineWeightEntry
                        key={`${set.id}-${unit}`}
                        label={`${item.exercise.name}, set ${setIndex + 1} weight in ${unit}`}
                        kg={set.weight}
                        unit={unit}
                        onChange={(weight) => onPatchSet(set.id, { weight })}
                        disabled={disabled}
                      />
                      <NumberEntry
                        compact
                        showLabel={false}
                        showStepper={false}
                        allowDrag={false}
                        label={`${item.exercise.name}, set ${setIndex + 1} reps`}
                        value={set.reps}
                        onChange={(reps) => onPatchSet(set.id, { reps })}
                        disabled={disabled}
                      />
                    </>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Options for set ${setIndex + 1} of ${item.exercise.name}`}
                    disabled={disabled}
                    onPress={() => onSetOptions(set.id)}
                    className="h-12 w-11 items-center justify-center rounded-xl bg-white/5"
                  >
                    <MaterialCommunityIcons
                      name="tune-vertical"
                      size={18}
                      color={set.tempo || set.rest ? C.ink : C.muted}
                    />
                  </Pressable>
                </View>
                {(set.tempo || set.rest) && (
                  <Txt className="ml-14 mt-2 text-[10px] text-muted">
                    {[set.tempo ? `Tempo ${set.tempo}` : "", set.rest ? `${set.rest}s rest` : ""]
                      .filter(Boolean)
                      .join(" · ")}
                  </Txt>
                )}
              </View>
            ))}
          </View>
          {item.exercise.trackingType === "distance_duration" && (
            <Txt className="mx-4 mb-3 text-[10px] leading-4 text-muted">
              Plan duration here. Record actual distance during your workout.
            </Txt>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add set to ${item.exercise.name}`}
            disabled={disabled || item.sets.length >= 30}
            onPress={onAddSet}
            className={`mx-3 mb-3 mt-1 min-h-11 flex-row items-center justify-center gap-2 rounded-xl bg-white/5 ${disabled || item.sets.length >= 30 ? "opacity-50" : ""}`}
          >
            <MaterialCommunityIcons name="plus" size={17} color={C.muted} />
            <Txt weight="medium" className="text-xs text-muted">
              {item.sets.length >= 30 ? "30-set limit reached" : "Add set"}
            </Txt>
          </Pressable>
        </>
      )}
    </View>
  );
}

// Drafts stay in canonical kg; preserve the typed decimal while editing in lb.
function RoutineWeightEntry({
  kg,
  unit,
  onChange,
  label,
  disabled,
}: {
  kg: string;
  unit: WeightUnit;
  onChange: (kg: string) => void;
  label: string;
  disabled: boolean;
}) {
  const [text, setText] = useState(() => (kg === "" ? "" : weightText(Number(kg), unit)));
  const last = useRef(kg);
  useEffect(() => {
    if (kg !== last.current) setText(kg === "" ? "" : weightText(Number(kg), unit));
    last.current = kg;
  }, [kg, unit]);
  return (
    <NumberEntry
      compact
      showLabel={false}
      showStepper={false}
      allowDrag={false}
      label={label}
      value={text}
      step={0.5}
      max={100000}
      disabled={disabled}
      onChange={(value) => {
        const normalized = value.replace(",", ".");
        setText(normalized);
        const canonical = normalized.trim() === "" ? "" : String(toKg(Number(normalized), unit));
        last.current = canonical;
        onChange(canonical);
      }}
    />
  );
}
