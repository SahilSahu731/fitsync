
import { File } from "expo-file-system";
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
  page?: number;
  pageSize?: number;
};

export type ExercisePage = {
  items: Exercise[];
  total: number;
  page: number;
  pageSize: number;
};

export function getExercisePermissions() {
  return apiRequest<{
    canManageExercises: boolean;
  }>("/exercises/permissions");
}

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
      value !== "" &&
      value !== false
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

export function createExercise(input: ExerciseInput) {
  return apiRequest<Exercise>("/exercises", {
    method: "POST",
    json: input
  });
}

export function editExercise(
  id: string,
  input: Partial<ExerciseInput>
) {
  return apiRequest<Exercise>(
    `/exercises/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      json: input
    }
  );
}

export async function uploadExerciseMedia(
  id: string,
  uri: string,
  mimeType: string,
  metadata: {
    altText?: string;
    sourceUrl?: string;
    credit?: string;
    license: string;
  }
) {
  const accepted = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4"
  ];

  if (!accepted.includes(mimeType)) {
    throw new Error("Select a JPEG, PNG, WebP or MP4 file.");
  }

  const file = new File(uri);

  if (file.size > 25 * 1024 * 1024) {
    throw new Error("Media must be no larger than 25 MB.");
  }

  const form = new FormData();

  form.append("media", file);

  form.append("altText", metadata.altText ?? "");
  form.append("sourceUrl", metadata.sourceUrl ?? "");
  form.append("credit", metadata.credit ?? "");
  form.append("license", metadata.license);

  return apiRequest<Exercise>(
    `/exercises/${id}/media`,
    {
      method: "POST",
      form
    }
  );
}

export function deleteExerciseMedia(
  id: string,
  mediaId: string
) {
  return apiRequest<Exercise>(
    `/exercises/${id}/media/${mediaId}`,
    {
      method: "DELETE"
    }
  );
}

export function pretty(code: string) {
  return code
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, letter => letter.toUpperCase());
}
