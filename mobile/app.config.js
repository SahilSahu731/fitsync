// Default to secure networking, including local release builds without an EAS profile.
const { legalUrls, releaseIssues } = require("./scripts/release-config.cjs");

module.exports = ({ config }) => {
  const { privacyUrl } = legalUrls(process.env);
  if (process.env.EAS_BUILD === "true" && process.env.EAS_BUILD_PROFILE !== "development") {
    const issues = releaseIssues(process.env, {
      profile: process.env.EAS_BUILD_PROFILE,
      config,
      root: __dirname,
    });
    if (issues.length) throw new Error(issues.join("\n"));
  }
  return {
    ...config,

    android: {
      ...config.android,
      blockedPermissions: [
        ...(config.android?.blockedPermissions ?? []),
        ...(process.env.EAS_BUILD_PROFILE === "development"
          ? []
          : ["android.permission.SYSTEM_ALERT_WINDOW"]),
      ],
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
