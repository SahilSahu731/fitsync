import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { TextInput, type TextInputProps } from "react-native";

import {
  formatExerciseDuration,
  parseExerciseDuration,
} from "@/features/exercises/duration";

import type { WorkoutMetric } from "../../domain/tracking-layout";

export interface MetricInputHandle {
  focus: () => void;
}

interface Props {
  metric: WorkoutMetric;

  value: number | null;

  placeholder?: string;

  completed?: boolean;

  returnKeyType?: TextInputProps["returnKeyType"];

  onCommit: (value: number | null) => void;

  onSubmit?: () => void;
}

function formatValue(
  metric: WorkoutMetric,

  value: number | null,
): string {
  if (value === null) {
    return "";
  }

  if (metric === "duration") {
    return formatExerciseDuration(value);
  }

  return String(value);
}

function parseValue(
  metric: WorkoutMetric,

  value: string,
): number | null {
  const cleaned = value.trim();

  if (!cleaned) {
    return null;
  }

  if (metric === "duration") {
    return parseExerciseDuration(cleaned);
  }

  if (metric === "reps") {
    const parsed = Number.parseInt(cleaned, 10);

    return Number.isFinite(parsed) ? parsed : null;
  }

  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : null;
}

export const MetricInput = forwardRef<MetricInputHandle, Props>(
  function MetricInput(
    {
      metric,
      value,
      placeholder,
      completed = false,
      returnKeyType = "next",
      onCommit,
      onSubmit,
    },
    forwardedRef,
  ) {
    const inputRef = useRef<TextInput>(null);

    const [draft, setDraft] = useState(formatValue(metric, value));

    const [focused, setFocused] = useState(false);

    useImperativeHandle(
      forwardedRef,
      () => ({
        focus() {
          inputRef.current?.focus();
        },
      }),
      [],
    );

    useEffect(() => {
      if (!focused) {
        setDraft(formatValue(metric, value));
      }
    }, [metric, value, focused]);

    function commit() {
      const parsed = parseValue(metric, draft);

      onCommit(parsed);

      setDraft(formatValue(metric, parsed));
    }

    return (
      <TextInput
        ref={inputRef}
        value={draft}
        onFocus={() => {
          setFocused(true);
        }}
        onBlur={() => {
          setFocused(false);

          commit();
        }}
        onChangeText={(text) => {
          let next = text;

          if (metric === "reps") {
            next = text.replace(/\D/g, "");
          } else if (metric === "duration") {
            next = text.replace(/[^0-9:]/g, "");
          } else {
            next = text.replace(/[^0-9.]/g, "");
          }

          setDraft(next);
        }}
        onSubmitEditing={() => {
          commit();

          onSubmit?.();
        }}
        submitBehavior="submit"
        returnKeyType={returnKeyType}
        selectTextOnFocus
        keyboardType={
          metric === "reps"
            ? "number-pad"
            : metric === "duration"
              ? "numbers-and-punctuation"
              : "decimal-pad"
        }
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,.18)"
        className="min-h-[42px] rounded-xl px-1 text-center text-[14px] font-extrabold text-white"
        style={{
          backgroundColor: completed
            ? "rgba(37,99,235,.09)"
            : focused
              ? "rgba(59,130,246,.11)"
              : "rgba(255,255,255,.045)",

          borderWidth: focused ? 1 : 0,

          borderColor: focused ? "rgba(96,165,250,.55)" : "transparent",
        }}
      />
    );
  },
);
