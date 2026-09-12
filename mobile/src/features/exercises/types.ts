export type ExerciseSource = "SYSTEM" | "CUSTOM";

export type MuscleGroup =
  | "CHEST"
  | "BACK"
  | "LATS"
  | "TRAPS"
  | "LOWER_BACK"
  | "SHOULDERS"
  | "FRONT_DELTS"
  | "SIDE_DELTS"
  | "REAR_DELTS"
  | "BICEPS"
  | "TRICEPS"
  | "FOREARMS"
  | "QUADS"
  | "HAMSTRINGS"
  | "GLUTES"
  | "CALVES"
  | "ABS"
  | "OBLIQUES"
  | "FULL_BODY"
  | "OTHER";

export type Equipment =
  | "BARBELL"
  | "DUMBBELL"
  | "MACHINE"
  | "CABLE"
  | "SMITH_MACHINE"
  | "BODYWEIGHT"
  | "KETTLEBELL"
  | "EZ_BAR"
  | "TRAP_BAR"
  | "BANDS"
  | "PLATE"
  | "OTHER"
  | "NONE";

export type ExerciseMechanic = "COMPOUND" | "ISOLATION";

export type MovementPattern =
  | "HORIZONTAL_PUSH"
  | "VERTICAL_PUSH"
  | "HORIZONTAL_PULL"
  | "VERTICAL_PULL"
  | "SQUAT"
  | "HINGE"
  | "LUNGE"
  | "CARRY"
  | "ROTATION"
  | "CORE"
  | "OTHER";

export interface ExerciseMedia {
  id: string;

  type: "IMAGE" | "VIDEO";

  public_id: string;

  secure_url: string;

  thumbnail_url: string;

  width: number | null;

  height: number | null;

  duration_seconds: number | null;

  format: string | null;

  sort_order: number;
}

export interface Exercise {
  id: string;

  source: ExerciseSource;

  name: string;

  description: string | null;

  primary_muscles: MuscleGroup[];

  secondary_muscles: MuscleGroup[];

  equipment: Equipment[];

  mechanic: ExerciseMechanic;

  movement_pattern: MovementPattern;

  instructions: string[];

  tips: string[];

  media: ExerciseMedia[];

  is_custom: boolean;

  can_edit: boolean;
}

export interface ExerciseFilters {
  q?: string;

  muscle?: MuscleGroup | null;

  equipment?: Equipment | null;

  source?: ExerciseSource | null;
}

export interface ExerciseListResponse {
  items: Exercise[];

  next_cursor: string | null;
}

export interface ExerciseMediaInput {
  type: "IMAGE" | "VIDEO";

  public_id: string;

  width: number | null;

  height: number | null;

  duration_seconds: number | null;

  format: string | null;

  sort_order: number;
}

export interface ExerciseMutationInput {
  name: string;

  description: string | null;

  primary_muscles: MuscleGroup[];

  secondary_muscles: MuscleGroup[];

  equipment: Equipment[];

  mechanic: ExerciseMechanic;

  movement_pattern: MovementPattern;

  instructions: string[];

  tips: string[];

  media: ExerciseMediaInput[];
}
