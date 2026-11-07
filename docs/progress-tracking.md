# Progress tracking

The mobile Progress screen follows the Train and Library design: neutral rounded panels, readable section headings, and a single mint accent. Its three views are Overview, Health, and History. Health contains Activity, Nutrition, Body, and Recovery categories. The daily selector controls check-ins and the optional history-day filter; chart ranges and workout comparisons always end today. Detailed exercise performance and consistency live in the Training details sheet.

## Free tracking

All 31 health metrics, personal targets, workout analytics, full journal history, and raw data export remain free. Health logging supports manual entries, optional foreground phone walks and explicit opt-in health imports.

- Activity: steps, active calories, walking/running distance (km), active minutes, floors climbed.
- Nutrition: food calories, protein, carbohydrates, fat, water (ml), fiber, sugar, sodium, caffeine.
- Body: weight (stored in kg, displayed in kg/lb), waist, body fat, chest, hips, upper arm, thigh, calf, neck. Circumferences use cm.
- Recovery: sleep duration, sleep quality, resting heart rate, HRV, energy, mood, stress, soreness. Subjective ratings are whole values from 1–5 with labeled endpoints.
- Workout analytics: completed sessions, time, working sets, reps, external-load volume, set duration/distance, RPE, exercise records, estimated 1RM, calendar, and weekly consistency.

Targets for steps, food and active calories, macros, water, sleep, active minutes, and body weight are optional. Weekly workout targets use the saved training preference until changed. New target fields merge into older goal events without erasing previously chosen values.

Check-ins replace a metric's displayed daily value by appending a correction to the account-scoped journal. Clearing appends a tombstone. Water shortcuts and saved phone walks increment the current daily total. Export includes revisions and cleared events. Missing values stay missing; chart averages use recorded days only. Body measurements, heart readings, and subjective ratings are never summed into period totals.

## FitSync Pro

The Progress Pro card opens the working subscription screen. Pro adds personal-plan adaptations, explained progression, weekly coaching reviews, weekly meal menus and shopping lists. Recipe browsing, manual logs, history, export and private commitments remain available without Pro. Purchase access is checked by the authenticated server; there is no client premium switch. See [billing.md](billing.md) and [pro-release.md](pro-release.md).

Optional Health Connect / HealthKit imports read steps, sleep and weight after explicit permission, retain source attribution and preserve manual overrides. Opt-in foreground imports run at launch and on returning to the app; there is no background service. See [health-sync.md](health-sync.md). Native permissions and store purchases need a new configured development/release build and real-device verification.

## Deployment and device checks

Deploy the updated server metric schema alongside the mobile update. On databases that have not yet enabled progress cloud sync, apply `server/sql/012_progress_tracking.sql` after migration 006. New metrics use the existing JSON journal and need no additional migration. Failed cloud requests keep local entries queued for retry.

The phone step counter requires motion permission and a supported device/build. It counts only while the Progress activity view is open and the app is active; it stops in the background. Walks must be saved once and must not be added to manual totals that already contain those steps. Health Connect and HealthKit imports are separate from the foreground walk counter. There is no food database, direct wearable integration or background tracking service.

Shared motion controls add spring press feedback, focus entrances for the five primary tabs, and animated goal fills. The floating navigation uses a spring layout transition. A single MotionProvider subscribes to the system reduced-motion preference; motion stops when reduced motion is enabled and hidden screens do not run entrance animations. Home uses actual saved workout and health data instead of demonstration activity or percentages. No new runtime dependency is required.

Validate on Android and iOS at small screen sizes, large text settings, with motion reduced, without a step sensor, and offline. Verify check-ins, correction/clear, water increments, goals, dates, trends, journal search, export and account switching.
