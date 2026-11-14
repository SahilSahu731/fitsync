import { useEffect, useRef, useState } from "react";
import { loadPickerPage, type PickerExercise } from "../exercises/picker-cache";

export function useGoalExercises(query: string) {
  const [items, setItems] = useState<PickerExercise[]>([]),
    [page, setPage] = useState(1),
    [hasMore, setHasMore] = useState(false),
    [error, setError] = useState("");
  const sequence = useRef(0);
  useEffect(() => {
    const id = ++sequence.current;
    const timer = setTimeout(() => {
      void loadPickerPage(query, 1)
        .then((value) => {
          if (id === sequence.current) {
            setItems(value.items);
            setPage(1);
            setHasMore(value.hasMore);
            setError("");
          }
        })
        .catch((e) => {
          if (id === sequence.current)
            setError(e instanceof Error ? e.message : "Could not find exercises.");
        });
    }, 250);
    return () => {
      sequence.current = id + 1;
      clearTimeout(timer);
    };
  }, [query]);
  async function more() {
    const id = sequence.current;
    try {
      const value = await loadPickerPage(query, page + 1);
      if (id === sequence.current) {
        setItems((current) => [
          ...new Map([...current, ...value.items].map((item) => [item.id, item])).values(),
        ]);
        setPage(page + 1);
        setHasMore(value.hasMore);
      }
    } catch (e) {
      if (id === sequence.current)
        setError(e instanceof Error ? e.message : "Could not load more exercises.");
    }
  }
  return { items, hasMore, error, more };
}
