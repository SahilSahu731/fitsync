import { apiRequest } from "@/src/services/api";

export type SetType =
  | "warmup"
  | "normal"
  | "heavy"
  | "failure"
  | "drop";

export type WorkoutSet = {
  id: string;
  position: number;
  set_type: SetType;
  weight_kg: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  rpe: number | null;
  rir: number | null;
  completed_at: string | null;
  notes: string;
};

export type SessionExercise = {
  id: string;
  exercise_id: string;
  exercise_name: string;
  tracking_type: string;
  position: number;
  rest_seconds: number;
  notes: string;
  workout_logged_sets: WorkoutSet[];
};

export type WorkoutSession = {
  id: string;
  name: string;
  status: "active" | "completed" | "discarded";
  started_at: string;
  finished_at: string | null;
  elapsed_seconds: number | null;
  workout_session_exercises: SessionExercise[];
};

export type WorkoutTemplate = {
  can_rename?: boolean;
  id: string;
  name: string;
  description: string;
  created_at: string;
  workout_template_exercises: { id: string; position: number; exercises?: { name: string }; workout_template_sets?: { target_reps: number | null; target_duration_seconds: number | null }[] }[];
};

export type TemplateInput = {
  name: string;
  description: string;
  exercises: {
    exerciseId: string;
    notes: string;
    restSeconds: number;
    sets: {
      setType: SetType;
      targetReps: number | null;
      targetWeight: number | null;
    }[];
  }[];
};

export type HistoryItem = {
  id: string;
  name: string;
  started_at: string;
  finished_at: string;
  elapsed_seconds: number;
};

export const workoutApi = {
  templates: () =>
    apiRequest<WorkoutTemplate[]>("/workouts/templates"),

  template: (id: string) =>
    apiRequest<WorkoutTemplate>(
      `/workouts/templates/${id}`
    ),

  createTemplate: (data: TemplateInput) =>
    apiRequest<WorkoutTemplate>("/workouts/templates", {
      method: "POST",
      json: data
    }),

  renameTemplate: (id: string, name: string) =>
    apiRequest(`/workouts/templates/${id}`, { method: "PATCH", json: { name } }),

  deleteTemplate: (id: string) =>
    apiRequest<void>(`/workouts/templates/${id}`, {
      method: "DELETE"
    }),

  active: () =>
    apiRequest<WorkoutSession | null>("/workouts/active"),

  start: (templateId?: string) =>
    apiRequest<WorkoutSession>("/workouts/start", {
      method: "POST",
      json: templateId ? { templateId } : {}
    }),

  session: (id: string) =>
    apiRequest<WorkoutSession>(
      `/workouts/sessions/${id}`
    ),

  addExercise: (
    sessionId: string,
    exerciseId: string,
    restSeconds = 90
  ) =>
    apiRequest<WorkoutSession>(
      `/workouts/sessions/${sessionId}/exercises`,
      {
        method: "POST",
        json: { exerciseId, restSeconds }
      }
    ),

  addSet: (
    sessionId: string,
    exerciseItemId: string,
    setType: SetType = "normal"
  ) =>
    apiRequest<WorkoutSession>(
      `/workouts/sessions/${sessionId}/exercises/${exerciseItemId}/sets`,
      {
        method: "POST",
        json: { setType, weightKg: null, reps: null }
      }
    ),

  updateSet: (
    sessionId: string,
    setId: string,
    data: {
      setType?: SetType;
      weightKg?: number | null;
      reps?: number | null;
      durationSeconds?: number | null;
      distanceMeters?: number | null;
      rpe?: number | null;
      rir?: number | null;
      completed?: boolean;
      notes?: string;
    }
  ) =>
    apiRequest<WorkoutSession>(
      `/workouts/sessions/${sessionId}/sets/${setId}`,
      {
        method: "PATCH",
        json: data
      }
    ),

  finish: (id: string, elapsedSeconds?: number) =>
    apiRequest<WorkoutSession>(
      `/workouts/sessions/${id}/finish`,
      {
        method: "POST",
        json: { elapsedSeconds }
      }
    ),

  discard: (id: string) =>
    apiRequest<WorkoutSession>(
      `/workouts/sessions/${id}/discard`,
      {
        method: "POST",
        json: {}
      }
    ),

  history: () =>
    apiRequest<HistoryItem[]>("/workouts/history")
};