# Following programs and daily reminders

Implemented in the mobile app and authenticated server API. The database migration and push infrastructure must be deployed before enabling it for real users. No production migration, cron deployment, credentials upload, or device push verification was performed during local implementation.

## Product behavior

- Saving bookmarks a program and copies its routines to the library. Following also creates a dated schedule and progress record. Only one program can be active per account, enforced in PostgreSQL.
- Follow any published program whose weekly schedule, routines, and exercises are complete and published. Choose today or a date up to 30 days ahead. The start date is Day 1; the catalog's seven-day schedule repeats for its duration. Missing schedule days are recovery days.
- Switching preserves the old enrollment, journal, and workout logs. Finish or discard an active workout before switching or stopping. Program snapshots preserve names and schedule if the catalog changes later.
- Start a session on the progress page, or start its saved routine from Train. A direct routine start credits the earliest unfinished matching session. Quick workouts and unrelated routines do not count toward program progress. Sessions logged before enrollment are not imported.
- Finish at least one logged set to complete a program session. Discarded sessions can be retried; a session cannot be credited twice. Completing every scheduled session completes the program automatically.
- Analytics show finished sessions, completed sets, weight × reps volume, workout minutes, due-session completion percentage, and weekly progress. Unfinished sets/workouts do not inflate totals. Future sessions may be completed early; missed sessions remain available.
- Active program routines cannot be deleted until the program is stopped. Old completed workout logs survive template deletion.
- Follow with reminders off, or explicitly enable them and grant notification permission. Choose a local time and timezone; travel does not silently change that timezone. Settings can silence reminders across devices.

## Daily plan experience

Train shows today's program workout, an in-progress session, or a recovery day. Today's scheduled workout takes priority over older unfinished sessions; a workout already running can always be resumed. Recovery days preview the next scheduled session rather than prompting another workout.

The program page separates **My plan** from **My progress**. A seven-day calendar supports day selection, previous/next week, a complete week picker, and returning to today. Each training day can expand its exercises, images, set targets, and rest times before starting. Completed days open the saved workout log. Earlier unfinished sessions remain available separately.

Progress shows completed sessions, sets, minutes, volume, and a tappable weekly completion chart. Reminder controls, history, program changes, and stopping live in the program options drawer. These UI improvements use migration 008; no additional database migration is needed.

## Free and Pro

Free includes the daily catalog plan, schedule, workout logging, completion ring, totals, milestones, weekly check-ins, recent logs, and program journal. Additional program charts use the signed-in account's server-verified Pro entitlement through `BillingProvider`; the global prototype switch has been removed.

FitSync Pro also provides adaptive personal plans, session adaptation, progression previews and weekly coaching through `/api/coaching`. These paid mutations are independently enforced by the server. Purchases, restore, expiry and webhooks are described in [billing.md](billing.md). Catalog program schedules remain fixed; personal coaching is a separate experience. Start personal-plan sessions from Coach to credit the corresponding day.

Program insights use completed program workouts only. Weekly charts follow scheduled program weeks; the activity calendar follows actual completion dates in the program timezone. Changes in volume do not establish changes in strength. See [coaching.md](coaching.md) for comparable-performance reviews and [pro-release.md](pro-release.md) for the release checklist and remaining device tests.

## Deployment

1. Apply `server/sql/008_program_following.sql` in Supabase SQL Editor after migrations 001–007. It is a one-time migration, not an idempotent rerun. If an earlier development version was already applied, compare that schema and create an additive upgrade instead of dropping existing progress tables.
2. Run `npm run programs:check` from `server/` to verify that the configured database exposes all five tracking tables and the nested workout relationships. This is read-only and returns a failure exit code if setup is incomplete. Then deploy the server changes. Existing service-role database configuration is required. The new `/api/program-follow` endpoints require the app's authenticated session; the new tables and RPCs are inaccessible to anonymous/authenticated direct Supabase clients.
3. Configure a scheduled server job every five minutes, with the same environment variables as the server:

   ```sh
   cd /path/to/fitsync/server
   npm run programs:reminders
   ```

   For a production image, run `npm run programs:reminders:prod` after `npm run build`; the compiled CLI does not require `tsx`. The root `render.yaml` schedules that command every five minutes with the API credentials. See [deployment.md](deployment.md) to provision it. Do not expose this worker as a public HTTP endpoint. A five-minute cron gives approximate, not exact-to-the-minute delivery. Each invocation processes up to 500 jobs with at most six concurrent sends. Monitor pending job age and increase worker frequency/capacity as usage grows.

4. Configure Android push credentials for `com.sahil.fitsync`. The app reads the Firebase client file from the EAS `GOOGLE_SERVICES_JSON` file variable or `mobile/google-services.json` locally. Upload the matching FCM V1 service account key through `npx eas-cli@latest credentials` from `mobile/`. Keep the service account key private. [Expo FCM credentials guide](https://docs.expo.dev/push-notifications/fcm-credentials/)
5. Build and install the native Android app using `npm run build:android:dev` from `mobile/`, or the intended EAS release profile. Rebuild after changing native Firebase configuration. Program pushes use `program-reminders-v2` and the local rest timer uses `workout-rest-v2`.
6. If enhanced push security is enabled on the EAS project, set `EXPO_ACCESS_TOKEN` only in the server/worker environment.

## Send a test push to your own phone

1. Start Metro with `npm --prefix mobile start -- --dev-client` from the repository root and open the project in the installed FitSync Android development build. If you need the development APK, run `npm --prefix mobile run build:android:dev`, then install the APK from the build page. Remote push on Android requires a native FitSync build. [Expo push setup](https://docs.expo.dev/push-notifications/push-notifications-setup/)
2. Sign in and open **Settings → Notifications → Show test push token**. Allow Android notifications if prompted. Long-press the token and tap **Select all → Copy**. This test uses this phone's token and works without a Pro program.
3. In the local, Git-ignored `server/.env`, set `FITSYNC_TEST_PUSH_TOKEN` to the complete value, including brackets. Use the existing server-only `EXPO_ACCESS_TOKEN` if enhanced push security is enabled for this project.
4. Put the app in the background. If your terminal is already in `fitsync/server`, run `npm run push:test`. From the repository root (`fitsync`), use `npm --prefix server run push:test`. Run one of these commands once, then check the notification shade for **FitSync test**.
5. The sender prints Expo's acceptance ticket. To check its receipt about 15 minutes later, run `npm run push:test -- --receipt TICKET_ID` from `fitsync/server`. This only looks up the existing notification. The phone's notification shade confirms whether Android displayed it. [Expo tickets and receipts](https://docs.expo.dev/push-notifications/sending-notifications/)

To send through a browser instead, enter the same installation token, a test title and body, and Android channel ID `general-v1` in the Expo tool. Click **Send a notification** once. [Expo push notification tool](https://expo.dev/notifications)

To test the scheduled program path as well, open **Settings → Notifications → Workout reminders** with an active Pro program. Enable **A friendly daily nudge**, choose a time a few minutes ahead and tap **Save reminders**. Use a day when you have yet to complete a program workout. The deployed worker checks every five minutes.

For a quick local check, start a workout, tap **Timer → 30s** and allow notifications. Put the app in the background and look for **Rest complete 💪**. Android schedules this alert directly on the phone.

## Delivery and operational checks

The server queues reminders even when the app process is closed. Copy rotates between workout encouragement, unfinished-log prompts, and recovery-day messages, such as “Your dumbbells asked about you 👀”. Completing a program workout that local day suppresses further reminders. Notifications open that program's progress page.

Jobs are unique per installation and local date, including program switches. Workers claim jobs atomically and recheck enrollment, consent, device ownership, auth-session validity, and completion before sending. Revoked/expired sessions and disabled devices are excluded. Signing in claims the device for the current account without showing a permission prompt; explicit reminder setup is what requests permission. Sign-out unregisters the device, and server session revocation independently stops delivery.

A send is attempted once per claimed job. Interrupted sends/timeouts are marked failed, not blindly retried, to avoid duplicate nudges after an ambiguous response. This favors avoiding duplicates over guaranteed delivery during outages. Notifications already handed to Expo/FCM cannot be recalled after a switch or opt-out. The queue allows a six-hour catch-up window and pushes expire after one hour.

`accepted` means Expo issued a ticket. `sent` means the push service accepted the receipt; neither proves the phone displayed or the user read it. The worker checks receipts after 15 minutes and disables `DeviceNotRegistered` tokens. See [Expo's delivery and receipt semantics](https://docs.expo.dev/push-notifications/sending-notifications/).

Inspect outcomes without exposing tokens:

```sql
SELECT status, error_code, COUNT(*)
FROM public.program_reminder_jobs
WHERE created_at > now() - interval '7 days'
GROUP BY status, error_code;
```

Monitor failed jobs, pending age, missing credentials, and worker errors. An extended outage can miss the day's nudge. Program tracking remains available without push permission.

## Validation

```sh
cd server
npm run build
npm test
cd ../mobile
npm run typecheck
npm run lint
node --test tests/*.test.mjs
```

For database integration tests, use a **fresh disposable local** database named `fitsync_program_test` and run `psql -v ON_ERROR_STOP=1 -d fitsync_program_test -f server/tests/sql/program-bootstrap.sql` from the repository root. The bootstrap creates minimal prerequisite fixtures and executes the real workout, catalog, and program migrations; lifecycle fixtures roll back. Never run the bootstrap on production.

Device acceptance: follow A, log a workout, verify Train and weekly progress; switch to B and inspect A's history; retry a discarded session; finish a program; deny and re-enable notification permission; set a reminder a few minutes ahead; close the app and verify push sound and tap navigation; opt out and sign out, then verify no later push. Check two devices switching simultaneously and Android battery/notification settings. Native visuals and actual FCM delivery require a configured device build and were not verified by the local tests.
