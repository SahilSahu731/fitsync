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
    const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
    let validDsn = false;
    try {
      const parsed = new URL(dsn);
      validDsn =
        parsed.protocol === "https:" &&
        /^[a-zA-Z0-9]+$/.test(parsed.username) &&
        !parsed.password &&
        /\/\d+$/.test(parsed.pathname) &&
        !parsed.search &&
        !parsed.hash;
    } catch {}
    if (
      !process.env.EXPO_PUBLIC_POSTHOG_KEY?.trim() ||
      !https(process.env.EXPO_PUBLIC_POSTHOG_HOST) ||
      !validDsn ||
      !process.env.SENTRY_ORG ||
      !process.env.SENTRY_PROJECT ||
      !process.env.SENTRY_AUTH_TOKEN
    ) {
      throw new Error(
        "Release builds require PostHog key/HTTPS host, Sentry DSN, SENTRY_ORG, SENTRY_PROJECT and secret SENTRY_AUTH_TOKEN. See docs/observability-setup.md.",
      );
    }
    if (
      process.env.EAS_BUILD_PROFILE === "production" &&
      process.env.EXPO_PUBLIC_TELEMETRY_DEBUG === "true"
    ) {
      throw new Error("Disable EXPO_PUBLIC_TELEMETRY_DEBUG for production builds.");
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
      [
        "@sentry/react-native/expo",
        { organization: process.env.SENTRY_ORG, project: process.env.SENTRY_PROJECT },
      ],
      "expo-localization",
    ],
  };
};
