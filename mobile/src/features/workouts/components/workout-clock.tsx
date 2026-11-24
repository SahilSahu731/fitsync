import React, { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { Txt } from "@/src/components/ui";
import { workoutTime } from "../session-progress";
import { RestTimer } from "./rest-timer";

// Keep one-second updates inside the clock, away from the exercise list and inputs.
function useClock() {
  const [now, setNow] = useState(Date.now);
  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
      const interval = setInterval(() => {
        if (AppState.currentState === "active") setNow(Date.now());
      }, 1000);
      return () => clearInterval(interval);
    }, []),
  );
  return now;
}

export function WorkoutDuration({
  startedAt,
  summary = false,
}: {
  startedAt: string;
  summary?: boolean;
}) {
  const elapsed = Math.max(0, Math.floor((useClock() - Date.parse(startedAt)) / 1000));
  const time = workoutTime(elapsed);
  return (
    <Txt
      accessibilityLabel={`Workout duration ${time}`}
      weight={summary ? "medium" : "semibold"}
      numberOfLines={1}
      className={summary ? "mt-1 text-lg" : "text-[15px] text-[#25d22d]"}
      style={{ fontVariant: ["tabular-nums"] }}
    >
      {time}
    </Txt>
  );
}

export function LiveRestTimer({
  timer,
  onExtend,
  onSkip,
}: {
  timer: { endsAt: number; duration: number };
  onExtend: (seconds: number) => void;
  onSkip: () => void;
}) {
  const remaining = Math.max(0, Math.ceil((timer.endsAt - useClock()) / 1000));
  useEffect(() => {
    if (!remaining) onSkip();
  }, [remaining, onSkip]);
  return remaining ? (
    <RestTimer
      remaining={remaining}
      duration={timer.duration}
      onExtend={() => onExtend(Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000)) + 30)}
      onSkip={onSkip}
    />
  ) : null;
}
