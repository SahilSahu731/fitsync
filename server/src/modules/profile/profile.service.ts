
import type { z } from "zod";

import { db } from "../../config/supabase.js";
import { ApiError, checkDbError } from "../../common/errors.js";

import {
  onboardingSchema,
  editFitnessSchema,
  editUserSchema,
  settingsSchema
} from "./profile.schema.js";

type OnboardingInput = z.infer<typeof onboardingSchema>;
type EditFitnessInput = z.infer<typeof editFitnessSchema>;
type EditUserInput = z.infer<typeof editUserSchema>;
type SettingsInput = z.infer<typeof settingsSchema>;

export async function getFullUser(userId: string) {
  const [accountResult, fitnessResult, settingsResult] =
    await Promise.all([
      db.from("app_users")
        .select("*")
        .eq("id", userId)
        .maybeSingle(),

      db.from("fitness_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),

      db.from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle()
    ]);

  checkDbError(accountResult.error, "load account");
  checkDbError(fitnessResult.error, "load fitness profile");
  checkDbError(settingsResult.error, "load user settings");

  const account = accountResult.data;
  const fitness = fitnessResult.data;
  const settings = settingsResult.data;

  if (!account) {
    throw new ApiError(404, "Account not found.");
  }

  let avatarUrl: string | null = account.google_photo_url || null;

  if (account.avatar_path) {
    const { data, error } = await db.storage
      .from("profile-images")
      .createSignedUrl(account.avatar_path, 3600);

    if (!error && data) {
      avatarUrl = data.signedUrl;
    }
  }

  return {
    user: {
      id: account.id,
      email: account.email,
      name: account.display_name,
      bio: account.bio,
      avatarUrl,
      hasCustomAvatar: Boolean(account.avatar_path),
      createdAt: account.created_at
    },

    profile: fitness
      ? {
          goal: fitness.goal,
          experience: fitness.experience,
          gender: fitness.gender,

          heightCm: Number(fitness.height_cm),
          weightKg: Number(fitness.weight_kg),
          bodyType: fitness.body_type || null,

          trainingDays: fitness.training_days,
          minutesPerWorkout: fitness.minutes_per_workout,
          equipment: fitness.equipment,
          completedAt: fitness.completed_at
        }
      : null,

    settings: {
      weightUnit: settings?.weight_unit || "kg",
      restSeconds: settings?.rest_seconds || 90,
      workoutReminders: settings?.workout_reminders ?? false
    }
  };
}

export async function updateAccount(
  userId: string,
  input: EditUserInput
) {
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };

  if (input.name !== undefined) {
    updates.display_name = input.name;
  }

  if (input.bio !== undefined) {
    updates.bio = input.bio;
  }

  const { error } = await db
    .from("app_users")
    .update(updates)
    .eq("id", userId);

  checkDbError(error, "update account");

  return getFullUser(userId);
}

export async function saveOnboarding(
  userId: string,
  input: OnboardingInput
) {
  const { error } = await db
    .from("fitness_profiles")
    .upsert({
      user_id: userId,
      goal: input.goal,
      experience: input.experience,
      gender: input.gender,

      height_cm: input.heightCm,
      weight_kg: input.weightKg,
      body_type: input.bodyType ?? null,

      training_days: input.trainingDays,
      minutes_per_workout: input.minutesPerWorkout,
      equipment: input.equipment,
      updated_at: new Date().toISOString()
    }, {
      onConflict: "user_id"
    });

  checkDbError(error, "save onboarding");

  return getFullUser(userId);
}

export async function updateFitnessProfile(
  userId: string,
  input: EditFitnessInput
) {
  const fields: Record<string, string> = {
    goal: "goal",
    experience: "experience",
    gender: "gender",
    heightCm: "height_cm",
    weightKg: "weight_kg",
    bodyType: "body_type",
    trainingDays: "training_days",
    minutesPerWorkout: "minutes_per_workout",
    equipment: "equipment"
  };

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };

  for (const [field, value] of Object.entries(input)) {
    updates[fields[field]] = value;
  }

  const { data, error } = await db
    .from("fitness_profiles")
    .update(updates)
    .eq("user_id", userId)
    .select("user_id")
    .maybeSingle();

  checkDbError(error, "update fitness profile");

  if (!data) {
    throw new ApiError(404, "Complete onboarding first.");
  }

  return getFullUser(userId);
}

export async function resetOnboarding(userId: string) {
  const { error } = await db
    .from("fitness_profiles")
    .delete()
    .eq("user_id", userId);

  checkDbError(error, "reset onboarding");

  return getFullUser(userId);
}

export async function updateUserSettings(
  userId: string,
  input: SettingsInput
) {
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };

  if (input.weightUnit !== undefined) {
    updates.weight_unit = input.weightUnit;
  }

  if (input.restSeconds !== undefined) {
    updates.rest_seconds = input.restSeconds;
  }

  if (input.workoutReminders !== undefined) {
    updates.workout_reminders = input.workoutReminders;
  }

  const { error } = await db
    .from("user_settings")
    .update(updates)
    .eq("user_id", userId);

  checkDbError(error, "update settings");

  return getFullUser(userId);
}
