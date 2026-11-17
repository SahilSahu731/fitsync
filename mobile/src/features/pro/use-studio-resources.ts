import { useCallback, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { wellnessForOwner, type Recipe, type WellnessState } from "../wellness/api";
import { customExerciseApi } from "../exercises/custom-api";
import type { Exercise } from "../exercises/api";

export function useStudioResources(ownerId: string, week: string) {
  const api = useMemo(() => wellnessForOwner(ownerId), [ownerId]);
  const exercises = useMemo(() => customExerciseApi(ownerId), [ownerId]);
  const sequence = useRef(0);
  const [food, setFood] = useState<WellnessState | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [library, setLibrary] = useState<Exercise[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [mealError, setMealError] = useState("");
  const [libraryError, setLibraryError] = useState("");
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true);
    const result = await Promise.allSettled([api.state(week), api.recipes(), exercises.list()]);
    if (request !== sequence.current) return;
    if (result[0].status === "fulfilled") setFood(result[0].value);
    if (result[1].status === "fulfilled") setRecipes(result[1].value.recipes);
    const failedMeal = result[0].status === "rejected" || result[1].status === "rejected";
    setMealError(failedMeal ? "Meals couldn’t refresh. Open your meal planner to try again." : "");
    if (result[2].status === "fulfilled") {
      setLibrary(result[2].value);
      setLibraryError("");
    } else setLibraryError("Your exercise library couldn’t refresh.");
    setLoading(false);
  }, [api, exercises, week]);
  useFocusEffect(
    useCallback(() => {
      void refresh();
      return () => {
        sequence.current++;
      };
    }, [refresh]),
  );
  return { food, recipes, library, loading, mealError, libraryError, refresh };
}
