import { useCallback, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { customExerciseApi } from "../exercises/custom-api";
import type { Exercise } from "../exercises/api";

export function useStudioResources(ownerId: string) {
  const exercises = useMemo(() => customExerciseApi(ownerId), [ownerId]);
  const sequence = useRef(0);
  const [library, setLibrary] = useState<Exercise[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [libraryError, setLibraryError] = useState("");
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true);
    try {
      const result = await exercises.list();
      if (request !== sequence.current) return;
      setLibrary(result);
      setLibraryError("");
    } catch {
      if (request === sequence.current) setLibraryError("Your exercise library couldn’t refresh.");
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  }, [exercises]);
  useFocusEffect(
    useCallback(() => {
      void refresh();
      return () => {
        sequence.current++;
      };
    }, [refresh]),
  );
  return { library, loading, libraryError, refresh };
}
