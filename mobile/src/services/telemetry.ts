import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sentry from "@sentry/react-native";
import PostHog from "posthog-react-native";
import { requireOptionalNativeModule } from "expo";
import {
  parseTelemetry,
  safeProperties,
  scrubCrash,
  TELEMETRY_DEFAULTS,
  type TelemetryPreferences,
} from "./telemetry-model";

const KEY = "fitsync.telemetry.v1";
let preferences = { ...TELEMETRY_DEFAULTS };
let ready = false;
let client: PostHog | null = null;
let initialization: Promise<void> | null = null;
let sentryStarted = false;
let writes = Promise.resolve();
const active = () => !__DEV__ || process.env.EXPO_PUBLIC_TELEMETRY_DEBUG === "true";

function releaseInfo() {
  try {
    if (!requireOptionalNativeModule("ExpoApplication")) return {};
    // Older installed binaries can still start without this newly added module.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const app = require("expo-application") as typeof import("expo-application");
    if (!app.applicationId || !app.nativeApplicationVersion || !app.nativeBuildVersion) return {};
    return {
      release: `${app.applicationId}@${app.nativeApplicationVersion}+${app.nativeBuildVersion}`,
      dist: app.nativeBuildVersion,
    };
  } catch {
    return {};
  }
}

function initializeCrashReporting() {
  if (sentryStarted || !active() || !preferences.diagnostics || !process.env.EXPO_PUBLIC_SENTRY_DSN)
    return;
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    ...releaseInfo(),
    environment: __DEV__
      ? "development"
      : process.env.EXPO_PUBLIC_TELEMETRY_DEBUG === "true"
        ? "preview"
        : "production",
    sendDefaultPii: false,
    // JS fatal and handled errors only. Keep every event behind the same scrub
    // and device preference; native disk crash envelopes bypass JS beforeSend.
    enableNative: false,
    enableNativeCrashHandling: false,
    enableAutoSessionTracking: false,
    maxBreadcrumbs: 0,
    attachStacktrace: true,
    enableAutoPerformanceTracing: false,
    integrations: (defaults) =>
      defaults.filter((integration) => !["Breadcrumbs", "HttpContext"].includes(integration.name)),
    beforeBreadcrumb: () => null,
    beforeSend: (event) => (ready && preferences.diagnostics ? scrubCrash(event) : null),
  });
  sentryStarted = true;
}
function analyticsClient() {
  if (!active() || !ready || !preferences.analytics || !process.env.EXPO_PUBLIC_POSTHOG_KEY)
    return null;
  if (!client)
    client = new PostHog(process.env.EXPO_PUBLIC_POSTHOG_KEY, {
      host: process.env.EXPO_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      captureAppLifecycleEvents: false,
      enableSessionReplay: false,
      preloadFeatureFlags: false,
      personProfiles: "never",
      disableGeoip: true,
      customStorage: AsyncStorage,
    });
  return client;
}
export function initializeTelemetry() {
  return (initialization ??= AsyncStorage.getItem(KEY)
    .then((value) => {
      preferences = parseTelemetry(value);
      ready = true;
      try {
        initializeCrashReporting();
      } catch {
        /* Vendor initialization cannot block the app. */
      }
      try {
        analyticsClient();
      } catch {
        /* Error reporting remains available if analytics fails. */
      }
    })
    .catch(() => {
      ready = false;
    }));
}
export async function telemetryPreferences() {
  await initializeTelemetry();
  return { ...preferences };
}
export async function updateTelemetry(patch: Partial<TelemetryPreferences>) {
  const operation = writes.then(async () => {
    await initializeTelemetry();
    const next = { ...preferences, ...patch };
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    preferences = next;
    ready = true;
    if (!next.analytics && client) await client.optOut();
    else if (next.analytics && client) await client.optIn();
    initializeCrashReporting();
    analyticsClient();
  });
  writes = operation.catch(() => { });
  await operation;
  return { ...preferences };
}
export function trackEvent(name: string, properties: Record<string, unknown> = {}) {
  if (!/^[a-z_]{1,60}$/.test(name)) return;
  try {
    analyticsClient()?.capture(name, safeProperties(properties));
  } catch {
    /* Never block training. */
  }
}
export function recordError(error: unknown, context = "operation") {
  if (!ready || !preferences.diagnostics || !sentryStarted) return;
  try {
    Sentry.captureException(error, { tags: { action: context } });
  } catch {
    /* Never block training. */
  }
}
export const flushTelemetry = () => {
  try {
    void client?.flush().catch(() => { });
  } catch { }
};
export const withCrashReporting = Sentry.wrap;
