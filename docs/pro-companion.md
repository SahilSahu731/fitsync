# FitSync Pro companion

The companion is available from Pro → For you, Home’s Today for you briefing, and `/companion`. It uses the existing plan, workout and progress records. The desktop planning workspace is `/user/planner` and consented coach views use `/shared/[token]`.

## Daily training

- The briefing resumes an active workout, otherwise follows the active followed program, otherwise uses the coaching plan. An actual rest day is not turned into an overdue workout. The program’s own date and rest-day selection are preserved.
- Optional readiness includes sleep, energy, soreness by muscle, available minutes and a private note. Saving explicitly supplied sleep and energy also writes the existing progress event stream **in the same database transaction**. Later Progress corrections and tombstones take precedence over the check-in snapshot. Omitting a reading does not erase an existing health reading.
- Low self-reported energy/high soreness or limited time can offer a coaching adaptation. Users see a preview and choose whether to accept it. The accepted request retains its reviewed input and revision; changes to readiness or the plan invalidate the preview. Followed-program check-ins never alter an unrelated coaching plan.
- Each comparable normal working set can show previous performance, an explained suggested target and its evidence coverage. Applying a suggestion fills only missing input fields and never completes a set. Warm-ups, other tracking types and stale/insufficient effort observations do not cause an invented progression.
- The logger supports supersets with alternating rounds, drop sets, separately logged rest-pause mini-sets, tempo, and synced exercise/default and per-set rest. Template → workout preserves these settings. Paired superset movements do not start a rest timer between partners. Editing notes does not turn an inherited rest setting into an override.

## Insights and goals

- Plateau signals require comparable completed standard sets and enough observations; missing effort and inconsistent exercises are disclosed. Exercise profiles show observed performance, uncompleted planned sets in completed sessions and accepted coaching substitutions. Removing an exercise from a workout is not inferred to be a replacement or a skip.
- Four/eight-week and arbitrary experiment comparisons show sets, exercise overlap, effort coverage, attendance when a plan is available, and measurements. Unequal periods and missing coverage are explained. Experiments describe associations, not causal results.
- Muscle recovery views show recent recorded workload and optional muscle-specific soreness. They are estimates, not measured biological recovery scores. Unknown muscle metadata stays unknown.
- Strength, rolling seven-day consistency, and measurement milestones derive progress from the same history. Measurement goals need a starting value (or the latest recorded measurement) to establish direction. Deadlines are editable without deleting workout history.
- Muscle focus previews add one or two working sets per seven-day block, only to existing primary-muscle movements, at most one additional set per movement/session and five total sets per movement. Dates and other exercises are retained; any session-time increase is shown. Applying the change atomically checks plan/day revisions, protects active/completed workouts, and stores the four/eight-week focus window. New starting plans inside that window include the focus during their preview. Ending the saved window stops future-plan application; already accepted sessions remain available for ordinary adaptation.

## Photos, nutrition, sharing and reports

- Progress photos use a **private** Supabase Storage bucket. The user can crop in the picker before uploading. The server validates/re-encodes still images, strips EXIF/GPS metadata, limits decoded size and issues five-minute signed URLs. Matching front/side/back views can be compared with an aligned crossfade. Deletion removes the object and record; account deletion clears private objects before removing the account. Photos are never put in widget snapshots, coach shares or reports.
- Optional nutrition editing changes the existing daily Progress totals and opens existing meal planning. Untouched fields retain their values; clearing an edited total writes a normal progress tombstone. There is no duplicate calorie/nutrient store or automatic calorie prescription.
- Coach links explicitly select completed workout summaries and/or the current plan, expire in one to thirty days and can be revoked even after Pro expires. Tokens are random and only their hash is stored. The server rechecks revocation after assembling data. Shared pages are no-store/no-referrer/noindex and clear their view when access ends. Private notes, body/nutrition readings and photos are excluded.
- Monthly reports read canonical completed workouts and latest nondeleted progress entries in the chosen timezone. Mobile can share/save report text; desktop downloads a TXT report. Reports do not claim monthly bests are all-time PRs or infer missing measurements.
- The desktop workspace previews/saves real coaching plans and adaptations, creates routines, edits eligible personal routines with revision conflict detection, and offers copies of imported routines. It uses the same authenticated backend as mobile, refreshes on focus/online and polls while visible. Existing workout snapshots are retained when a routine is edited.

## Sync and access

Companion records use owner-bound authenticated API calls, compare-and-set revisions, and deletion tombstones. The client keeps the loaded revision of edited drafts and preserves input on a 409 conflict. Account-keyed providers and request generations prevent an old account’s late response from exposing private records after switching accounts. Journal and coaching changes notify other mounted views immediately; subscriber failures cannot turn a successful persistence operation into a failed save.

Companion preferences reconcile on foreground and every minute while active. Desktop changes are picked up through foreground refresh/polling. Core workout drafts and progress entries keep their existing offline queues. New companion record writes, uploads, sharing and coaching adaptations require a connection and show failures; they are not claimed to be queued offline. Server-verified Pro is required for companion creation/updates, uploads, new shares and paid coaching changes. Reading/deleting existing personal records, revoking access, exporting reports, and ordinary workout logging remain available after expiry.

## Android integration

See [native integration](../mobile/modules/fitsync-companion/README.md).

Personal reminder preferences sync to the account, while permission and delivery are per phone. The app schedules a rolling fourteen-day window, respects ISO weekdays/timezone/quiet hours and snooze, and cancels completed sessions’ reminders. Original followed-program push reminders take priority when enabled to avoid duplicate notifications. Their original timing controls remain separate and the UI explains how to switch to personal reminders.

The local Expo module adds the FitSync Today Android home-screen widget. It displays a dated account-scoped snapshot, expires stale content, contains no authentication token and clears on account changes. A compatible paired watch may mirror actionable Android phone notifications to log the next fully populated set and pause/resume rest. Actions use the same set selection, validation, superset order and rest settings as the phone. They open the phone app; this is not a standalone watch application, watch-side numeric entry, or Apple Watch support.

## Release order

1. Apply migration 016 if it is still pending, then [017](../server/sql/017_pro_companion.sql), [018](../server/sql/018_advanced_workouts.sql), [019](../server/sql/019_muscle_focus.sql) and [020](../server/sql/020_routine_editing.sql) against the intended Supabase project. Existing prerequisite migrations 001–015 must already be present. Use each complete SQL file; do not rerun older non-idempotent migrations blindly.
2. Deploy the updated API, including the companion routes and workout/coaching changes. No migration activates a subscription or changes billing configuration.
3. Deploy the updated web app. Set mobile `EXPO_PUBLIC_WEB_URL` to its public HTTPS origin for coach-link creation.
4. Build/install a **new Android binary** to include the local widget module and updated permission copy. Existing native builds can display the JS features, but cannot acquire the widget module through OTA updates or Expo Go.
5. Verify signed-in Pro/free/expired accounts and two-device edits; check private photo upload/crop/compare/delete, revocation, interrupted sync, rest-day reminders, quiet hours/snooze, launcher pinning, and paired-watch actions on real supported devices.

This work does not apply live database migrations, deploy services, change store billing products, produce a signed native binary, or establish physical launcher/watch behavior. Device verification is required before shipping native features.

## Validation

Behavior tests cover comparable targets, confidence, plateau evidence, block/experiment comparisons, replacement evidence, readiness/metric corrections, rest days, preview invalidation, milestone direction, account switches, conflicting writes, reminder scheduling/DST/quiet hours/snooze, native bridge lifecycle and superset/watch rest parity.

Server tests cover owner/Pro enforcement, private-photo sanitisation, share allowlists/revocation, report measurements/tombstones, and bounded focus changes. Isolated PostgreSQL/PGlite scripts apply the actual migration files and verify ownership, grants, transaction rollback, CAS/idempotency, private storage configuration and preservation of existing workout snapshots. They do not use the production database. JavaScript type/lint/tests and Expo export do not substitute for native compilation or device QA.

Workspace verification on November 14, 2026: all **38 mobile test files** and **167 backend tests** passed, together with the four new SQL integration runners (companion, advanced workouts, focus, and routine editing). Mobile typecheck/lint, server build, web typecheck/lint and production webpack build passed; web lint retains two existing warnings. The final Android Metro/Hermes export is `/tmp/fitsync-companion-export` (`entry-cc3a1482f7ef3cd28dcbcf41dd01ebd4.hbc`). Expo autolinking discovers the local widget module and its XML resources validate. No signed native binary, launcher/watch session or live deployment was verified.
