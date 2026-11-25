# FitSync Android release

The repository is prepared for a store build, but it is **not ready to publish**.
No signed AAB, Play upload, store purchase, native device run or final store approval
was produced in this preparation pass. A JavaScript export does not establish those results.

Verified locally: 728 mobile tests, lint, typecheck and Android Hermes export passed.
Expo native introspection passed. The production preflight correctly reports the
missing/invalid configuration below. The offline SDK package check reported up to
date while warning that offline validation is unreliable; no live Expo Doctor or
native Gradle dependency-resolution claim is made.
An isolated clean npm10 install also passed after `.npmrc` set `install-links=true`,
preserving the lockfile's packed local dependencies; retain that setting in CI/EAS.
See [the vendored dependency notes](../mobile/vendor/README.md).

## Actual blockers

A read-only check of the existing Expo login succeeded. Production EAS project
variables contain only `GOOGLE_SERVICES_JSON` (secret file); production account-wide
variables are empty. No variable values or file contents were displayed. Configure
the following in the **production EAS environment**, not just a local ignored dotenv file:

| Required setting                                         | Purpose                                                                                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_API_URL`                                    | Public HTTPS API base, without `/api`; production server and migrations must already be deployed.                               |
| `EXPO_PUBLIC_WEB_URL`                                    | Public HTTPS website origin serving `/privacy`, `/terms` and `/delete-account`; also used for revocable shared training links.  |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`                       | Google OAuth web client ID matching the server's Google configuration.                                                          |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`                     | Google Play app's public SDK key, beginning `goog_`; a Test Store or secret key cannot ship as the Play purchase configuration. |
| `EXPO_PUBLIC_POSTHOG_KEY`, `EXPO_PUBLIC_POSTHOG_HOST`    | Public ingestion token and HTTPS project-region host.                                                                           |
| `EXPO_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT` | Crash destination and build source-map project.                                                                                 |
| `SENTRY_AUTH_TOKEN`                                      | Secret build-only source-map upload token; never prefix with `EXPO_PUBLIC_`.                                                    |
| `EXPO_PUBLIC_TELEMETRY_DEBUG=false`                      | Production debug telemetry must be disabled.                                                                                    |

`EXPO_PUBLIC_PRIVACY_URL` and `EXPO_PUBLIC_TERMS_URL` may override the website paths.
Their HTTPS availability and final operator/contact/retention text still require verification.
The local configuration preflight currently fails API/legal, website, Google Play SDK-key
and telemetry checks. Existing local Firebase JSON matches the Android package; this
does not verify the EAS file contents, FCM server key, Google OAuth registration or signing.

## Native configuration prepared

- Package `com.sahil.fitsync`, version name `1.1.0`; EAS remotely manages/increments
  Android version codes. Compare the remote counter with any version already in Play
  before building. `production` and `store-test` produce signed store AABs; `store-test`
  uses the preview environment and a separate OTA channel. Configure preview variables too.
- Compile/target API **36** matches the installed Expo57/React Native0.86 catalog and
  the [current Play submission baseline](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en).
  Minimum API26 remains unchanged. No NDK override was added.
- Expo manifest introspection confirms removals for camera, microphone, calendar
  read/write, legacy storage, broad photo/video access, Advertising ID and release
  overlay access. Photo selection uses the system picker; calendar export opens the
  system event editor. Motion recognition and notifications remain feature-specific
  native module permissions; Health Connect requests only steps, sleep and weight reads.
- Native Health Connect privacy activity and Android14+ permission-usage alias are
  generated; purchase activity remains `singleTop`. Privacy URL must be identical in
  Health Connect and the Play listing. Fingerprint runtimes prevent incompatible native OTA updates.
- Introspection is not a Gradle merged-manifest or AAB check. The final bundle still
  needs inspection for unexpected library permissions, supported Google Play Billing
  version and [16KB ELF/RELRO plus APK packaging alignment](https://developer.android.com/guide/practices/page-sizes).
  The installed AGP8.12 and modern native packages alone do not prove alignment.
  Google currently requires [Billing8 or later for new submissions](https://developer.android.com/google/play/billing/deprecation-faq).

## Console information to complete

Use [the English listing draft](../mobile/store/en-US/listing.json) after reviewing the
actual deployed offering. Upload a separate 512×512 RGBA Play icon, a 1024×500 opaque
feature graphic, and at least two genuine screenshots of this installed Android build.
These dedicated Play assets/screenshots are not prepared here; the existing 1024px
launcher icon is not the required Play icon file. Capture Logger, Progress and Training
with test data and no private notifications. [Google's asset requirements](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en)
describe formats and recommended additional screenshots.

Complete Health & Fitness category, target audience, content rating, country/pricing,
ads declaration, Data safety, Health apps declaration and reviewer app-access instructions.
The app has Google-only sign-in: provide a reviewer-accessible Google account and precise
navigation without relying on access to the developer's personal account. Do not add a
production authentication or entitlement bypass for review.

Base Data safety answers on the configured services and their contracts:

| Implemented data path                                  | What to disclose/review                                                                                                                                                |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Google sign-in → API/database                          | Account name, email, identifiers, profile/preferences and optional avatar.                                                                                             |
| Manual logs and Health Connect → progress API/database | Fitness activity, sleep, weight, nutrition/recovery and measurements; imported health data is optional.                                                                |
| Chosen progress/profile photos → API storage           | User-selected photos; no broad gallery scan or microphone/camera capture.                                                                                              |
| RevenueCat/Google Play → verified billing API          | Purchase/subscription history and app-user identity; no in-app card collection.                                                                                        |
| PostHog/Sentry                                         | Anonymous usage events and scrubbed JS diagnostics, enabled by default with Settings controls. Health values, photo content and raw notes are excluded from telemetry. |
| Notifications                                          | Installation/push identifiers for reminders, with account/session checks and opt-out.                                                                                  |

Do not answer “no data collected” or “no third-party processing.” Resolve the console's
collection/sharing, optionality, retention and provider-purpose questions against the
actual production configuration. Publish `/delete-account` and test both in-app deletion
and the external request route; cancelling Google Play renewal is a separate step.
[Play requires both deletion paths](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en).
Declare the implemented Activity/Fitness, Nutrition/Weight and Sleep uses and only the
three requested Health Connect data types in the [Health apps form](https://developer.android.com/health-and-fitness/health-connect/publish).

## Build and acceptance sequence

1. Finish the environment and backend/website prerequisites above. Configure Play app
   ownership and App Signing for `com.sahil.fitsync`, the correct upload key, Google OAuth
   Android client using the **Play App Signing certificate** SHA, FCMv1 credentials,
   RevenueCat Play products/offering/entitlement and matching server webhook/verification.
   These account-specific settings were not verified or changed by this pass.
2. From `mobile/`, run `npm run release:check` with production variables loaded. It runs
   offline, prints variable names/errors rather than values, and reads the Firebase file.
   Build-only secrets available only on EAS cannot be verified locally; the same gate runs
   on the EAS build server. Then run types, lint, tests and the Android JavaScript export.
3. When authorized to spend build resources, run `npm run build:android:production`.
   Inspect the resulting signed AAB in Play/Android Studio, generated permissions,
   versionCode, Billing dependency and native alignment. On a 16KB emulator/device,
   `adb shell getconf PAGE_SIZE` must show `16384`; test the Play-generated installation.
   APK `zipalign -c -P 16 -v 4 app.apk` covers packaging, not ELF/RELRO correctness.
4. Install through Play internal testing and exercise Google sign-in, purchases/restore/
   cancellation/expiry with license testers, notification sound/taps, health grants and
   revocation, foreground walk counting, photo cropping, calendar export, widgets,
   interrupted/offline workout saving, account switching and deletion. Capture real
   screenshots and check keyboard/large text/small-screen behavior and startup/scroll performance.
5. Submission is deliberately `internal` + `draft` in `eas.json`. After separate upload
   authorization, use `npx eas-cli@latest submit --platform android --profile production`
   with the intended build ID, or upload manually. Assign the Play service account only
   when automating submission. Current [Expo Submit supports first uploads](https://docs.expo.dev/submit/android/);
   do not assume the old manual-first-upload restriction. Complete/review the draft in
   Play Console; nothing automatically rolls out to production.
6. If the developer account is a personal account created after November 13, 2023,
   [12 continuously opted-in closed testers for 14 days and a production-access application](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
   are required. Account type and this testing status are unverified. Review pre-launch
   reports, fix crashes/policy warnings, then explicitly choose the production rollout.

No Android device was attached in this session. Native AAB/device/store acceptance,
store graphics/screenshots, production URLs, console declarations, signing and paid
store lifecycle verification are the remaining release gates.

## Product work after release preparation

The highest-priority follow-ups are Add set idempotency after a committed request
loses its response, transaction guards when another device finishes a workout,
and merge-safe offline metric/step contributions across devices. Profile large
workout histories on a lower-end phone before claiming those saves are fast.
These remain unresolved; see [Remaining concrete findings](repository-audit.md#remaining-concrete-findings)
for the coordinated API/storage changes and regression scenarios.
