import { apiClient } from "@/lib/api/client";

import type { User } from "@/features/auth/types";

import type {
  OnboardingInput,
  PreferencesUpdateInput,
  ProfileUpdateInput,
  UsernameAvailability,
} from "./types";

export async function completeOnboarding(
  input: OnboardingInput,
): Promise<User> {
  const response = await apiClient.patch<User>("/users/me/onboarding", input);

  return response.data;
}

export async function updateProfile(input: ProfileUpdateInput): Promise<User> {
  const response = await apiClient.patch<User>("/users/me/profile", input);

  return response.data;
}

export async function updatePreferences(
  input: PreferencesUpdateInput,
): Promise<User> {
  const response = await apiClient.patch<User>("/users/me/preferences", input);

  return response.data;
}

export async function checkUsernameAvailability(
  username: string,
): Promise<UsernameAvailability> {
  const response = await apiClient.get<UsernameAvailability>(
    `/users/usernames/${encodeURIComponent(username)}/availability`,
  );

  return response.data;
}

export async function deleteAccount(): Promise<void> {
  await apiClient.delete("/users/me", {
    data: {
      confirmation: "DELETE",
    },
  });
}
