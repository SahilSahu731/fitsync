const fs = require("node:fs");
const path = require("node:path");

function httpsUrl(value) {
  try {
    const url = new URL(value);
    const loopback = /^(localhost|127(?:\.\d+){3}|\[::1\]|0\.0\.0\.0)$/i.test(url.hostname);
    return url.protocol === "https:" && !url.username && !url.password && !loopback
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

function legalUrls(env) {
  const website = httpsUrl(env.EXPO_PUBLIC_WEB_URL);
  return {
    privacyUrl:
      httpsUrl(env.EXPO_PUBLIC_PRIVACY_URL) ||
      (website ? new URL("/privacy", website).toString() : ""),
    termsUrl:
      httpsUrl(env.EXPO_PUBLIC_TERMS_URL) || (website ? new URL("/terms", website).toString() : ""),
  };
}

function releaseIssues(env, { profile = "production", config, root, checkFiles = true } = {}) {
  const issues = [];
  const { privacyUrl, termsUrl } = legalUrls(env);
  const api = httpsUrl(env.EXPO_PUBLIC_API_URL);
  if (!api || !privacyUrl || !termsUrl) {
    issues.push(
      "Release builds require HTTPS EXPO_PUBLIC_API_URL and published privacy/terms URLs (or EXPO_PUBLIC_WEB_URL).",
    );
  } else {
    const url = new URL(api);
    if (/\/api\/?$/.test(url.pathname) || url.search || url.hash)
      issues.push(
        "EXPO_PUBLIC_API_URL must omit the /api suffix, query and fragment; the app adds /api itself.",
      );
  }
  const website = httpsUrl(env.EXPO_PUBLIC_WEB_URL);
  if (
    !website ||
    new URL(website).pathname !== "/" ||
    new URL(website).search ||
    new URL(website).hash
  )
    issues.push(
      "EXPO_PUBLIC_WEB_URL must be a published HTTPS website origin for sharing and the /delete-account page.",
    );
  if (
    !/^\d+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(
      env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? "",
    )
  )
    issues.push(
      "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID must be the configured Google OAuth web client ID.",
    );
  if (!/^goog_[A-Za-z0-9]+$/.test(env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY?.trim() ?? ""))
    issues.push(
      "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY must be the Android public Google Play SDK key (goog_), not a secret or Test Store key.",
    );

  let validDsn = false;
  try {
    const parsed = new URL(env.EXPO_PUBLIC_SENTRY_DSN);
    validDsn =
      parsed.protocol === "https:" &&
      /^[a-zA-Z0-9]+$/.test(parsed.username) &&
      !parsed.password &&
      /\/\d+$/.test(parsed.pathname) &&
      !parsed.search &&
      !parsed.hash;
  } catch {}
  if (
    !env.EXPO_PUBLIC_POSTHOG_KEY?.trim() ||
    !httpsUrl(env.EXPO_PUBLIC_POSTHOG_HOST) ||
    !validDsn ||
    !env.SENTRY_ORG?.trim() ||
    !env.SENTRY_PROJECT?.trim() ||
    !env.SENTRY_AUTH_TOKEN?.trim()
  )
    issues.push(
      "Release builds require PostHog key/HTTPS host, Sentry DSN, SENTRY_ORG, SENTRY_PROJECT and secret SENTRY_AUTH_TOKEN. See docs/observability-setup.md.",
    );
  if (profile === "production" && env.EXPO_PUBLIC_TELEMETRY_DEBUG === "true")
    issues.push("Disable EXPO_PUBLIC_TELEMETRY_DEBUG for production builds.");

  if (checkFiles && config && root) {
    const filename =
      env.GOOGLE_SERVICES_JSON ?? config.android?.googleServicesFile ?? "./google-services.json";
    try {
      const contents = JSON.parse(fs.readFileSync(path.resolve(root, filename), "utf8"));
      if (
        !contents.client?.some(
          (client) =>
            client.client_info?.android_client_info?.package_name === config.android?.package,
        )
      )
        throw new Error("Package mismatch");
    } catch {
      issues.push(
        "GOOGLE_SERVICES_JSON (or google-services.json) must be a readable Firebase configuration containing this Android package. Use an EAS file variable for cloud builds.",
      );
    }
  }
  return issues;
}

module.exports = { httpsUrl, legalUrls, releaseIssues };
