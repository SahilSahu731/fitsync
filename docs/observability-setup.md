# FitSync analytics, error reporting and release setup

The app now has PostHog funnel events and Sentry reporting for JavaScript crashes,
screen-render failures and selected handled errors. The integration is installed;
you still need to create the projects, configure keys and make a new Android build.
No production database changes, cloud configuration or releases were made by this change.

## 1. Create a PostHog project

1. Open [PostHog](https://posthog.com/) and create an organization/project for FitSync.
2. Choose your hosting region. Use separate projects for preview and production so
   testing and sandbox purchases do not affect production conversion rates.
3. In the project's settings, copy its **project token/API key**. This is the
   public ingestion token, usually starting with `phc_`. Do not use a personal API key.
4. Copy the ingestion host that matches the project:

   | Region   | `EXPO_PUBLIC_POSTHOG_HOST` |
   | -------- | -------------------------- |
   | US cloud | `https://us.i.posthog.com` |
   | EU cloud | `https://eu.i.posthog.com` |

5. Leave session recordings and autocapture off. The app sends explicitly named
   events only. It does not identify FitSync accounts or create person profiles.
6. Check the project's privacy/data settings and disable IP retention. The SDK
   requests no GeoIP enrichment; the receiving service still necessarily handles
   network traffic. Choose a retention period appropriate for your product.

[Official React Native setup](https://posthog.com/docs/libraries/react-native).

## 2. Create Sentry projects and an upload token

1. Open [Sentry](https://sentry.io/) and create/select an organization.
2. Create a **React Native** project, for example `fitsync-mobile`.
3. From **Project Settings → Client Keys (DSN)**, copy the HTTPS DSN.
4. Record the organization slug and project slug. These are different from the DSN.
5. Create an organization auth token for source-map uploads under Sentry's
   developer/auth-token settings. Use the source-map/release upload permissions
   offered by Sentry. This token is secret and belongs only in your build environment.
6. Enable Sentry's server-side sensitive-data scrubbing and disable IP storage in
   project privacy settings as an additional safeguard.
7. Optionally create a separate **Node.js** project for the API. Configure its DSN
   on the API server as `SENTRY_DSN`; the existing server reporter uses it independently.

**Current coverage:** JavaScript fatal errors, uncaught promise errors, screen-render
errors and selected API/paywall/workout errors. Android Java/NDK crash collection is
disabled: native crash envelopes bypass the JavaScript privacy filter. It must not
be enabled without an equivalent native scrub/consent implementation. The JS SDK
keeps code filenames, line/column locations and release/debug IDs. It removes raw
messages, request data, account details, notes, breadcrumbs and source-context lines.
This deliberately trades some debugging detail for privacy.

[Official Expo/Sentry setup](https://docs.sentry.io/platforms/react-native/guides/expo/).

## 3. Add Expo environment variables

Open the [FitSync Expo project](https://expo.dev/accounts/sahillsahudevs-team/projects/fitsync)
and go to **Project settings → Environment variables → Add Variables**. Add the
following to **preview** and **production**, using each environment's own project values:

| Name                          | Example/value                                        | Visibility |
| ----------------------------- | ---------------------------------------------------- | ---------- |
| `EXPO_PUBLIC_POSTHOG_KEY`     | Your PostHog project token                           | Plain text |
| `EXPO_PUBLIC_POSTHOG_HOST`    | Your region's ingestion host above                   | Plain text |
| `EXPO_PUBLIC_SENTRY_DSN`      | Mobile project's HTTPS DSN                           | Plain text |
| `SENTRY_ORG`                  | Your Sentry organization slug                        | Plain text |
| `SENTRY_PROJECT`              | `fitsync-mobile`, or your actual slug                | Plain text |
| `SENTRY_AUTH_TOKEN`           | Source-map upload token                              | **Secret** |
| `EXPO_PUBLIC_TELEMETRY_DEBUG` | `true` in preview for testing; `false` in production | Plain text |

Values with `EXPO_PUBLIC_` are bundled in the app. They are public ingestion
configuration, never privileged management tokens. Never prefix the Sentry upload
token or a Supabase service-role key with `EXPO_PUBLIC_`, put them in app config,
commit them, or paste them into chat.

The build profiles already select the correct EAS environments:

- `development` → development
- `preview` and `store-test` → preview
- `production` → production

Keep the existing API, Google sign-in, RevenueCat and legal URL variables configured.
Release builds intentionally fail if observability keys, upload credentials, HTTPS
API or legal URLs are missing. Production also rejects telemetry debug mode.

For local development, add the same public values plus `SENTRY_ORG` and
`SENTRY_PROJECT` to ignored `mobile/.env.local`. Set
`EXPO_PUBLIC_TELEMETRY_DEBUG=true` only when testing ingestion. Development otherwise
sends no analytics. A local release build needs the upload token supplied securely
by the build environment.

[Official Expo environment-variable instructions](https://docs.expo.dev/eas/environment-variables/manage/).

## 4. Apply the operational SQL before deploying the API

1. Back up/check the target Supabase project and confirm you are in the intended environment.
2. Apply `server/sql/021_operational_safety.sql` using its SQL editor as the database owner.
3. Run `server/sql/verify-migrations.sql`. A fully configured schema should return no rows.
4. Deploy the API only after migration 021 succeeds.

Migration 021 creates shared rate-limit counters and an atomic refresh-token RPC.
It is separate from the existing combined Pro bundle (`012`–`020`). Production always
uses the shared database limiter; development/test use isolated memory. No Redis
service or additional server secret is needed. A missing/unavailable shared store
fails closed, so deploying the code before its migration will block API requests.

Refresh rotation now records consumed hashes and revokes that session on known-token
replay. A guessed secret cannot revoke a session merely by knowing its UUID. Existing
sessions continue working; replay history begins with rotations made after migration.
The mobile client already serializes simultaneous refresh requests.

Request logs are structured JSON. Use `requestId` and the response's `X-Request-ID`
to correlate a request and an error. Logs contain route templates, method, status
and duration, excluding credentials, queries, share tokens and health records.
Allow at least 30 seconds for process termination; the API drains for up to 25 seconds.

## 5. Build and install a fresh Android preview

From `mobile/`:

```sh
npm ci
npm run typecheck
npm run lint
npx eas-cli@latest build --platform android --profile preview
```

Install the resulting APK on an Android test device. The store-review and other
native dependency changes require a new binary; restarting Metro or publishing an
OTA update cannot add native modules. App version 1.1.0 also establishes a new
`appVersion` runtime so these changes are isolated from older binaries. The build should show successful Sentry
source-map upload. Treat upload errors as a release issue rather than disabling them.

To test Google Play purchases and in-app reviews, use a Play internal-testing build:

```sh
npx eas-cli@latest build --platform android --profile store-test
```

Upload/install through the Play testing track with a licensed tester and the configured
RevenueCat sandbox backend. A sideloaded APK does not prove the Play review flow works.
Google controls whether its review prompt appears; a successful request is not a rating.

## 6. Verify telemetry and privacy on the device

With `EXPO_PUBLIC_TELEMETRY_DEBUG=true` in the preview environment:

1. Open **Settings → Help improve FitSync**. Leave both switches on for the first test.
2. Tap **Send test analytics & error**.
3. In PostHog's event activity, find `telemetry_test` with `source=settings`.
4. In Sentry, find the sanitized `FitSync operation failed` error. Its tag
   `action=telemetry_test` identifies it. Confirm frames resolve to your source using
   the uploaded source maps; verify debug IDs/build configuration if they do not.
5. Inspect raw event payloads. There should be no email, FitSync account ID, token,
   workout name, exercise name, raw weight/nutrition value, note, full route parameter,
   screenshot or session recording.
6. Turn analytics off, tap the test control, and verify no new PostHog event arrives.
7. Turn diagnostics off as well and verify no new Sentry error arrives. Relaunch and
   confirm both preferences remain off. These switches apply to this device.
8. Turn them back on and confirm ingestion resumes.

Also verify these user flows on a real device before release:

- Free account: previous-session numbers and targets appear in a repeated exercise.
- lb account: type 225 lb, save/reopen, and confirm it displays 225 lb; switch to kg
  and verify approximately 102.06 kg. Repeat in routines, history and calculators.
- Finish online and offline: summary stays available; offline completion clearly
  says it is stored on this device and uploads when connectivity returns.
- A first exercise exposure and equal previous performance do not create a PR;
  a higher normal working load does. Warmups/drop/unfinished sets are excluded.
- Sharing opens only on a tap; cancelling sharing leaves the saved workout intact.
- Account deletion always shows the Google Play cancellation explanation/link,
  including when membership lookup is unavailable.
- Pro purchase/restore activates the member workspace; pending verification never
  starts a second purchase. Test cancellation and store errors too.

## 7. Build the first useful PostHog dashboards

Use **Product Analytics → New insight → Funnel**. Start with these:

| Insight               | Ordered events/filter                                                         | Suggested breakdown                  |
| --------------------- | ----------------------------------------------------------------------------- | ------------------------------------ |
| Sign-in               | `sign_in_started` → `sign_in_completed`                                       | App version                          |
| Onboarding            | `onboarding_step_viewed` (`step=0`) → later steps → `onboarding_completed`    | Step / app version                   |
| Paywall conversion    | `paywall_viewed` → `purchase_started` → `purchase_result` (`result=active`)   | Entry `source`, then selected `plan` |
| Purchase verification | `purchase_result`, split by `active`, `pending`, `cancelled`                  | Plan                                 |
| Finish reliability    | `workout_finish_started` → `workout_finished`                                 | App version                          |
| Sharing               | `workout_summary_viewed` → `workout_share_opened` → `workout_share_completed` | App version                          |

For entry-source attribution, anchor the source breakdown on `paywall_viewed`;
purchase events include that same source. Do not require `paywall_plan_selected`
as a funnel step: the default selection can be purchased without a selection tap.
Track `paywall_action_failed`, `onboarding_save_failed` and `workout_finish_failed`
as failure trends. `restore_result` distinguishes restored access from pending or
absent purchases. `workout_finished` means the completion was durably accepted by
the app, including an offline save; it does not prove a cloud upload finished.

For retention, create a retention insight using `app_opened` or `app_foregrounded`
as entry and `workout_finished` as the return event. Treat counts as anonymous
installation activity, not unique FitSync accounts or cross-device users.
`purchase_result=active` measures client-confirmed activation, not financial revenue;
use RevenueCat/Google Play reporting for renewals, refunds and revenue reconciliation.

Add Sentry alerts for new/regressed issues and sustained error volume. Send alerts
to an operational channel you monitor; choosing recipients remains your configuration.

[Official PostHog funnel instructions](https://posthog.com/docs/product-analytics/funnels).

## 8. Production release and ongoing checks

1. Configure production keys and `EXPO_PUBLIC_TELEMETRY_DEBUG=false`.
2. Publish the updated privacy-policy text alongside this release.
3. Confirm migration 021, API request logs, health checks and source-map upload.
4. Build with `npx eas-cli@latest build --platform android --profile production`.
5. Roll out through your usual Play testing/release process and check dashboard
   ingestion, finish failures and pending purchases before expanding the rollout.
6. For later OTA updates, use the same environment and upload that update's maps:

   ```sh
   npx eas-cli@latest update --environment production --channel production
   npx sentry-expo-upload-sourcemaps dist
   ```

   Supply `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` securely to the local
   upload process; secret-visibility EAS values cannot be downloaded with env:pull.
   Only use OTA updates after users have the compatible native runtime.

Review the funnels after you have a meaningful sample. Evaluate Pro value by source
and plan, and avoid changing free access based on a handful of visits.

## Isolated SQL verification for developers

Do not load server `.env` or export live database connection variables or credentials.
The SQL test helper rejects production mode and database/Supabase/PostgreSQL connection
variables, and every test creates PGlite without a URL or persistent data directory.
PGlite is a development-only dependency. All seven integration files now run in CI.

```sh
cd server
npm ci
npm run test:sql
```
