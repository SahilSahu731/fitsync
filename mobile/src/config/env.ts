const rawApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();

if (!rawApiUrl) {
  throw new Error("EXPO_PUBLIC_API_URL is missing.");
}

if (!googleWebClientId) {
  throw new Error("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is missing.");
}

export const env = {
  apiUrl: rawApiUrl.replace(/\/+$/, ""),

  googleWebClientId,
} as const;
