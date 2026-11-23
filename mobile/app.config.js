// Default to secure networking, including local release builds without an EAS profile.
module.exports = ({ config }) => {
  const https = (value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password ? url.toString() : "";
    } catch {
      return "";
    }
  };
  const website = https(process.env.EXPO_PUBLIC_WEB_URL);
  const privacyUrl =
    https(process.env.EXPO_PUBLIC_PRIVACY_URL) ||
    (website ? new URL("/privacy", website).toString() : "");
  const termsUrl =
    https(process.env.EXPO_PUBLIC_TERMS_URL) ||
    (website ? new URL("/terms", website).toString() : "");
  if (process.env.EAS_BUILD === "true" && process.env.EAS_BUILD_PROFILE !== "development") {
    if (!https(process.env.EXPO_PUBLIC_API_URL) || !privacyUrl || !termsUrl) {
      throw new Error(
        "Release builds require HTTPS EXPO_PUBLIC_API_URL and published privacy/terms URLs (or EXPO_PUBLIC_WEB_URL).",
      );
    }
  }
  return {
    ...config,

    android: {
      ...config.android,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
    },

    plugins: [
      ...(config.plugins ?? []).map((plugin) => {
        if (!Array.isArray(plugin) || plugin[0] !== "expo-build-properties") return plugin;
        return [
          plugin[0],
          {
            ...plugin[1],
            android: {
              ...plugin[1]?.android,
              usesCleartextTraffic: process.env.EAS_BUILD_PROFILE === "development",
            },
          },
        ];
      }),
      ["./plugins/with-health-privacy", { privacyUrl }],
    ],
  };
};
