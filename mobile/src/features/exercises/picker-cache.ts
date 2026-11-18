import { apiRequest, apiSessionKey } from "@/src/services/api";
import type { Exercise } from "./api";
import {
  customPickerExercise,
  filterCustomExercises,
  type ExerciseScope,
} from "./custom-discovery";

export type PickerExercise = {
  id: string;
  name: string;
  trackingType: string;
  regionLabel: string;
  equipment: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  imageUrl: string | null;
  isCustom?: boolean;
};

export type PickerPage = { items: PickerExercise[]; hasMore: boolean };
const pages = new Map<string, { result: PickerPage; time: number }>();
const requests = new Map<string, Promise<PickerPage>>();
const customLists = new Map<string, { items: Exercise[]; time: number }>();
const customRequests = new Map<string, Promise<Exercise[]>>();
const listeners = new Set<() => void>();
let epoch = 0;
export function subscribePickerCache(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function clearPickerCache() {
  epoch++;
  pages.clear();
  requests.clear();
  customLists.clear();
  customRequests.clear();
  listeners.forEach((listener) => listener());
}
type PickerOptions = { scope?: ExerciseScope; ownerId?: string };
const keyFor = (query: string, page: number, options: PickerOptions = {}) =>
  `${apiSessionKey?.() ?? 0}:${epoch}:${options.scope ?? "all"}:${options.scope === "custom" ? (options.ownerId ?? "") : ""}:${query.trim().toLowerCase()}:${page}`;
export function cachedPickerPage(query: string, page: number, options: PickerOptions = {}) {
  const cached = pages.get(keyFor(query, page, options));
  return cached && Date.now() - cached.time < 5 * 60 * 1000 ? cached.result : undefined;
}
export function loadCustomExerciseList(ownerId: string): Promise<Exercise[]> {
  if (!ownerId) return Promise.resolve([]);
  const key = keyFor("", 0, { scope: "custom", ownerId });
  const pending = customRequests.get(key);
  if (pending) return pending;
  const cached = customLists.get(key);
  if (cached && Date.now() - cached.time < 5 * 60 * 1000) return Promise.resolve(cached.items);
  const request = apiRequest<Exercise[]>("/exercises/custom", { expectedOwnerId: ownerId })
    .then((items) => {
      if (key === keyFor("", 0, { scope: "custom", ownerId })) {
        customLists.set(key, { items, time: Date.now() });
      }
      return items;
    })
    .finally(() => customRequests.delete(key));
  customRequests.set(key, request);
  return request;
}
export function loadPickerPage(
  query: string,
  page: number,
  options: PickerOptions = {},
): Promise<PickerPage> {
  const key = keyFor(query, page, options);
  const pending = requests.get(key);
  if (pending) return pending;
  const cached = cachedPickerPage(query, page, options);
  if (cached) return Promise.resolve(cached);
  const source =
    options.scope === "custom"
      ? loadCustomExerciseList(options.ownerId ?? "").then((items) => {
          const matching = filterCustomExercises(items, query);
          return {
            items: matching.slice((page - 1) * 15, page * 15).map(customPickerExercise),
            hasMore: page * 15 < matching.length,
          };
        })
      : apiRequest<PickerPage>(
          `/exercises/picker?page=${page}&q=${encodeURIComponent(query.trim())}`,
        );
  const request = source
    .then((result) => {
      if (key === keyFor(query, page, options)) {
        if (pages.size >= 60) pages.delete(pages.keys().next().value!);
        pages.set(key, { result, time: Date.now() });
      }
      return result;
    })
    .finally(() => requests.delete(key));
  requests.set(key, request);
  return request;
}
// Prefetch only the first 15 items. Later pages load when requested by scrolling.
export async function loadExercisePicker() {
  return (await loadPickerPage("", 1)).items;
}
