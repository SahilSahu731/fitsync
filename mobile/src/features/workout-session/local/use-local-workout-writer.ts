import { useEffect, useMemo } from "react";

import { useSQLiteContext } from "expo-sqlite";

import { LocalWorkoutWriter } from "./local-workout-writer";

export function useLocalWorkoutWriter() {
  const database = useSQLiteContext();

  const writer = useMemo(() => new LocalWorkoutWriter(database), [database]);

  useEffect(() => {
    return () => {
      /*
       * We cannot block React unmount,
       * so app lifecycle/Finish flows must
       * explicitly call flush/flushAll.
       */
    };
  }, [writer]);

  return writer;
}
