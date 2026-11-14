import { db } from "../../config/supabase.js";
import { ApiError, checkDbError } from "../../common/errors.js";
import { present, validateTaxonomies } from "./exercise.service.js";
import type { CustomExerciseInput } from "./custom.schema.js";
function checked(error: { code?: string; message: string } | null) {
  if (["42P01", "42703", "PGRST202", "PGRST204"].includes(error?.code ?? ""))
    throw new ApiError(
      503,
      "Custom exercises need the current server and custom-exercise migration. Your existing workouts are unchanged.",
    );
  if (error?.code === "P0002") throw new ApiError(404, "Exercise not found.");
  if (error?.code === "22023") throw new ApiError(400, error.message);
  checkDbError(error, "custom exercise");
}
export async function customList(owner: string) {
  const items = [];
  for (let offset = 0; ; offset += 200) {
    const result = await db
      .from("exercise_catalog")
      .select("*")
      .eq("owner_user_id", owner)
      .order("name")
      .order("id")
      .range(offset, offset + 199);
    checked(result.error);
    items.push(...(result.data ?? []).map(present));
    if ((result.data?.length ?? 0) < 200) break;
  }
  return items;
}
export async function customSave(
  owner: string,
  input: CustomExerciseInput,
  id: string | null = null,
) {
  await validateTaxonomies({ ...input, slug: "custom", status: "published" });
  const result = await db.rpc("save_fitsync_custom_exercise", {
    p_actor: owner,
    p_id: id,
    p_data: input,
  });
  checked(result.error);
  const saved = await db
    .from("exercise_catalog")
    .select("*")
    .eq("id", result.data)
    .eq("owner_user_id", owner)
    .single();
  checked(saved.error);
  return present(saved.data!);
}
export async function customArchive(owner: string, id: string) {
  const result = await db
    .from("exercises")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_user_id", owner)
    .select("id");
  checked(result.error);
  if (!result.data?.length) throw new ApiError(404, "Exercise not found.");
}
export async function muscleIndex(owner: string, page: number) {
  const result = await db
    .from("exercise_catalog")
    .select("id,primary_muscles,secondary_muscles,movement_pattern")
    .or(`and(owner_user_id.is.null,status.eq.published),owner_user_id.eq.${owner}`)
    .order("id")
    .range((page - 1) * 200, page * 200 - 1);
  checked(result.error);
  return {
    items: (result.data ?? []).map((e) => ({
      id: e.id,
      primaryMuscles: e.primary_muscles,
      secondaryMuscles: e.secondary_muscles,
      movementPattern: e.movement_pattern,
    })),
    hasMore: (result.data?.length ?? 0) === 200,
  };
}

export async function customRestore(owner: string, id: string) {
  const result = await db
    .from("exercises")
    .update({ status: "published", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_user_id", owner)
    .select("id");
  checked(result.error);
  if (!result.data?.length) throw new ApiError(404, "Exercise not found.");
}
