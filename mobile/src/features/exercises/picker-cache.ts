import { apiRequest } from "@/src/services/api";

export type PickerExercise = {
  id: string;
  name: string;
  trackingType: string;
  regionLabel: string;
  equipment: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  imageUrl: string | null;
};

let cached: PickerExercise[] = [];
let loadedAt = 0;
let inFlight: Promise<PickerExercise[]> | null = null;
export function cachedExercisePicker() { return cached; }

export function loadExercisePicker(force = false): Promise<PickerExercise[]> {
  if (inFlight) return inFlight;
  if (!force && loadedAt && Date.now() - loadedAt < 5 * 60 * 1000) return Promise.resolve(cached);
  inFlight = (async () => {
    const rows: PickerExercise[] = [];
    for (let page = 1; ; page++) {
      const response = await apiRequest<{ items: PickerExercise[]; hasMore: boolean }>(`/exercises/picker?page=${page}`);
      rows.push(...response.items);
      if (!response.hasMore) break;
    }
    cached = rows;
    loadedAt = Date.now();
    return cached;
  })().finally(() => { inFlight = null; });
  return inFlight;
}
