import { Ionicons } from "@expo/vector-icons";

import * as Haptics from "expo-haptics";

import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import { Alert, Pressable, Text, View } from "react-native";

import type { ExerciseTrackingType } from "@/features/exercises/types";

import type { PreviousSet, WorkoutSet } from "@/features/workouts/types";

import { completionError } from "../domain/completion";

import { copyPreviousMetrics } from "../domain/previous-performance";

import {
  getTrackingColumns,
  type WorkoutMetric,
} from "../domain/tracking-layout";

import {
  MetricInput,
  type MetricInputHandle,
} from "./metric-inputs/metric-input";

import { PreviousSetCell } from "./previous-set-cell";

import { SetActionsModal } from "./set-actions-modal";

import { SetCompletionButton } from "./set-completion-button";

import { SetTypeModal } from "./set-type-modal";

import { RpeModal } from "./rpe-modal";

export interface WorkoutSetRowHandle {
  focusFirst: () => void;
}

interface Props {
  workoutSet: WorkoutSet;

  previous: PreviousSet | undefined;

  trackingType: ExerciseTrackingType;

  index: number;

  active: boolean;

  totalSets: number;

  onChange: (patch: Partial<WorkoutSet>) => void;

  onToggleComplete: () => void;

  onDuplicate: () => void;

  onRemove: () => void;
}

function setLabel(
  set: WorkoutSet,

  index: number,
): string {
  switch (set.type) {
    case "WARMUP":
      return "W";

    case "DROP":
      return "D";

    case "FAILURE":
      return "F";

    case "BACKOFF":
      return "B";

    case "AMRAP":
      return "A";

    default:
      return String(index + 1);
  }
}

function metricValue(
  set: WorkoutSet,

  metric: WorkoutMetric,
): number | null {
  switch (metric) {
    case "weight":
      return set.weight;

    case "reps":
      return set.reps;

    case "duration":
      return set.duration_seconds;

    case "distance":
      return set.distance_meters;
  }
}

function targetPlaceholder(
  set: WorkoutSet,

  metric: WorkoutMetric,
): string {
  switch (metric) {
    case "weight":
      return set.target_weight?.toString() ?? "-";

    case "reps":
      if (set.target_reps_min !== null && set.target_reps_max !== null) {
        if (set.target_reps_min === set.target_reps_max) {
          return String(set.target_reps_min);
        }

        return `${set.target_reps_min}` + `–${set.target_reps_max}`;
      }

      return set.target_reps_min?.toString() ?? "-";

    case "duration":
      if (set.target_duration_seconds) {
        const minutes = Math.floor(set.target_duration_seconds / 60);

        const seconds = set.target_duration_seconds % 60;

        return `${minutes}:` + `${seconds.toString().padStart(2, "0")}`;
      }

      return "0:00";

    case "distance":
      return set.target_distance_meters?.toString() ?? "m";
  }
}

export const WorkoutSetRow = forwardRef<WorkoutSetRowHandle, Props>(
  function WorkoutSetRow(
    {
      workoutSet,
      previous,
      trackingType,
      index,
      active,
      totalSets,
      onChange,
      onToggleComplete,
      onDuplicate,
      onRemove,
    },
    forwardedRef,
  ) {
    const [setTypeOpen, setSetTypeOpen] = useState(false);

    const [actionsOpen, setActionsOpen] = useState(false);

    const [rpeOpen, setRpeOpen] = useState(false);

    const columns = useMemo(
      () => getTrackingColumns(trackingType, workoutSet.weight_unit),
      [trackingType, workoutSet.weight_unit],
    );

    const inputRefs = useRef<
      Partial<Record<WorkoutMetric, MetricInputHandle | null>>
    >({});

    useImperativeHandle(
      forwardedRef,
      () => ({
        focusFirst() {
          const first = columns[0]?.metric;

          if (first) {
            inputRefs.current[first]?.focus();
          }
        },
      }),
      [columns],
    );

    function commitMetric(
      metric: WorkoutMetric,

      value: number | null,
    ) {
      switch (metric) {
        case "weight":
          onChange({
            weight: value,
          });

          break;

        case "reps":
          onChange({
            reps: value === null ? null : Math.max(0, Math.floor(value)),
          });

          break;

        case "duration":
          onChange({
            duration_seconds: value,
          });

          break;

        case "distance":
          onChange({
            distance_meters: value,
          });

          break;
      }
    }

    function focusNextMetric(metricIndex: number) {
      const next = columns[metricIndex + 1];

      if (next) {
        inputRefs.current[next.metric]?.focus();

        return;
      }

      /*
       * Last metric:
       * try to complete the set.
       */
      const error = completionError(trackingType, workoutSet);

      if (!error) {
        onToggleComplete();
      }
    }

    function complete() {
      if (workoutSet.completed) {
        onToggleComplete();

        return;
      }

      const error = completionError(trackingType, workoutSet);

      if (error) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        Alert.alert("Set isn't ready", error);

        return;
      }

      onToggleComplete();
    }

    return (
      <>
        <View
          className="mb-1 min-h-[52px] flex-row items-center rounded-xl px-1"
          style={{
            backgroundColor: workoutSet.completed
              ? "rgba(37,99,235,.11)"
              : active
                ? "rgba(255,255,255,.035)"
                : "transparent",

            borderLeftWidth: active && !workoutSet.completed ? 2 : 0,

            borderLeftColor: "#3B82F6",
          }}
        >
          <Pressable
            onPress={() => {
              setSetTypeOpen(true);
            }}
            className="w-[34px] items-center justify-center"
          >
            <Text
              className="text-[11px] font-extrabold"
              style={{
                color:
                  workoutSet.type === "WARMUP"
                    ? "#F59E0B"
                    : workoutSet.type === "DROP"
                      ? "#60A5FA"
                      : workoutSet.type === "FAILURE"
                        ? "#F87171"
                        : "rgba(255,255,255,.55)",
              }}
            >
              {setLabel(workoutSet, index)}
            </Text>
          </Pressable>

          <PreviousSetCell
            trackingType={trackingType}
            previous={previous}
            onCopy={() => {
              if (!previous) {
                return;
              }

              const copied = copyPreviousMetrics(workoutSet, previous);

              onChange({
                weight: copied.weight,

                weight_unit: copied.weight_unit,

                reps: copied.reps,

                duration_seconds: copied.duration_seconds,

                distance_meters: copied.distance_meters,

                rpe: copied.rpe,
              });

              void Haptics.selectionAsync();
            }}
          />

          <View className="flex-1 flex-row gap-1.5">
            {columns.map((column, metricIndex) => (
              <View
                key={column.metric}
                style={{
                  flex: column.flex,
                }}
              >
                <MetricInput
                  ref={(value) => {
                    inputRefs.current[column.metric] = value;
                  }}
                  metric={column.metric}
                  value={metricValue(workoutSet, column.metric)}
                  placeholder={targetPlaceholder(workoutSet, column.metric)}
                  completed={workoutSet.completed}
                  returnKeyType={
                    metricIndex === columns.length - 1 ? "done" : "next"
                  }
                  onCommit={(value) => {
                    commitMetric(column.metric, value);
                  }}
                  onSubmit={() => {
                    focusNextMetric(metricIndex);
                  }}
                />
              </View>
            ))}
          </View>

          <SetCompletionButton
            completed={workoutSet.completed}
            onPress={complete}
          />

          <Pressable
            onPress={() => {
              setActionsOpen(true);
            }}
            hitSlop={6}
            className="h-10 w-8 items-center justify-center"
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={16}
              color="rgba(255,255,255,.3)"
            />
          </Pressable>
        </View>

        <SetTypeModal
          visible={setTypeOpen}
          value={workoutSet.type}
          onClose={() => {
            setSetTypeOpen(false);
          }}
          onSelect={(type) => {
            onChange({
              type,
            });
          }}
        />

        <SetActionsModal
          visible={actionsOpen}
          canDelete={totalSets > 1}
          onRpe={() => {
            setRpeOpen(true);
          }}
          onDuplicate={onDuplicate}
          onDelete={() => {
            if (workoutSet.completed) {
              Alert.alert(
                "Delete completed set?",
                "The logged values for this set will be removed.",
                [
                  {
                    text: "Cancel",

                    style: "cancel",
                  },
                  {
                    text: "Delete",

                    style: "destructive",

                    onPress: onRemove,
                  },
                ],
              );

              return;
            }

            onRemove();
          }}
          onClose={() => {
            setActionsOpen(false);
          }}
        />

        <RpeModal
          visible={rpeOpen}
          value={workoutSet.rpe}
          onClose={() => {
            setRpeOpen(false);
          }}
          onSelect={(rpe) => {
            onChange({
              rpe,
            });
          }}
        />
      </>
    );
  },
);
