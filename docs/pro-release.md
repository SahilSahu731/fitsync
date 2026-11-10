# FitSync Pro release notes

This change connects optional paid coaching and meal planning to the existing workout and progress app. It does not deploy a subscription product or grant anyone Pro by itself.

## Live database verification — November 7, 2026

Migrations 012–015 were applied successfully to the Supabase database configured in `server/.env`, using `server/sql/apply-pro-migrations.sql` in one transaction. Existing account and workout records were preserved. All 11 new tables are visible through the Supabase API, have row-level security enabled, deny direct anonymous/authenticated table access, and allow server service-role access. All eight migration functions deny execution by anonymous/authenticated clients; the workout-completion trigger is enabled. The PostgREST schema cache was reloaded and every table probe returned HTTP 200.

This verifies the database migration only. It does not configure billing products, activate subscriptions, deploy the API, or verify native device/store purchase flows.

## What users can do

| FitSync Free | FitSync Pro adds |
| --- | --- |
| Build a four-week starting plan for muscle, strength, weight-management activity or general fitness, using saved experience, equipment and available time. | Preview and accept changes to a session's time, equipment, exercise selection or effort. |
| Start planned sessions in the normal workout logger; keep actual workout history and progress. | Move a missed session and the remaining unstarted schedule while preserving recovery spacing. |
| Record daily progress and use the existing local journal. | Review progression from comparable completed sets, with a reason for each suggested target and a choice of available load increment. |
| Browse meal ideas, save food preferences/favorites, and make a private weekly commitment. | Generate a weekly menu, swap matching meals and use a shopping list scaled to servings. |
| Connect by a private invitation and share a weekly target, habit and self-reported completed-day count. | Read a weekly review of recorded training and available synced check-ins, with practical next actions and missing-data notes. |

Starting a Coach session creates and links a real workout. Opening a plan does not count as completion. Start from Coach to credit that planned day; starting its saved baseline routine independently remains an ordinary workout. Rebuilding a free starting plan is allowed and preserves old logs. Adaptations and reviews require current server-verified Pro access.

Recipe details and replacements open in sheets. Saved menus include a preference snapshot; menus with changed or unknown older preferences prompt review or regeneration. Favoriting a meal preserves unsaved preference edits. Partners do not receive reflections, meals, body readings or workout details. Invitations expire after seven days, are single-use and store a server-side hash; either partner can disconnect. Creating another outgoing invitation requires disconnecting an existing outgoing partner first.

## Purchase and restore flow

1. Sign in with a FitSync account. RevenueCat uses that account's UUID; identity changes and store operations are serialized.
2. Open FitSync Pro. Prices, billing periods and conditional introductory terms come from the current store offering. This paywall supports ordinary auto-renewing subscriptions; it excludes prepaid and installment commitments.
3. The store confirms payment and final offer eligibility. The app then asks the authenticated API to reconcile RevenueCat status. Only the server entitlement enables Pro. A completed store purchase awaiting server confirmation shows pending activation and offers refresh; it does not ask the user to buy again.
4. Restore purchases explicitly from the Pro screen. Refresh status or open the store's management page to manage/cancel. Cancellation retains access through the verified expiry; local controls expire at that timestamp and paid server actions independently reverify access.

An older native build, unsupported platform, missing keys, unavailable offering, unconfigured backend or missing HTTPS legal pages disables purchasing with an explanation. Existing account status can still be read without importing an unavailable native billing module. Client flags and webhook entitlement claims cannot grant access.

## Configuration before release

- Apply the existing schema migrations in order, including `012_progress_tracking.sql`, `013_billing.sql`, `014_coaching.sql` and `015_wellness.sql`, to the intended Supabase project. Deploy the corresponding API and mobile changes together. The configured database was migrated as recorded above; fresh environments still require these migrations. API/mobile deployment remains separate.
- Set server `REVENUECAT_SECRET_API_KEY`, matching `REVENUECAT_ENTITLEMENT_ID` (default `pro`) and a random `REVENUECAT_WEBHOOK_AUTHORIZATION` of at least 32 characters. Set that exact full Authorization header value in RevenueCat and deliver lifecycle/transfer events to `POST /api/billing/webhook`.
- Configure real store products, credentials, notifications, regional prices, billing periods and trial eligibility in RevenueCat and the store console. Associate products with the entitlement and current offering. Choose and test RevenueCat's restore/transfer ownership policy.
- Set mobile `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` and, when preparing iOS, `EXPO_PUBLIC_REVENUECAT_IOS_KEY` to **public SDK keys**. Never expose a server secret or Supabase service-role key in `EXPO_PUBLIC_*` values.
- Publish real HTTPS terms/privacy pages and set `EXPO_PUBLIC_TERMS_URL` and `EXPO_PUBLIC_PRIVACY_URL`. The app intentionally does not sell subscriptions until these are configured.
- Keep production `REVENUECAT_ALLOW_SANDBOX=false`. Use an isolated backend/test accounts with it set to `true` for sandbox validation. Synthetic TEST webhooks do not validate purchases or grant Pro.
- Build and install a new native development/production app after adding RevenueCat or health modules. Updating JavaScript or using Expo Go cannot validate these native integrations.
- **Current supported app configuration is Android only** (`expo.platforms: ["android"]`). iOS billing/HealthKit adapters are included, but iOS needs a real bundle identifier, Google sign-in client/URL scheme, signing/provisioning, capabilities, store setup and a native build before it can be released or considered verified.

See [billing details](billing.md), [coaching contracts](coaching.md) and [health import setup](health-sync.md) for configuration and lifecycle semantics.

## Practical limits

Plans are deterministic prescriptions drawn from published exercise records. They do not assess injuries, diagnose recovery, inspect form or infer a starting weight from body size. Missing suitable movements are disclosed. Progression needs comparable recent straight working sets and manageable recorded effort; sparse or conflicting data does not produce an invented improvement. Bodyweight difficulty is not inferred from repetition counts. An accepted preview is recomputed from current data.

Meal planning uses a small curated recipe library and flexible portions. It is not a calorie prescription, macro optimizer, photo calorie estimator or individualized dietitian service. Check-ins and partner completion counts are self-reported.

Edits, notes and completion for an already loaded workout are saved locally and retried. Starting a new workout or changing its structure requires online synchronization; coaching waits for queued workout saves before starting or reviewing progression. Paid coaching, meal planning and weekly reviews require the API. Pro authorization currently rereads RevenueCat's canonical state, so a provider outage can temporarily prevent new paid actions. Manual tracking remains available. Health imports are foreground, opt-in and depend on installed native modules, device support and granted permissions; they are not continuous wearable synchronization.

## Validation recorded in this workspace

The following commands passed during implementation. HTTP suites use a temporary loopback server with real Express/JWT handling and stub the database boundary; they do not contact Supabase or RevenueCat. Loopback listeners required permission outside this environment's sandbox.

```sh
# From mobile/
npm run typecheck
npm run lint
npm test
node tests/billing.test.mjs
node tests/coaching.test.mjs
node tests/wellness.test.mjs

# From server/
npm run build
npm test
node --import tsx tests/wellness.http.test.ts

# From the repository root
git diff --check
# Actual isolated PostgreSQL migration/lifecycle assertions (temporary test dependency)
FITSYNC_PGLITE_MODULE=/tmp/fitsync-coaching-sql/node_modules/@electric-sql/pglite/dist/index.js node server/tests/coaching.sql.integration.mjs
# Android JS/Hermes bundle; this does not build an APK
# From mobile/
npx expo export --platform android --output-dir /tmp/fitsync-pro-export
```

Final verification on November 7, 2026: **126 server tests and 118 mobile tests passed**. Server build, mobile typecheck, mobile lint (eight existing unused-code warnings), Android Hermes export and `git diff --check` passed. The isolated PostgreSQL runner applied the actual migrations and passed the lifecycle assertions; it did not use the production database.

The mobile suites cover billing identity switches/logout, unavailable native/configuration paths, expiry and pending activation, Android recurring/intro pricing, coaching selection and request scoping, meal filters, saved-menu snapshots and favorite draft preservation. The wellness HTTP suite verifies authentication, revoked sessions, expected-owner headers, free routes, paid-route denial with forged flags, validation, owner-bound check-ins/invitations, minimal linked-partner sharing using `display_name`, and foreign-account query/delete safety. SQL lifecycle assertions and the wider server suite are documented separately in [coaching validation](coaching.md).

These implementation commands did not verify a native device, store sandbox transaction, production purchase, visual UI session, store approval or live API/mobile deployment. The subsequent live database migration is verified above. Before release, exercise purchase/cancel/pending/restore, account changes, renewal/expiry/grace/refund/transfer, interrupted workout sync, native health permissions and representative screen layouts on actual supported devices. Verify localization and final store disclosures with the configured products.

## Dependency audit follow-up

On November 7, 2026, dependency installation reported **25 findings across all dependencies** (one low, 16 moderate, eight high). A subsequent production-only audit returned **18 findings** (one low, nine moderate, eight high), using this exact command from `mobile/`:

```sh
npm audit --omit=dev --json --fetch-retries=0 --fetch-timeout=20000
```

Every affected production node was already present at the same resolved version in the committed baseline `mobile/package-lock.json`. The affected chains include `expo-router → query-string → decode-uri-component`, existing `express → body-parser` and direct `multer`, plus Expo CLI/configuration tooling through `node-forge`, nested `zod`, `glob`/`minimatch`, `deepmerge`, and `xcode`/`uuid`. The newly added `react-native-purchases`, `@kingstinct/react-native-healthkit`/`@react-native-healthkit/core`, `react-native-health-connect`, and `react-native-nitro-modules` had no npm advisory entries in this report.

These existing findings require a separate dependency/security follow-up before release, including assessment of reachable app/server paths and compatible patched versions. No packages were changed and `npm audit fix` was not run; blindly applying the suggested Expo major-version changes would bypass compatibility validation. This audit covered the mobile npm dependency graph, not native SDK vulnerability analysis or an independent audit of the server lockfile.
