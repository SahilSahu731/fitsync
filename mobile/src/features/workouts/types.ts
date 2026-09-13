export type WorkoutSetType =
  "WARMUP" | "NORMAL" | "BACKOFF" | "DROP" | "FAILURE" | "AMRAP";

export type WorkoutStatus =
  "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export type WeightUnit = "KG" | "LB";

export interface TemplateSet {
  id: string;

  position: number;

  type: WorkoutSetType;

  target_reps_min: number | null;

  target_reps_max: number | null;

  target_weight: number | null;

  target_rpe: number | null;

  target_rir: number | null;
}

export interface TemplateExercise {
  id: string;

  exercise_id: string;

  exercise_name: string;

  thumbnail_url: string | null;

  position: number;

  rest_seconds: number;

  notes: string | null;

  superset_group_id: string | null;

  planned_sets: TemplateSet[];
}

export interface WorkoutTemplate {
  id: string;

  name: string;

  description: string | null;

  exercise_count: number;

  exercises: TemplateExercise[];

  created_at: string;

  updated_at: string;
}

export interface WorkoutTemplateListItem {
  id: string;

  name: string;

  description: string | null;

  exercise_count: number;

  exercise_names: string[];

  thumbnail_url: string | null;

  updated_at: string;
}

export interface WorkoutTemplateListResponse {
  items: WorkoutTemplateListItem[];
}

export interface TemplateSetInput {
  type: WorkoutSetType;

  target_reps_min: number | null;

  target_reps_max: number | null;

  target_weight: number | null;

  target_rpe: number | null;

  target_rir: number | null;
}

export interface TemplateExerciseInput {
  exercise_id: string;

  rest_seconds: number;

  notes: string | null;

  superset_group_id: string | null;

  planned_sets: TemplateSetInput[];
}

export interface WorkoutTemplateInput {
  name: string;

  description: string | null;

  exercises: TemplateExerciseInput[];
}

// =====================================================
// SESSION
// =====================================================

export interface WorkoutSet {
  id: string;

  position: number;

  type: WorkoutSetType;

  target_reps_min: number | null;

  target_reps_max: number | null;

  target_weight: number | null;

  target_rpe: number | null;

  target_rir: number | null;

  reps: number | null;

  weight: number | null;

  weight_unit: WeightUnit;

  rpe: number | null;

  rir: number | null;

  completed: boolean;

  completed_at: string | null;
}

export interface WorkoutExercise {
  id: string;

  exercise_id: string;

  exercise_name: string;

  thumbnail_url: string | null;

  position: number;

  rest_seconds: number;

  notes: string | null;

  superset_group_id: string | null;

  sets: WorkoutSet[];
}

export interface WorkoutSession {
  id: string;

  client_workout_id?: string | null;

  template_id: string | null;

  name: string;

  status: WorkoutStatus;

  started_at: string;

  completed_at: string | null;

  cancelled_at: string | null;

  duration_seconds: number | null;

  notes: string | null;

  exercises: WorkoutExercise[];

  completed_set_count: number;

  total_set_count: number;

  revision: number;
}

export interface ActiveWorkoutResponse {
  workout: WorkoutSession | null;
}

export interface StartWorkoutInput {
  template_id?: string | null;

  name?: string | null;

  /*
   * Phase 2 idempotency key.
   */
  client_workout_id?: string | null;

  /*
   * Required when syncing an offline-started
   * workout so server history remains accurate.
   */
  started_at?: string | null;
}

export interface WorkoutSetMutationInput {
  id: string;

  type: WorkoutSetType;

  target_reps_min: number | null;

  target_reps_max: number | null;

  target_weight: number | null;

  target_rpe: number | null;

  target_rir: number | null;

  reps: number | null;

  weight: number | null;

  weight_unit: WeightUnit;

  rpe: number | null;

  rir: number | null;

  completed: boolean;
}

export interface WorkoutExerciseMutationInput {
  id: string;

  exercise_id: string;

  rest_seconds: number;

  notes: string | null;

  superset_group_id: string | null;

  sets: WorkoutSetMutationInput[];
}

export interface WorkoutUpdateInput {
  revision: number;

  name: string;

  notes: string | null;

  exercises: WorkoutExerciseMutationInput[];
}

export interface WorkoutHistoryItem {
  id: string;

  name: string;

  started_at: string;

  completed_at: string;

  duration_seconds: number;

  exercise_count: number;

  completed_set_count: number;

  exercise_names: string[];
}

export interface WorkoutHistoryResponse {
  items: WorkoutHistoryItem[];

  next_cursor: string | null;
}

export interface PreviousSet {
  type: WorkoutSetType;

  weight: number | null;

  weight_unit: WeightUnit;

  reps: number | null;

  rpe: number | null;
}

export interface PreviousExercisePerformance {
  exercise_id: string;

  completed_at: string;

  sets: PreviousSet[];
}

export interface PreviousPerformanceResponse {
  items: PreviousExercisePerformance[];
}
