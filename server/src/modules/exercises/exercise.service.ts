
import { z } from "zod";

import { db } from "../../config/supabase.js";
import { ApiError, checkDbError } from "../../common/errors.js";

import {
  deleteStoredExerciseMedia,
  type StoredExerciseMedia
} from "./exercise.media.js";

import {
  exerciseInputSchema,
  type ExerciseInput,
  type ExerciseListInput,
  type MediaMetadata
} from "./exercise.schema.js";

const IMAGE_BUCKET = "exercise-images";

export async function getTaxonomies() {
  const [
    categories,
    activityTypes,
    bodyRegions,
    muscleGroups,
    equipmentTypes
  ] = await Promise.all([
    db.from("exercise_categories")
      .select("code,label")
      .order("sort_order"),

    db.from("exercise_activity_types")
      .select("code,label,category:exercise_categories(code)")
      .order("sort_order"),

    db.from("exercise_body_regions")
      .select("code,label")
      .order("sort_order"),

    db.from("exercise_muscle_groups")
      .select("code,label")
      .order("sort_order"),

    db.from("exercise_equipment_types")
      .select("code,label")
      .order("sort_order")
  ]);

  for (const [name, result] of Object.entries({
    categories,
    activityTypes,
    bodyRegions,
    muscleGroups,
    equipmentTypes
  })) {
    checkDbError(result.error, `load ${name}`);
  }

  return {
    categories: categories.data ?? [],

    activityTypes: (activityTypes.data ?? []).map(item => ({
      code: item.code,
      label: item.label,
      category: (
        item.category as unknown as { code: string }
      ).code
    })),

    bodyRegions: bodyRegions.data ?? [],
    muscleGroups: muscleGroups.data ?? [],
    equipmentTypes: equipmentTypes.data ?? []
  };
}

type CatalogMedia = {
  id: string;
  kind: "image" | "video";
  provider: "supabase" | "cloudinary";
  path: string;
  url: string | null;
  altText: string;
  sourceUrl: string;
  credit: string;
  license: string;
};

function present(row: Record<string, any>) {
  const media: CatalogMedia[] = row.media ?? [];

  const formattedMedia = media.map(item => ({
    id: item.id,
    kind: item.kind,
    provider: item.provider,
    altText: item.altText,
    sourceUrl: item.sourceUrl,
    credit: item.credit,
    license: item.license,

    url: item.provider === "cloudinary"
      ? item.url
      : db.storage
          .from(IMAGE_BUCKET)
          .getPublicUrl(item.path).data.publicUrl
  }));

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,

    category: row.category,
    categoryLabel: row.category_label,
    activityType: row.activity_type,
    activityLabel: row.activity_label,
    bodyRegion: row.body_region,
    regionLabel: row.region_label,

    difficulty: row.difficulty,
    trackingType: row.tracking_type,
    movementPattern: row.movement_pattern,

    primaryMuscles: row.primary_muscles ?? [],
    secondaryMuscles: row.secondary_muscles ?? [],
    equipment: row.equipment ?? [],

    instructions: row.instructions ?? [],
    tips: row.tips ?? [],
    mistakes: row.mistakes ?? [],
    safetyNotes: row.safety_notes ?? [],
    breathingTip: row.breathing_tip ?? "",

    status: row.status,
    media: formattedMedia,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listExercises(
  input: ExerciseListInput,
  admin: boolean
) {
  let query = db
    .from("exercise_catalog")
    .select("*", { count: "exact" });

  if (!(admin && input.includeDrafts === "true")) {
    query = query.eq("status", "published");
  }

  if (input.category) {
    query = query.eq("category", input.category);
  }

  if (input.activityType) {
    query = query.eq("activity_type", input.activityType);
  }

  if (input.bodyRegion) {
    query = query.eq("body_region", input.bodyRegion);
  }

  if (input.difficulty) {
    query = query.eq("difficulty", input.difficulty);
  }

  if (input.equipment) {
    query = query.contains("equipment", [input.equipment]);
  }

  if (input.muscle) {
    query = query.or(
      `primary_muscles.cs.{${input.muscle}},` +
      `secondary_muscles.cs.{${input.muscle}}`
    );
  }

  if (admin && input.status) {
    query = query.eq("status", input.status);
  }

  if (input.q) {
    const search = input.q.replace(/[\\%_]/g, "\\$&");

    query = query.ilike("name", `%${search}%`);
  }

  const from = (input.page - 1) * input.pageSize;
  const to = from + input.pageSize - 1;

  const { data, error, count } = await query
    .order("name")
    .order("id")
    .range(from, to);

  checkDbError(error, "list exercises");

  return {
    items: (data ?? []).map(present),
    total: count ?? 0,
    page: input.page,
    pageSize: input.pageSize
  };
}

// Small, paginated index for instant client-side workout search.
// Avoid loading instructions and other detail-only fields for every keystroke.
export async function listExercisePicker(page: number) {
  const pageSize = 500;
  const { data, error } = await db.from("exercise_catalog")
    .select("id,name,tracking_type,region_label,equipment,primary_muscles,secondary_muscles,media")
    .eq("status", "published")
    .order("name").order("id")
    .range((page - 1) * pageSize, page * pageSize - 1);
  checkDbError(error, "load exercise picker");
  return {
    items: (data ?? []).map(row => {
      const media = (row.media ?? []) as CatalogMedia[];
      const image = media.find(item => item.kind === "image");
      return {
        id: row.id, name: row.name, trackingType: row.tracking_type,
        regionLabel: row.region_label, equipment: row.equipment ?? [],
        primaryMuscles: row.primary_muscles ?? [], secondaryMuscles: row.secondary_muscles ?? [],
        imageUrl: image ? (image.provider === "supabase"
          ? db.storage.from(IMAGE_BUCKET).getPublicUrl(image.path).data.publicUrl
          : image.url) : null
      };
    }),
    hasMore: data?.length === pageSize
  };
}

export async function getExercise(
  idOrSlug: string,
  admin = false
) {
  const field = z.uuid().safeParse(idOrSlug).success
    ? "id"
    : "slug";

  let query = db
    .from("exercise_catalog")
    .select("*")
    .eq(field, idOrSlug);

  if (!admin) {
    query = query.eq("status", "published");
  }

  const { data, error } = await query.maybeSingle();

  checkDbError(error, "get exercise");

  if (!data) {
    throw new ApiError(404, "Exercise not found.");
  }

  return present(data);
}

async function validateTaxonomies(
  input: ExerciseInput
) {
  const tax = await getTaxonomies();

  function ensure(
    code: string,
    options: { code: string }[],
    field: string
  ) {
    if (!options.some(item => item.code === code)) {
      throw new ApiError(
        400,
        `Invalid ${field}: ${code}`
      );
    }
  }

  ensure(input.category, tax.categories, "category");
  ensure(input.bodyRegion, tax.bodyRegions, "body region");

  const activity = tax.activityTypes.find(
    item => item.code === input.activityType
  );

  if (!activity || activity.category !== input.category) {
    throw new ApiError(
      400,
      "Activity type does not belong to the selected category."
    );
  }

  for (const muscle of [
    ...input.primaryMuscles,
    ...input.secondaryMuscles
  ]) {
    ensure(muscle, tax.muscleGroups, "muscle");
  }

  for (const equipment of input.equipment) {
    ensure(equipment, tax.equipmentTypes, "equipment");
  }
}

export async function saveExercise(
  actor: string,
  input: ExerciseInput,
  id: string | null = null
) {
  await validateTaxonomies(input);

  const { data, error } = await db.rpc(
    "save_fitsync_exercise",
    {
      p_id: id,
      p_actor: actor,
      p_data: input
    }
  );

  if (error) {
    if (error.code === "23505") {
      throw new ApiError(
        409,
        "An exercise with this slug already exists."
      );
    }

    if (error.code === "P0002") {
      throw new ApiError(404, "Exercise not found.");
    }

    if (error.code === "42501") {
      throw new ApiError(403, "Admin access required.");
    }

    if (error.code === "22023") {
      throw new ApiError(400, error.message);
    }

    checkDbError(error, "save exercise");
  }

  return getExercise(data as string, true);
}

export async function patchExercise(
  actor: string,
  id: string,
  partial: Partial<ExerciseInput>
) {
  const original = await getExercise(id, true);

  const input = exerciseInputSchema.parse({
    slug: original.slug,
    name: original.name,
    description: original.description,

    category: original.category,
    activityType: original.activityType,
    bodyRegion: original.bodyRegion,

    difficulty: original.difficulty,
    trackingType: original.trackingType,
    movementPattern: original.movementPattern,

    primaryMuscles: original.primaryMuscles,
    secondaryMuscles: original.secondaryMuscles,
    equipment: original.equipment,

    instructions: original.instructions,
    tips: original.tips,
    mistakes: original.mistakes,
    safetyNotes: original.safetyNotes,
    breathingTip: original.breathingTip,

    status: original.status,

    ...partial
  });

  return saveExercise(actor, input, id);
}

export async function addExerciseMedia(
  exerciseId: string,
  asset: StoredExerciseMedia,
  meta: MediaMetadata
) {
  const { error } = await db
    .from("exercise_media")
    .insert({
      exercise_id: exerciseId,

      kind: asset.kind,
      provider: asset.provider,
      storage_path: asset.path,
      delivery_url: asset.url,

      alt_text: meta.altText,
      source_url: meta.sourceUrl,
      credit: meta.credit,
      license: meta.license
    });

  if (error) {
    try {
      await deleteStoredExerciseMedia(asset);
    } catch (cleanupError) {
      console.error("[MEDIA CLEANUP]", cleanupError);
    }

    if (error.code === "23514" && error.message.includes("correct_media_provider")) {
      throw new ApiError(
        503,
        "The database does not allow Cloudinary images yet. Apply server/sql/005_cloudinary_exercise_images.sql in Supabase, then retry this upload."
      );
    }

    checkDbError(error, "insert exercise media");
  }

  return getExercise(exerciseId, true);
}

export async function removeExerciseMedia(
  exerciseId: string,
  mediaId: string
) {
  const { data, error } = await db
    .from("exercise_media")
    .select("provider,storage_path,kind")
    .eq("exercise_id", exerciseId)
    .eq("id", mediaId)
    .maybeSingle();

  checkDbError(error, "get exercise media");

  if (!data) {
    throw new ApiError(404, "Media not found.");
  }

  const exercise = await getExercise(exerciseId, true);

  if (
    exercise.status === "published" &&
    exercise.media.length <= 1
  ) {
    throw new ApiError(
      409,
      "Unpublish this exercise before deleting its last demonstration."
    );
  }

  // Delete the provider asset first, so a failed cleanup can be retried.
  try {
    await deleteStoredExerciseMedia({
      provider: data.provider as "supabase" | "cloudinary",
      path: data.storage_path,
      kind: data.kind as "image" | "video"
    });
  } catch {
    throw new ApiError(502, "Could not remove the media file. Please retry.");
  }

  const deleted = await db
    .from("exercise_media")
    .delete()
    .eq("id", mediaId)
    .eq("exercise_id", exerciseId);

  checkDbError(deleted.error, "delete exercise media");

  return getExercise(exerciseId, true);
}

// Delete only after the admin explicitly chooses permanent deletion.
export async function deleteExercise(id: string) {
  await getExercise(id, true);
  const media = await db.from("exercise_media").select("provider,storage_path,kind").eq("exercise_id", id);
  checkDbError(media.error, "load exercise media");
  // Keep failed assets and their database references retryable.
  for (const asset of media.data ?? []) {
    try {
      await deleteStoredExerciseMedia({ provider: asset.provider, path: asset.storage_path, kind: asset.kind });
    } catch {
      throw new ApiError(502, "Could not remove a media file. Please retry deletion.");
    }
  }
  const result = await db.from("exercises").delete().eq("id", id);
  checkDbError(result.error, "delete exercise");
}
