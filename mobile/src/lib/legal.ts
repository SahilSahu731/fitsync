function httpsUrl(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

export function resolveLegalUrls(values: { web?: string; privacy?: string; terms?: string }) {
  const web = httpsUrl(values.web);
  return {
    privacy: httpsUrl(values.privacy) ?? (web ? new URL("/privacy", web).toString() : null),
    terms: httpsUrl(values.terms) ?? (web ? new URL("/terms", web).toString() : null),
  };
}

export const legalUrls = resolveLegalUrls({
  web: process.env.EXPO_PUBLIC_WEB_URL,
  privacy: process.env.EXPO_PUBLIC_PRIVACY_URL,
  terms: process.env.EXPO_PUBLIC_TERMS_URL,
});
