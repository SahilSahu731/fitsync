const rawApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

if (!rawApiUrl) {
  throw new Error(
    "EXPO_PUBLIC_API_URL is missing. " +
      "Create mobile/.env and add your FastAPI URL.",
  );
}

export const env = {
  apiUrl: rawApiUrl.replace(/\/+$/, ""),
} as const;
