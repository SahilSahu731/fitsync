import { apiRequest } from "@/src/services/api";

export type Level = "beginner" | "intermediate" | "advanced";
export type Goal =
  | "muscle" | "strength" | "fat_loss" | "endurance" | "general";
export type Equipment =
  | "gym" | "dumbbells" | "bodyweight" | "bands" | "mixed";

export type Program = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  cover_url: string | null;
  level: Level;
  goal: Goal;
  equipment: Equipment;
  duration_weeks: number;
  days_per_week: number;
  author: string;
  featured_rank: number | null;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string;
  image_url: string | null;
};

export type CatalogExercise = {
  id: string;
  position: number;
  sets: number;
  min_reps: number;
  max_reps: number;
  rest_seconds: number;
  set_type: string;
  notes: string;
  exercises: {
    id: string;
    name: string;
    tracking_type: string;
  };
};

export type Routine = {
  id: string;
  slug: string;
  name: string;
  description: string;
  image_url: string | null;
  level: Level;
  goal: Goal;
  equipment: Equipment;
  estimated_minutes: number;
  author: string;
  training_routine_exercises?: CatalogExercise[];
};

export type ProgramDay = {
  id: string;
  day_number: number;
  label: string;
  routine_id: string | null;
  training_routines: Routine | null;
};

export type ProgramDetail = Program & {
  training_program_days: ProgramDay[];
};

export type SavedProgram = {
  id: string;
  saved_at: string;
  training_programs: Program;
  user_saved_program_routines: {
    source_routine_id: string;
    template_id: string;
  }[];
};

export type Filters = {
  level?: Level;
  goal?: Goal;
  equipment?: Equipment;
};

function queryString(filters: Record<string, string | undefined>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export const catalogApi = {
  programs: (filters: Filters = {}) =>
    apiRequest<Program[]>(
      `/catalog/programs${queryString(filters)}`
    ),

  program: (id: string) =>
    apiRequest<ProgramDetail>(`/catalog/programs/${id}`),

  categories: () =>
    apiRequest<Category[]>("/catalog/categories"),

  routines: (category?: string) =>
    apiRequest<Routine[]>(
      `/catalog/routines${queryString({ category })}`
    ),

  routine: (id: string) =>
    apiRequest<Routine>(`/catalog/routines/${id}`),

  saveProgram: (id: string) =>
    apiRequest<{ saved: boolean; savedProgramId: string }>(
      `/catalog/programs/${id}/save`,
      { method: "POST", json: {} }
    ),

  saveRoutine: (id: string) =>
    apiRequest<{ saved: boolean; templateId: string }>(
      `/catalog/routines/${id}/save`,
      { method: "POST", json: {} }
    ),

  deleteSavedProgram: (id: string) => apiRequest<void>(`/catalog/my-programs/${id}`, { method: "DELETE" }),

  myPrograms: () =>
    apiRequest<SavedProgram[]>("/catalog/my-programs")
};