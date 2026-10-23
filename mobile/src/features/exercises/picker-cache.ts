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

export type PickerPage = { items: PickerExercise[]; hasMore: boolean };
const pages = new Map<string, { result: PickerPage; time: number }>();
const requests = new Map<string, Promise<PickerPage>>();
const keyFor = (query: string, page: number) => `${query.trim().toLowerCase()}:${page}`;
export function cachedPickerPage(query: string, page: number) {
  const cached = pages.get(keyFor(query, page));
  return cached && Date.now() - cached.time < 5 * 60 * 1000 ? cached.result : undefined;
}
export function loadPickerPage(query: string, page: number): Promise<PickerPage> {
  const key = keyFor(query, page);
  const pending = requests.get(key);
  if (pending) return pending;
  const cached = cachedPickerPage(query, page);
  if (cached) return Promise.resolve(cached);
  const request = apiRequest<PickerPage>(`/exercises/picker?page=${page}&q=${encodeURIComponent(query.trim())}`)
    .then(result => {
      if (pages.size >= 60) pages.delete(pages.keys().next().value!);
      pages.set(key, { result, time: Date.now() });
      return result;
    }).finally(() => requests.delete(key));
  requests.set(key, request);
  return request;
}
// Prefetch only the first 15 items. Later pages load when requested by scrolling.
export async function loadExercisePicker() { return (await loadPickerPage("", 1)).items; }
