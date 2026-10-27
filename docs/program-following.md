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

## Basic and Pro preview

`mobile/src/config/features.ts` contains the single temporary switch:

```ts
export const features: { pro: boolean } = {
  pro: false, // true = Pro view; false = Basic view
};
```

Basic includes the daily plan, schedule, workout logging, completion ring, totals, milestones, weekly check-ins, recent logs, and program journal. Pro adds selectable weekly volume/set/time charts, comparisons between the two most recent fully elapsed scheduled weeks, due-session completion, by-planned-day logging, best run of completed scheduled sessions, a 28-day activity calendar, and routine first/latest comparisons linked to the actual workout logs.

The switch is app-wide presentation configuration for this prototype, not a purchased entitlement. There is no subscription, checkout, or paywall API. Replace it with a server-owned per-account entitlement when subscriptions are introduced. No extra migration is needed to preview these insights.

Insights use completed program workouts only. Weekly charts follow scheduled program weeks; the activity calendar follows actual completion dates in the program timezone. A stopped/completed program freezes the reporting date at its end date. Percentage changes require a nonzero baseline; incomplete weeks are excluded from week-over-week comparisons. Changes in volume do not establish changes in strength. Exercise selection and set counts may change between routine logs.

## Deployment

1. Apply `server/sql/008_program_following.sql` in Supabase SQL Editor after migrations 001–007. It is a one-time migration, not an idempotent rerun. If an earlier development version was already applied, compare that schema and create an additive upgrade instead of dropping existing progress tables.
2. Run `npm run programs:check` from `server/` to verify that the configured database exposes all five tracking tables and the nested workout relationships. This is read-only and returns a failure exit code if setup is incomplete. Then deploy the server changes. Existing service-role database configuration is required. The new `/api/program-follow` endpoints require the app's authenticated session; the new tables and RPCs are inaccessible to anonymous/authenticated direct Supabase clients.
3. Configure a scheduled server job every five minutes, with the same environment variables as the server:

   ```sh
   cd /path/to/fitsync/server
   npm run programs:reminders
   ```

   Run it from the deployed server workspace with its dependencies installed (the command uses `tsx`). Do not expose this worker as a public HTTP endpoint. A five-minute cron gives approximate, not exact-to-the-minute delivery. Each invocation processes up to 500 jobs with at most six concurrent sends. Monitor pending job age and increase worker frequency/capacity as usage grows.

4. Configure Android push credentials. This repository currently has no `google-services.json` or `expo.android.googleServicesFile`. Download the Firebase Android configuration for package `com.sahil.fitsync`, place it at `mobile/google-services.json`, and set `expo.android.googleServicesFile` to `./google-services.json`. Upload the matching FCM V1 service account key through `npx eas-cli@latest credentials` from `mobile/`. Keep the private service account key out of Git. Follow [Expo's FCM credentials guide](https://docs.expo.dev/push-notifications/fcm-credentials/).
5. Build and install the native Android app using `npm run build:android:dev` from `mobile/`, or the intended EAS release profile. The existing notifications plugin already bundles `assets/sound/rest_complete.wav`. Program pushes use `program-reminders-v1`; rest timers retain `workout-rest-v2`. A JS refresh cannot add Firebase configuration to an already installed native build.
6. If enhanced push security is enabled on the EAS project, set `EXPO_ACCESS_TOKEN` only in the server/worker environment.

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
