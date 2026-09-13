import { useCallback, useRef } from "react";

import type { ScrollView } from "react-native";

export function useWorkoutLoggingUi() {
  const scrollRef = useRef<ScrollView>(null);

  const exercisePositions = useRef<Map<string, number>>(new Map());

  const setScrollView = useCallback((scrollView: ScrollView | null) => {
    scrollRef.current = scrollView;
  }, []);

  const registerExercisePosition = useCallback(
    (
      exerciseId: string,

      y: number,
    ) => {
      exercisePositions.current.set(exerciseId, y);
    },
    [],
  );

  const scrollToExercise = useCallback((exerciseId: string) => {
    const y = exercisePositions.current.get(exerciseId);

    if (y === undefined) {
      return;
    }

    scrollRef.current?.scrollTo({
      y: Math.max(0, y - 12),

      animated: true,
    });
  }, []);

  return {
    setScrollView,

    registerExercisePosition,

    scrollToExercise,
  };
}
