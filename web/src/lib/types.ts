export type TaxonomyItem = {
  code: string;
  label: string;
};

export type ActivityTypeItem = TaxonomyItem & {
  category: string;
};

export type ExerciseTaxonomies = {
  categories: TaxonomyItem[];
  activityTypes: ActivityTypeItem[];
  bodyRegions: TaxonomyItem[];
  muscleGroups: TaxonomyItem[];
  equipmentTypes: TaxonomyItem[];
};

export type ExerciseMedia = {
  id: string;
  kind: "image" | "video";
  provider: "supabase" | "cloudinary";
  url: string;
  altText: string;
  sourceUrl: string;
  credit: string;
  license: string;
};

export type Exercise = {
  id: string;
  slug: string;
  name: string;
  description: string;

  category: string;
  categoryLabel: string;
  activityType: string;
  activityLabel: string;
  bodyRegion: string;
  regionLabel: string;

  difficulty: "beginner" | "intermediate" | "advanced";

  trackingType:
    | "reps_weight"
    | "reps"
    | "duration"
    | "distance_duration";

  movementPattern:
    | "push"
    | "pull"
    | "squat"
    | "hinge"
    | "lunge"
    | "carry"
    | "rotation"
    | "locomotion"
    | "mobility"
    | "stillness"
    | "other";

  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];

  instructions: string[];
  tips: string[];
  mistakes: string[];
  safetyNotes: string[];
  breathingTip: string;

  status: "draft" | "published" | "archived";
  media: ExerciseMedia[];

  createdAt: string;
  updatedAt: string;
};

export type ExerciseInput = Pick<
  Exercise,
  | "slug"
  | "name"
  | "description"
  | "category"
  | "activityType"
  | "bodyRegion"
  | "difficulty"
  | "trackingType"
  | "movementPattern"
  | "primaryMuscles"
  | "secondaryMuscles"
  | "equipment"
  | "instructions"
  | "tips"
  | "mistakes"
  | "safetyNotes"
  | "breathingTip"
  | "status"
>;

export type ExerciseFilters = {
  q?: string;
  category?: string;
  activityType?: string;
  bodyRegion?: string;
  muscle?: string;
  equipment?: string;
  difficulty?: string;
  includeDrafts?: boolean;
  status?: string;
  page?: number;
  pageSize?: number;
};

export type ExercisePage = {
  items: Exercise[];
  total: number;
  page: number;
  pageSize: number;
};


export type Account = {
  user: { id: string; name: string; email: string; bio: string; avatarUrl: string | null };
  profile: { goal: string; experience: string; gender: string; heightCm: number; weightKg: number; bodyType: string | null; trainingDays: number; minutesPerWorkout: number; equipment: string } | null;
  settings: { weightUnit: "kg" | "lb"; restSeconds: number; workoutReminders: boolean };
};
