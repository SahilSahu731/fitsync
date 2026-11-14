# FitSync Pro hub

The Pro tab is now a working hub rather than a subscription-only screen. Its four sections are Overview, Analytics, Trainer and Tools. Membership and store purchases live at `/membership`; all existing `/pro` links still open the Pro tab.

## Implemented user journeys

- Overview uses the signed-in user's real weekly workouts and lifetime totals, with direct entry to muscle insights, exercise records, all-time history, measurements, coaching, calculations and saved routines.
- Analytics provides 7/30/90/365-day and all-time ranges. Training charts cover completed workouts, external volume, working sets, minutes, repetitions, logged set distance, timed work and recorded set RPE. An equal-length previous period is compared only when a nonzero baseline exists; all-time has no invented comparison period.
- The front/back muscle map and all 20 catalog muscle groups show primary sets, supporting sets, training days, average weekly primary sets, overlapping external volume, contributing exercises and last recorded training date. A completed set can involve several muscles; group totals must not be summed into distinct-set totals. Supporting sets are not assigned arbitrary fractional credit. Missing labels remain unclassified. No recovery, muscle growth or injury score is inferred.
- Exercise analysis includes all-time bests, load/repetition/estimated-1RM/session-volume/duration/distance trends according to tracking type, genuine subsequent record improvements, recorded effort and links to actual workouts. The first result establishes a baseline. Repetition and duration records are descriptive, not proof that performance improved under comparable conditions.
- Measurements use all 31 existing metrics and their correction-aware journal values. Search, category filters, inline graphs, logged-day counts, full trends, editing, clearing and new check-ins use the existing metric journal. Only body weight converts kg/lb; circumferences remain cm.
- Trainer loads the current coaching plan and a server-generated weekly review. The plan maker collects goal, experience, equipment, available days, session duration and start date. Its read-only server preview shows every prescription across four weeks before saving. Save revalidates the catalog and uses the existing idempotent plan transaction; it can replace the current plan while preserving completed workouts. Time/equipment/effort changes, swaps, progression and rescheduling open the existing complete coaching flow.
- Tools include the working warm-up/plate calculator, Epley/Brzycki one-rep-max estimates, unlimited routine creation, private custom exercises, calendar, meals/shopping list, program archive and opt-in health connections. These connect to their existing complete destinations.
- Routine listing now paginates all saved routines instead of relying on Supabase's default response limit. No subscription cap is introduced for the existing free routine feature.

## Honest history and calculations

`features/pro/analytics.ts` is a pure account-independent calculation over the already account-scoped journal. It excludes unfinished, discarded, active and future workouts. Completed warm-ups remain separate from working-set totals. External volume includes only `reps_weight`. Estimated 1RM uses the existing Epley estimate on positive-load sets with 1–12 reps; an actual single repetition retains its logged load. Duplicate exercise items in one workout aggregate into a single exercise-session observation.

Long training ranges aggregate into weeks or months without discarding workouts. Detailed graphs page through 60 points at a time so every saved value remains accessible without thousands of native touch targets. Measurement cards preview up to the latest 60 logged values; their detailed trend retains the full selected range. Corrections and cleared entries are resolved before summarizing; missing measurements are not zeros. Period and bucket durations retain fractional minutes internally.

The warm-up calculator accepts a working load including the bar, bar weight, rounding increment, available plate sizes and counts **per side**, editable percentages and reps, and kg/lb. Bounded dynamic programming selects achievable plate combinations, including cases where a greedy algorithm fails. It rounds down, never invents plates, combines duplicate achievable loads and never exceeds working weight. Loads at or below the selected bar produce an explicitly unverified lighter-implement guide. Unit changes convert working load and reset the standard bar/inventory, with that behavior explained in the form. No calculator writes logged workout sets automatically.

## Private custom exercises

Apply `server/sql/016_custom_exercises.sql` after migrations 004, 006 and 007 **before deploying the updated API**. It adds nullable `owner_user_id`, appends ownership to the existing catalog view and introduces a service-role-only atomic save function. Existing rows remain public catalog rows; no existing account gains Pro. The original author foreign key is deferred so private owner cascades can finish during account deletion; public exercises retain their existing author-integrity constraint.

Private creation/editing requires authenticated, server-verified Pro through the existing billing middleware. The actor always comes from the verified session. Bodies cannot choose an owner, slug, publishing state or premium flag. Existing private exercises can still be read, used, archived and restored after membership expiry. Archival hides new selection while preserving old logs; existing saved routines can still start with their owner's archived exercises. Tracking type cannot change once a custom exercise is referenced by a routine or session.

Catalog/picker/detail and workout ID validation apply public-or-owner visibility. Public discovery, coaching generation, catalog administration and seed lookup exclude private exercises. A database trigger also rejects attempts to insert private movements into shared catalog routines. The small muscle index includes the user's own archived labels. Synced workout rows also retain their exercise-muscle relationships so older/archived movements remain analyzable offline after a current sync. Labels reflect the library at synchronization time, not a historical physiological measurement.

Custom exercises use the normal routine/session foreign keys and pickers. Picker caches are partitioned by the API's non-secret identity generation and invalidated on custom changes, preventing cross-account cache reuse. The editor preserves drafts on validation/network failures and supports search, editing, archive and restore.

## API additions

- `GET /api/exercises/custom`: all of the signed-in user's custom exercises, including archived ones.
- `POST /api/exercises/custom`: Pro-only creation.
- `PATCH /api/exercises/custom/:id`: Pro-only editing with a complete validated input.
- `DELETE /api/exercises/custom/:id`: owner-only archival.
- `POST /api/exercises/custom/:id/restore`: owner-only restoration.
- `GET /api/exercises/muscle-index?page=1`: paginated public/own muscle metadata.
- `POST /api/coaching/plans/preview`: read-only preferences/start-date/timezone preview; the existing free starting plan remains free.
- `POST /api/coaching/plans`: optionally accepts validated `preferences`; request replay checks include them. All other coaching contracts are preserved.

## Membership and material states

Deep analytics are shown for verified Pro members; free members see feature-specific explanations and a membership destination. Normal charts, records, full history, measurements and raw export stay free in Progress. The trainer's starting-plan flow and already-free tools remain available. Paid server operations continue to enforce entitlement; no development premium flag or entitlement bypass is added.

Loading, first-use empty states, failed sync with cached history, missing metadata, expired/unknown membership, store unavailability, plan-preview failure and save failure have explicit paths. Tools remain usable while workout history opens. Account changes remount account-bound UI and requests use identity checks. Store configuration and real purchase/restore activation remain the existing release prerequisites in `billing.md`.

Glass cards use one separate decorative blur target per screen, with an Android fallback and iOS Reduce Transparency support. Native press springs, stagger-ready entrance reveals and muscle progress fills respect the shared reduced-motion preference. There are no new continuous background animations or runtime dependencies.

## Evidence and verification

The trainer uses the existing deterministic prescription engine; it is not a clinician, conversational AI or a validated prediction of an individual's best possible plan. Training principles reference [ACSM's 2026 overview](https://acsm.org/resistance-training-guidelines-update-2026/). Warm-up variability and the absence of a universal best protocol are discussed in the [2025 systematic review](https://pubmed.ncbi.nlm.nih.gov/39864808/). Editable warm-up percentages are product defaults, not prescribed by those sources.

Automated coverage includes analytics arithmetic and history boundaries, measurement corrections, PR baselines, plate inventory and non-greedy assembly, Pro navigation/expiry, loading-independent tools, account-scoped picker caches, custom input/visibility, plan-preview non-mutation, existing billing/coaching/workout flows, and the actual SQL migration in a fresh in-memory PostgreSQL instance.

Run the SQL check without production data:

```sh
FITSYNC_PGLITE_MODULE=/tmp/fitsync-pro-sql/node_modules/@electric-sql/pglite/dist/index.js node server/tests/custom-exercises.sql.integration.mjs
```

Native device verification is still required for small screens, larger font settings, screen readers, reduced motion/transparency, keyboard/sheet interactions, long histories, blur performance and real store purchases. A successful Metro/Hermes export and component tests do not establish those device results. This change does not deploy the server, apply migrations to a live database, configure products, or publish a store build.
