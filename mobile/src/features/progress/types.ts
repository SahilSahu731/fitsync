export type ProgressRange = "7D" | "4W" | "12W" | "6M" | "1Y" | "ALL";

export type MuscleRange = "7D" | "4W" | "12W";

export type PersonalRecordType =
  "WEIGHT" | "ESTIMATED_1RM" | "REPS_AT_WEIGHT" | "SET_VOLUME";

export type WeightUnit = "KG" | "LB";

export interface ProgressPreferences {
  timezone: string;

  weekly_workout_target: number;

  weight_unit: WeightUnit;
}

export interface WeeklyGoal {
  target: number;

  completed: number;

  remaining: number;

  percentage: number;

  week_start: string;

  week_end: string;

  current_streak: number;

  best_streak: number;

  weeks_goal_met: number;

  total_training_weeks: number;
}

export interface ProgressTotals {
  workouts: number;

  working_sets: number;

  volume: number;

  duration_seconds: number;
}

export interface ProgressComparison {
  workouts_change: number | null;

  working_sets_change: number | null;

  volume_change: number | null;
}

export interface WeeklyProgressPoint {
  week_start: string;

  workout_count: number;

  working_sets: number;

  volume: number;

  duration_seconds: number;
}

export interface MuscleGroupProgressItem {
  muscle: string;

  estimated_sets: number;

  exercise_count: number;
}

export interface TopExerciseProgressItem {
  exercise_id: string;

  exercise_name: string;

  session_count: number;

  latest_best_e1rm: number | null;

  change_percent: number | null;
}

export interface PersonalRecord {
  id: string;

  exercise_id: string;

  exercise_name: string;

  workout_session_id: string;

  set_id: string;

  record_type: PersonalRecordType;

  value: number;

  weight: number;

  weight_unit: WeightUnit;

  reps: number;

  estimated_1rm: number | null;

  set_volume: number | null;

  created_at: string;
}

export interface PersonalRecordListResponse {
  items: PersonalRecord[];

  next_cursor: string | null;
}

export interface WorkoutPersonalRecordsResponse {
  items: PersonalRecord[];
}

export interface ProgressOverview {
  period: {
    range: ProgressRange;

    start: string | null;

    end: string;
  };

  weight_unit: WeightUnit;

  totals: ProgressTotals;

  comparison: ProgressComparison;

  weekly_goal: WeeklyGoal;

  recent_prs: PersonalRecord[];

  top_exercises: TopExerciseProgressItem[];

  weekly_volume: WeeklyProgressPoint[];

  muscle_groups: MuscleGroupProgressItem[];
}

export interface ExerciseProgressPoint {
  workout_session_id: string;

  completed_at: string;

  best_weight: number | null;

  best_estimated_1rm: number | null;

  volume: number;

  working_sets: number;
}

export interface ExerciseProgress {
  range: ProgressRange;

  weight_unit: WeightUnit;

  exercise: {
    id: string;

    name: string;

    primary_muscles: string[];

    equipment: string[];

    thumbnail_url: string | null;
  };

  summary: {
    session_count: number;

    working_set_count: number;

    total_volume: number;

    heaviest_weight: number | null;

    best_estimated_1rm: number | null;

    best_set_volume: number | null;

    most_reps: number | null;
  };

  current_records: {
    heaviest_weight: number | null;

    best_estimated_1rm: number | null;

    best_set_volume: number | null;

    most_reps: number | null;
  };

  points: ExerciseProgressPoint[];
}

export interface ExerciseSessionSet {
  type: string;

  weight: number | null;

  weight_unit: WeightUnit;

  reps: number | null;

  rpe: number | null;
}

export interface ExerciseSession {
  workout_session_id: string;

  workout_name: string;

  completed_at: string;

  sets: ExerciseSessionSet[];
}

export interface ExerciseSessionListResponse {
  items: ExerciseSession[];

  next_cursor: string | null;
}

export interface ActivityCalendarDay {
  date: string;

  workout_count: number;

  working_sets: number;

  volume: number;
}

export interface ActivityCalendarResponse {
  items: ActivityCalendarDay[];
}

export interface MuscleGroupProgressResponse {
  range: MuscleRange;

  items: MuscleGroupProgressItem[];
}
