
import { apiRequest } from "@/src/services/api";

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

export type ExerciseFilters = {
  q?: string;
  category?: string;
  activityType?: string;
  bodyRegion?: string;
  muscle?: string;
  equipment?: string;
  difficulty?: string;
  page?: number;
  pageSize?: number;
};

export type ExercisePage = {
  items: Exercise[];
  total: number;
  page: number;
  pageSize: number;
};

export function getTaxonomies() {
  return apiRequest<ExerciseTaxonomies>(
    "/exercises/taxonomies"
  );
}

export function getExercises(
  filters: ExerciseFilters = {}
) {
  const params = Object.entries(filters)
    .filter(([, value]) =>
      value !== undefined &&
      value !== ""
    )
    .map(([key, value]) =>
      `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
    );

  const query = params.length
    ? `?${params.join("&")}`
    : "";

  return apiRequest<ExercisePage>(
    `/exercises${query}`
  );
}

export function getExercise(id: string) {
  return apiRequest<Exercise>(
    `/exercises/${encodeURIComponent(id)}`
  );
}

export function pretty(code: string) {
  return code
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, letter => letter.toUpperCase());
}
