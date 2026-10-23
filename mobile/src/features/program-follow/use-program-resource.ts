import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";

export function useProgramResource<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const invalidate = useCallback(() => { generation.current++; }, []);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    try {
      const result = await load();
      if (generation.current === request) { setData(result); setError(""); }
    } catch (cause) {
      if (generation.current === request) setError(cause instanceof Error ? cause.message : "Could not load your program.");
    } finally { if (generation.current === request) setLoading(false); }
  }, [load]);
  useFocusEffect(useCallback(() => { void refresh(); return invalidate; }, [refresh, invalidate]));
  return { data, setData, loading, error, refresh };
}
