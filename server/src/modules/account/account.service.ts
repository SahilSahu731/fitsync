
import { db } from "../../config/supabase.js";
import { ApiError, checkDbError } from "../../common/errors.js";

async function clearOwnedStorage(userId: string, bucketName: string, optional = false) {
  const bucket = db.storage.from(bucketName);

  // Collect all objects owned by this user.
  const paths: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await bucket.list(userId, {
      limit: 100,
      offset
    });

    if (error) {
      // Older installations may not have deployed the companion migration yet.
      if (optional && /bucket.*not found/i.test(error.message)) return;
      throw new ApiError(502, "Could not inspect your private image storage.");
    }

    const files = (data || [])
      .filter(item => item.name && item.id)
      .map(item => `${userId}/${item.name}`);

    paths.push(...files);

    if (!data || data.length < 100) break;
    offset += 100;
  }

  // Collect before removing so offset pagination cannot skip objects.
  for (let i = 0; i < paths.length; i += 100) {
    const batch = paths.slice(i, i + 100);

    const { error } = await bucket.remove(batch);

    if (error) {
      throw new ApiError(502, "Could not delete your private image files. Please retry account deletion.");
    }
  }
}

export async function deleteUserAccount(userId: string) {
  await clearOwnedStorage(userId, "profile-images");
  await clearOwnedStorage(userId, "progress-photos", true);

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
