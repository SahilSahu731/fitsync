
import { db } from "../../config/supabase.js";
import { ApiError, checkDbError } from "../../common/errors.js";

export async function deleteUserAccount(userId: string) {
  const bucket = db.storage.from("profile-images");

  // Collect all objects owned by this user.
  const paths: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await bucket.list(userId, {
      limit: 100,
      offset
    });

    if (error) {
      throw new ApiError(502, "Could not inspect profile storage.");
    }

    const files = (data || [])
      .filter(item => item.name && item.id)
      .map(item => `${userId}/${item.name}`);

    paths.push(...files);

    if (!data || data.length < 100) break;
    offset += 100;
  }

  // Supabase Storage deletion is separate from SQL.
  // A retryable cleanup job should be added before
  // we have large volumes of user-generated media.

  for (let i = 0; i < paths.length; i += 100) {
    const batch = paths.slice(i, i + 100);

    const { error } = await bucket.remove(batch);

    if (error) {
      throw new ApiError(502, "Could not delete profile files.");
    }
  }

  const { data, error } = await db
    .from("app_users")
    .delete()
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  checkDbError(error, "delete account");

  if (!data) {
    throw new ApiError(404, "Account not found.");
  }

  return { deleted: true };
}
