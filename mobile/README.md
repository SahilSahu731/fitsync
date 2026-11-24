# FitSync Android

FitSync uses Expo SDK 57 and React Native. Routes live in `src/app`; features,
storage, and services live outside the route tree. Android is the supported
shipping platform. Use the installed FitSync development client for native
Google sign-in, Health Connect, billing, and widgets.

## Setup and checks

From `mobile/`, install the locked dependencies with `npm ci`, then copy
`.env.example` to `.env` and configure the API and Google sign-in settings.
The backend address must be reachable from the phone. See
[the development and release guide](../docs/mobile-upgrade.md) for native builds,
environment settings, and Play sandbox configuration.

```sh
npm run start:clean
npm run typecheck
npm run lint
npm test
npx expo export --platform android --max-workers 2 --output-dir /tmp/fitsync-android-export
```

An Android JavaScript export checks the production bundle; native permissions,
Health Connect, billing, and widget behavior also need an installed Android build.
The OTA runtime uses Expo's fingerprint policy so native changes receive a new
runtime even when the marketing version stays the same. Changing runtime policy
or native configuration requires a new binary before compatible updates can run.

## Development QR says host unreachable

When your phone cannot open the computer's Metro address, use tunnel mode from
`mobile/`:

```bash
npm run start:tunnel
```

Keep the terminal running and scan the new QR in the installed FitSync development
app. Both devices need internet access. The project includes `@expo/ngrok` as a
local development dependency, so Expo does not need to install it globally. Run
`npm ci` first after a fresh checkout. No APK rebuild is needed for this tooling
change.

The tunnel forwards Metro, not the backend API. If the app opens but API requests
fail, `EXPO_PUBLIC_API_URL` must also point to an address reachable from the phone.

## Android minimum SDK build failure

FitSync requires Android 8.0 (API 26) or newer. Health Connect's native SDK requires
minimum SDK 26; `app.json` sets this through the existing `expo-build-properties`
plugin so Expo generates the correct Gradle configuration.

If a build failed with `uses-sdk:minSdkVersion 24 cannot be smaller than version 26`,
rebuild from `mobile/`:

```bash
npm run build:android:dev -- --clear-cache
```

Install the new APK, then run `npm run start:clean`. The SDK setting is native
configuration and requires a new binary.

## Missing native modules in an Android development build

`Cannot find native module 'ExpoSecureStore'` or `'ExponentImagePicker'` means
the installed Android binary does not include the packages used by the current
JavaScript. Both dependencies and config plugins are already configured. A Metro
reload or `npm install` cannot add native code to an installed app.

From `mobile/`:

1. Run `npm run build:android:dev`.
2. Install the APK from the completed EAS build on your device.
3. Run `npm run start:clean` and open the project in that development client.

Use the FitSync development client, not Expo Go (Google Sign-In requires native
code). An outdated client now shows one update message instead of cascading
Router “missing default export” and `ErrorBoundary` errors. Refresh tokens remain
in SecureStore; there is no fallback to unencrypted storage.

Run `npm run test:native` to check missing-module detection and safe loading.

## FitSync styling and launch assets

Run commands from `mobile/`.

- NativeWind scans `src/**/*.{js,jsx,ts,tsx}`. Keep screen and component classes in that tree.
- After changing Tailwind or Metro configuration, restart with `npm start -- --clear`.
- Replace the shared transparent logo in `../brand/mark.png`, then run `npm run assets:generate` to regenerate the app icon, Android adaptive/themed icons, splash image, favicon, and the bundled `assets/brand/mark.png`.
- The native splash holds until fonts, session restoration, layout, and the logo image are ready. `src/components/brand-reveal.tsx` then plays a short pulse and wordmark reveal; reduced-motion users skip it.
- Launcher icons are static assets. The animation runs during app launch.
- Native icon and splash configuration changes require a new Android build. To test the release splash, build an internal preview with `npx eas-cli@latest build --platform android --profile preview`, then install it. Expo Go and development builds do not reproduce the complete native splash experience.
- Validate with `npm run typecheck` and `npm run lint`.

## Glass tabs, branding, calendar and billing upgrade

See [the rebuild and device-test guide](../docs/mobile-upgrade.md) for the new native modules, EAS environment configuration, development APK rebuild, Play sandbox setup, and verification checklist. The shared transparent logo source is `../brand/mark.png`; regenerate all mobile and website assets, including the bundled `assets/brand/mark.png`, with `npm run assets:generate`.
