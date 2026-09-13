import * as SecureStore from "expo-secure-store";

import * as z from "zod";

import type { User } from "./types";

const USER_STORAGE_KEY = "fitsync.auth.user.v1";

const cachedUserSchema = z.object({
  id: z.string(),

  email: z.string(),

  display_name: z.string().nullable(),

  username: z.string().nullable(),

  avatar_url: z.string().nullable(),

  email_verified: z.boolean(),

  onboarding_complete: z.boolean(),

  fitness_goal: z.string().nullable(),

  experience_level: z.string().nullable(),

  weight_unit: z.enum(["KG", "LB"]),

  weekly_workout_target: z.number(),

  created_at: z.string(),
});

export async function saveCachedUser(user: User): Promise<void> {
  await SecureStore.setItemAsync(
    USER_STORAGE_KEY,

    JSON.stringify(user),
  );
}

export async function getCachedUser(): Promise<User | null> {
  let raw: string | null;

  try {
    raw = await SecureStore.getItemAsync(USER_STORAGE_KEY);
  } catch {
    return null;
  }

  if (!raw) {
    return null;
  }

  try {
    const parsed = cachedUserSchema.safeParse(JSON.parse(raw));

    if (!parsed.success) {
      await clearCachedUser();

      return null;
    }

    return parsed.data as User;
  } catch {
    await clearCachedUser();

    return null;
  }
}

export async function clearCachedUser(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(USER_STORAGE_KEY);
  } catch {
    // Best effort.
  }
}
