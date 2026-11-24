# Health import

FitSync reads steps, sleep stages and body weight from Health Connect in the Android app. It imports the current day and six preceding local calendar days into the account-scoped progress journal. Automatic steps are free, optional and read-only. FitSync does not write health records or run its own background tracking service.

## Native setup

The project uses Expo SDK 57 / React Native 0.86 and `react-native-health-connect` 4.x. The dependency and Android read permissions are already configured. Binaries missing the native module need a new native build; Expo Go is not supported. Keep native projects generated through Expo config plugins.

Add the built-in `react-native-health-connect` config plugin. Version 4 already includes the Expo integration; do not add the deprecated separate `expo-health-connect` package. Declare only Android read permissions `android.permission.health.READ_STEPS`, `android.permission.health.READ_SLEEP`, and `android.permission.health.READ_WEIGHT`. The plugin handles the permission delegate and manifest activity integration. The local `with-health-privacy` config plugin routes Android 13 and earlier rationale intents and Android 14+ permission-usage intents to a dedicated native activity showing the public privacy page without requiring React, sign-in or JavaScript. Set the published HTTPS privacy URL (or web origin) before release builds. Health Connect's SDK requires Android 8+; the provider app requires Android 9+ where it is not built into the system. Complete Play Console health-access declarations before distribution and verify both native privacy entrypoints on devices.

`HealthSyncBridge` is mounted inside `SessionProvider`. It refreshes opted-in accounts at launch, on returning to the app, and once a minute while active, with a one-minute throttle. Unchanged measurements do not rewrite the journal or start a cloud download. `/health-sync` offers connection, status, permission management and disconnect. The steps sheets in Home and Progress also offer a steps-only connection, without requesting sleep or weight access.

On Android 14 with SDK extension 20 or later, granting `READ_STEPS` enables Health Connect's on-device step counting. Health Connect can keep recording while FitSync is closed; FitSync imports those measurements when open. Older devices need another step-recording app or watch connected to Health Connect. Aggregates are read without a data-origin filter so built-in phone steps and provider priorities are included. No claim of continuous FitSync background execution is made.

## Consent and data rules

Connect opens the platform permission prompt after the user sees how automatic steps work. Account-scoped preferences start disabled. No health queries run for a new account merely because a route opens. Steps-only connection requests only Steps read access; broader health import supports partial grants and never queries denied types.

Daily steps use platform statistics/aggregation rather than adding raw phone/watch samples. Weight uses the latest sample each local day in kilograms. Sleep includes known asleep stages only, never all time-in-bed or awake intervals. Android stages use their session's wake date; Apple stages within 90 minutes form a sleep episode attributed to its wake date. Overlapping intervals for a date are unioned to avoid duplicate sleeping minutes. Sessions lacking known asleep stages stay missing. Fragmented sleep separated by long gaps can form separate episodes; these summaries are not a clinical sleep measurement.

Step events can include `stepBreakdown: {automatic, manual, source}`. The displayed value is `(automatic ?? 0) + manual`. Automatic imports replace only the automatic contribution, while the Add extra steps action increments the manual contribution. Repeated imports cannot add the same daily snapshot twice. Missing automatic data is `null`, not zero. A measured zero is accepted only when the native aggregate supplies a data origin. Manual daily-total edits cannot set a total below its automatic contribution.

Legacy manual corrections, explicit deletions and saved foreground-walk totals retain their existing protection against imports. The old walk counter is hidden when automatic steps are connected, avoiding two ways of saving the same walk. Add only activity missing from the automatic source. Weight and sleep retain their existing correction behavior. Only the recent seven days are reconciled.

Preference writes are serialized per account; an older import cannot remove newer metric selections. Read generations prevent a delayed earlier response from rolling back a newer count. Shared imports remain valid while any participating screen still belongs to the account. API session changes and disconnect invalidate outstanding reads.

Disconnect stops future imports for that FitSync account and cancels an outstanding read before it can append records. Existing journal entries remain saved. System permissions are controlled separately in Apple Health/Health Connect. FitSync does not call Android revoke-all as its disconnect mechanism: the native library documents that revocation can require app restart. Account changes during the OS prompt or record read stop the operation before it writes to a journal. Cloud failures preserve locally saved pending events and show a retry message; the Progress screen's normal sync can upload them later.

## Verification

Run from `mobile`: `node --test tests/health-sync.test.mjs`, `npm run typecheck`, and `npm run lint`. Pure/native-adapter tests use synthetic records and injected SDK/storage implementations. They cover opt-in, account isolation and switches, disconnect races, unavailable builds, partial permission grants, steps/weight/sleep normalization, overlap handling, deduplication, manual overrides, missing data and offline persistence. Tests never request actual health permissions or read device data.

Deploy the server's updated progress-event schema before the mobile update. The optional breakdown uses the existing JSON event payload and needs no SQL migration. Test on physical Android devices with actual health records: permission denial/revocation, background walking followed by return, multiple origins, midnight, manual additions, repeated imports, offline saves and account changes. Mock tests do not prove sensor behavior on hardware.

Official references checked November 24, 2026: [Android on-device steps](https://developer.android.com/health-and-fitness/health-connect/read-data), [Expo SDK57 Pedometer limitations](https://docs.expo.dev/versions/v57.0.0/sdk/pedometer/), [Health Connect aggregate API](https://matinzd.github.io/react-native-health-connect/docs/api/methods/aggregateRecord/).
