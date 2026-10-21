import { requireOptionalNativeModule } from "expo";

const modules = {
  "expo-secure-store": "ExpoSecureStore",
  "expo-image-picker": "ExponentImagePicker"
} as const;

export function getMissingNativeModules(): string[] {
  return Object.entries(modules)
    .filter(([, nativeName]) => !requireOptionalNativeModule(nativeName))
    .map(([packageName]) => packageName);
}

function assertNativeModule(packageName: keyof typeof modules) {
  if (!requireOptionalNativeModule(modules[packageName])) {
    throw new Error(
      `This FitSync build is missing ${packageName}. Install a new Android development build. Restarting Metro alone cannot add native modules.`
    );
  }
}

// These packages throw while being imported if the installed native app is old.
// Load them only after checking the binary, so Expo Router can load every route.
export async function loadSecureStore() {
  assertNativeModule("expo-secure-store");
  // Keep startup local: dynamic import triggers a second Metro request in dev.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("expo-secure-store") as typeof import("expo-secure-store");
}

export async function loadImagePicker() {
  assertNativeModule("expo-image-picker");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("expo-image-picker") as typeof import("expo-image-picker");
}
