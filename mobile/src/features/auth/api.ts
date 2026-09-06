import { Platform } from "react-native";

import { apiClient, publicApiClient } from "@/lib/api/client";

import type { EmailAuthResponse, EmailStartResponse, User } from "./types";

type ClientPlatform = "ios" | "android" | "web" | "unknown";

function getPlatform(): ClientPlatform {
  switch (Platform.OS) {
    case "ios":
      return "ios";

    case "android":
      return "android";

    case "web":
      return "web";

    default:
      return "unknown";
  }
}

export async function startEmailAuth(
  email: string,
): Promise<EmailStartResponse> {
  const response = await publicApiClient.post<EmailStartResponse>(
    "/auth/email/start",
    {
      email: email.trim().toLowerCase(),
    },
  );

  return response.data;
}

export async function verifyEmailCode(input: {
  challengeId: string;

  code: string;
}): Promise<EmailAuthResponse> {
  const response = await publicApiClient.post<EmailAuthResponse>(
    "/auth/email/verify",
    {
      challenge_id: input.challengeId,

      code: input.code,

      platform: getPlatform(),
    },
  );

  return response.data;
}

export async function getMe(): Promise<User> {
  const response = await apiClient.get<User>("/auth/me");

  return response.data;
}

export async function logoutRequest(): Promise<void> {
  await apiClient.post("/auth/logout");
}
