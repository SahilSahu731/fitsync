# Rebuild and test the FitSync mobile upgrade

The new native modules require a **new Android development build**. Restarting Metro, installing a JavaScript update, or using Expo Go cannot update an old binary. This guide rebuilds the existing Android application, `com.sahil.fitsync`, without changing its signing identity or deleting saved workouts.

## What changed

- One logo source, `brand/mark.svg`, generates the website favicon, Apple touch icon, website logo, Android launcher/adaptive/themed icons, notification icon, and splash artwork. Run `npm run assets:generate` from `mobile` after editing it.
- Lime (`#C5F460`), black, white, and Inter now carry through both products.
- Floating glass tabs sample the screen behind them on Android 12+ using Expo Blur's target API. Older Android versions and reduced-transparency settings get a readable solid surface. Every tab keeps its label and hit area as the selection changes.
- Set-save and workout-completion sounds play after durable local saves, including offline workout logging. They respect silent mode and mix with music. Navigation uses subtle haptics without navigation sounds.
- Settings → Make it feel like you controls app sound effects, workout/navigation haptics, reduced motion, and keeping the workout screen awake. Preferences persist on the device. System reduced motion always wins. Rest-timer notification sounds remain separate Android notification-channel settings.
- Home → This week → Calendar, Profile → Training calendar, and Settings → Training calendar open the new month view. It combines completed workouts, followed-program slots, and coaching sessions, deduplicating linked workout IDs. Device export opens an editable calendar form; it does not claim an event was saved when Android cannot report that, and does not import personal calendars. Calendar edits do not reschedule the server's plan.
- Profile or Settings → Membership & billing shows verified plan status, renewal/expiry, restore purchases, receipts, and store payment settings. Subscriptions continue through the existing RevenueCat integration. Card details stay with the store; no invented invoice data or hardcoded prices are displayed.

## Native modules

| Package | Purpose | Status |
| --- | --- | --- |
| `expo-blur` | Native glass tab background and Android blur target | Added with the SDK 57 installer |
| `expo-calendar` | User-reviewed device calendar export | Added with the SDK 57 installer |
| `expo-keep-awake` | Keep the focused, active workout screen on | Added with the SDK 57 installer |
| `@expo-google-fonts/inter` | Shared Inter typography | Added |
| `expo-audio`, `expo-haptics` | Completion sounds and tactile feedback | Existing modules reused |
| `react-native-reanimated`, `react-native-worklets` | Tab and existing app motion | Existing modules reused |
| `react-native-purchases` | Store purchase, restore, and RevenueCat identity | Existing module reused |
| `expo-notifications`, health and secure-storage modules | Existing reminders, tracking and account access | Preserved |

A config plugin sets Android's purchase activity launch mode to `singleTop` so returning from bank verification does not cancel checkout. Generated `android/` and `ios/` files are not edited by hand. The new calendar bridge deliberately imports the supported `expo-calendar/legacy` system-form API; SDK 57's old function names at the root package throw migration errors.

## 1. Prepare dependencies and local configuration

From the repository root:

```bash
cd mobile
npm ci
npm run assets:generate
npm run assets:sounds
npm run typecheck
npm run lint
npm test
npx expo-doctor
```

Keep your existing `.env.local`; use `.env.example` only as a reference. Set `EXPO_PUBLIC_API_URL` to a backend reachable **from the phone**, **without** an `/api` suffix; the mobile API client adds that itself. For the existing Express development server use `http://YOUR_COMPUTER_LAN_IP:4000`. A phone's `localhost` points at the phone, not your computer. Start the API from a separate terminal with `cd server` and `npm run dev`.

For Google sign-in, keep the existing web client ID and register the SHA-1 for the rebuilt Android signing certificate with the Android OAuth client. Use your established EAS signing credentials; a different signing key can require updating the registered SHA-1. Never print or commit signing secrets.

## 2. Configure cloud-build environment variables

EAS does not automatically get your ignored local `.env.local` file. Configure its **development** environment in the Expo project dashboard before the build:

| Variable | Value |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | Your phone-reachable API URL |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Existing Google web client ID |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | RevenueCat's Android **public SDK** key when testing subscriptions |
| `EXPO_PUBLIC_TERMS_URL` | Your published HTTPS terms page, required for purchasing |
| `EXPO_PUBLIC_PRIVACY_URL` | Your published HTTPS privacy page, required for purchasing |

Development builds select `development`, internal preview builds select `preview`, and production builds select `production` in `eas.json`. Configure each environment explicitly. Public variables are embedded in the app. RevenueCat secrets, Supabase service-role keys, webhook authorization, and JWT secrets belong only on the server.

## 3. Build and install the new development app

From `mobile`:

```bash
npx eas-cli@latest login
npm run build:android:dev
```

Use the existing EAS project and Android credentials when prompted. Download the resulting APK from the build page and install it on the phone. To preserve local data, install it as an update with the same package and signing key. With Android platform tools and a USB-connected authorized device:

```bash
adb devices
adb install -r /absolute/path/to/fitsync-development.apk
npm run start:clean
```

Open the newly installed FitSync development app and connect to Metro. Keep the phone and computer on the same network, or use your established device networking setup. The app icon may remain cached by the launcher briefly; reopen the launcher before considering reinstalling. Do not uninstall merely to refresh an icon, because that can delete unsynced local workouts.

For an installable build without Metro:

```bash
npm run build:android:preview
```

A cloud build has **not** been launched by this change. Native compilation and device behavior still need verification with the new APK.

## 4. Configure subscription testing

The purchase and server verification flows already exist. Use `docs/billing.md` for the backend's full ownership, webhook, sandbox, and expiry behavior. Before purchase testing:

1. In Google Play Console, create the auto-renewing FitSync Pro subscription products/base plans, activate them for test distribution, and configure license testers.
2. In RevenueCat, connect the matching Google Play application, import the products, attach them to the `pro` entitlement, and publish a current offering with monthly/annual packages as appropriate. The app displays store-localized prices; pricing is configured there rather than invented in the source.
3. Put the public Android SDK key in the app's EAS **preview** environment. Supply HTTPS legal-page URLs. Configure the matching RevenueCat provider secret, `REVENUECAT_ENTITLEMENT_ID=pro`, and webhook authorization only on the test backend.
4. Keep sandbox purchases isolated from production. Set `REVENUECAT_ALLOW_SANDBOX=true` only on the test backend; leave production `false`. Confirm the test database has the billing schema from the repository migrations. `docs/pro-release.md` records the earlier migration verification; a new environment must apply the documented migrations before purchase testing.
5. Configure RevenueCat's webhook to your test backend's existing `/api/billing/webhook` endpoint with the matching Authorization value. The server verifies canonical customer state before granting Pro.
6. Build an Android App Bundle for store testing:

   ```bash
   npm run build:android:store-test
   ```

   Upload that AAB to a Google Play internal testing track and install **from that track using the invited tester account**. A sideloaded development APK is useful for UI/native-module checks but is not proof that Google Play Billing is correctly configured. The `store-test` build uses the EAS `preview` environment and store distribution.

Do not test a real charge as a substitute for sandbox setup. Do not use client flags or a fake local Pro switch. A received purchase awaiting verification must show pending activation without asking the user to purchase again. Restore and management remain available without an active entitlement. Production purchase testing and release submission are separate steps.

The repository currently targets Android. The reusable asset set includes an Apple touch icon, but an iOS release still requires its own bundle ID, signing, App Store products, RevenueCat iOS key, and platform build setup.

## 5. Device test pass

| Area | Test | Expected result |
| --- | --- | --- |
| Branding | Launcher, themed icon, splash, sign-in, website tab and saved home-screen icon | New lime two-stroke mark; notification silhouette is white on transparency |
| Glass tabs | Scroll behind the bar; switch all five tabs; open keyboard; rotate through accessibility settings | Live blur on Android 12+, stable labels, correct selected state, readable fallback, no recursive blur |
| Tracking | Complete/undo sets, start a rest timer, save offline, reconnect, finish a workout | Saves remain durable; sound plays only after a successful new completion; no sound for undo or failed saves |
| Sound | Toggle sound off, restart app, log another set; play music; enable silent mode | Preference persists; no app completion sounds when off; no interruption of music; silent mode respected |
| Motion | Enable app reduced motion and system reduced motion independently | Screens and tab layout respect either setting; no decorative continuous animation |
| Keep awake | Open live workout, leave it, finish it, disable the preference | Display lock held only while the live workout route is focused and a session exists |
| Calendar | Leap-year February, year boundary, today, program/coaching/workout on the same session | Correct dates and counts; linked workout counted once; refresh errors stay visible |
| Calendar export | Save, cancel, press Android back, device without a calendar app, older binary | OS editor opens; no false saved claim; useful error; app data not mutated by export |
| Billing | Free, active, cancelled-but-unexpired, expired, pending, and provider outage | Verified status; correct renewal wording; no stale price or fabricated receipt |
| Purchase | Sandbox success, cancellation, pending payment, return from bank verification | Native store handles confirmation; pending activation does not trigger a second purchase |
| Restore | Reinstall/update, restore, change FitSync account, return from store management | Correct account ownership and refreshed server entitlement |
| Receipts | Open payment methods, order history, cancellation | Correct store UI; no card form or invented billing history in FitSync |
| Existing app | Google sign-in, reminders, health import, offline tracking, profile, and program starts | Existing flows continue to work |

Use the development build for the first pass; use the Play internal-testing build for purchase lifecycle tests. Store configuration, OS permissions, native rendering/performance, and actual checkout cannot be established by JavaScript unit tests alone.

## Verification completed in this change

- Expo Doctor: **21/21 checks passed**, after aligning the SDK 57 patch packages.
- Mobile TypeScript: passed.
- Mobile ESLint: zero errors; eight existing unused-variable warnings in older exercise/workout components remain.
- Mobile tests: all 19 test files passed, including the new calendar, native calendar-result handling, and preference tests.
- Final Android JavaScript/asset export: passed, using the five required Inter weights.
- Native config introspection: passed; purchase activity is `singleTop`, themed icon resolves, and recording permission is explicitly removed.
- Logo raster dimensions and Android adaptive safe-circle bounds: checked; the new launcher artwork was visually inspected.
- Backend billing tests and website production build: passed. Website output includes the new favicon and Apple touch icon.

A signed APK/AAB has not been built or installed in this change, and no store purchase or production payment was made. Glass rendering, sound mixing, native calendar behavior, and checkout still need the device/store test pass above.

## References

- [Expo SDK 57 BlurView](https://docs.expo.dev/versions/v57.0.0/sdk/blur-view/), [Calendar system forms](https://docs.expo.dev/versions/v57.0.0/sdk/calendar-legacy/), [KeepAwake](https://docs.expo.dev/versions/v57.0.0/sdk/keep-awake/)
- [Expo config plugins](https://docs.expo.dev/config-plugins/plugins/)
- [RevenueCat React Native installation and Android purchase activity setup](https://www.revenuecat.com/docs/getting-started/installation/reactnative)
- [Google Play order history](https://support.google.com/googleplay/answer/2850369), [payment methods](https://support.google.com/googleplay/answer/4646404), [Apple purchase history](https://support.apple.com/en-us/118212)
