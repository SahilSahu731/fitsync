# Personal training plans and adaptive coaching

The Coach screen uses real published exercise records and normal workout logging. The server creates a free four-week starter plan from the saved goal, experience, available equipment, session duration and training days. Beginner plans use up to three strength days per week; other levels use up to four. Four-day plans alternate upper and lower body. Additional available days are reserved for comfortable activity and recovery. Programs are deterministic prescriptions, not medical assessments or AI-generated exercise facts.

Strength plans emphasize 5–8 repetitions and longer rest; muscle plans emphasize 8–12 repetitions. General fitness uses 8–15 repetitions and shorter rest. Fitness/fat-loss plans include gentle published walking/cycling/marching movements when suitable records are available. Missing movement patterns are disclosed. No unpublished exercise, unavailable bench or pull-up bar, or guessed starting weight is added. Week four reduces sets; the calendar never automatically raises loads.

The optional Pro tier adds accepted changes to a future session: shorten time, use a different equipment setup, choose an easier day, swap an exercise within the same movement pattern, request a progression suggestion, move a missed session and the remaining unstarted schedule, and read an actionable weekly review. Every premium server route uses the billing middleware and the authenticated account. Free plans and actual workout/history access do not depend on Pro.

## API

Mounted at `/api/coaching`; all routes require the existing signed-in session.

- `GET /`: current fitness preferences and the current plan, or `plan: null`.
- `POST /plans`: `{requestId,startDate,timezone,replacePlanId?}`. A generated replacement requires the ID of the current plan and preserves old plans/logs.
- `POST /sessions/:id/start`: `{requestId}`. Returns the normal workout-session response; use the existing workout screen to log/finish/discard it.
- Pro `POST /sessions/:id/adapt`: `{requestId,expectedRevision,minutes?,equipment?,effort?,swapExerciseId?,preview?}`. Equipment is gym/dumbbells/bodyweight; effort is normal/easy; minutes accepts 15–90.
- Pro `POST /sessions/:id/progression`: `{requestId,expectedRevision,incrementKg?,preview?}`. The optional increment is a total logged-load increment in kg, not an amount per barbell side. The app never assumes a gym actually has that increment.
- Pro `POST /sessions/:id/reschedule`: `{requestId,expectedRevision,date}`. Moves this day and later unstarted days by the same interval, preserves spacing and logged history, and rejects collisions. Dates are interpreted in the plan timezone.
- Pro `GET /review`: observations, next actions, seven-day workout metrics, period dates and missing-data notes.

`preview:true` returns the proposed plan without persisting it. Remove that flag and submit the same proposed parameters to accept. A preview does not reserve a request key; the server recomputes from current data when accepted. Every accepted mutation has a UUID request key. Reusing it with another payload is rejected. Revisions reject stale changes from another device.

## Logging and comparison semantics

Starting a Coach session atomically creates a normal workout with the accepted day's sets and links it to that day. Repeated starts resume the existing active/completed workout. A discarded workout can be retried with a new request key. Starting the baseline saved routine from Train is an independent workout; start from Coach to credit a planned day. Saved routines remain the starter prescription, while per-day accepted changes live on the plan. Completing at least one logged set through the normal workout API credits that day; merely opening or discarding a session never does. Counts come from actual workout status and completed sets, not a client completion switch.

Progression compares the same exercise/tracking type and equal-load straight working sets within 42 days. It needs two completed sessions on separate days with the same set count, all top-range repetitions and recorded manageable effort (RPE ≤8 and/or RIR ≥2, with no conflicting hard rating). Warm-ups, heavy/drop/failure sets, incomplete sets, changing loads, missing effort and sparse baselines never justify an increase. Candidate increases are capped at 5%; otherwise the explanation asks for a smaller available increment or more repetition practice. A real recent baseline can be carried forward without increasing it. Bodyweight/time progression and easier weeks are held rather than pretending that logged reps establish suitable exercise difficulty. Users can edit the actual load/repetitions while logging.

Reviews resolve the append-only health journal's corrections and deletions, then use recorded days only. They identify comparable same-exercise/load/set-count rep changes where available, attendance, consistently high recorded effort and limited sleep context. They do not claim that volume is strength, weight is fat mass, or sleep caused a performance change; one week never establishes a sustained fat-loss trend. Missing synced health data is reported honestly. Nutrition estimates are handled separately by wellness features.

## Deployment and validation

Apply `server/sql/014_coaching.sql` after the normal workout/program migrations and optional progress journal migration. It creates service-role-only plans, dated prescriptions, actual-workout links and transactional idempotency records, plus RPCs and a completion guard. It does not write production data from this checkout. Deploy the server and mobile changes together. Billing configuration and server-verified entitlements must be working before premium requests can succeed.

Run `npm run build` and `npm test` from `server/`. Coaching tests exercise all goals/equipment combinations, honest sparse-catalog behavior, time/equipment/easier-day changes, progression boundaries, health corrections, actual-log status, account scoping, stale revisions and replay protection. Device acceptance should include a free plan, a verified Pro account, denial when not entitled, preview/accept, a real logged workout, discarded retry, rescheduling, offline behavior and account changes. UI/device purchases and live provider configuration require separate verification.

For database verification, use only a fresh disposable local database named `fitsync_coaching_test`: `psql -v ON_ERROR_STOP=1 -d fitsync_coaching_test -f server/tests/sql/coaching-bootstrap.sql` from the repository root. The bootstrap runs the actual migrations 006–008 and 012–015 with minimal earlier fixtures; the lifecycle assertions roll back. Never run the bootstrap against an existing database.

Without a local PostgreSQL server, the optional `server/tests/coaching.sql.integration.mjs` runs the same real PL/pgSQL assertions in an isolated in-memory PGlite PostgreSQL engine. Install `@electric-sql/pglite` into a temporary directory and pass its absolute module path through `FITSYNC_PGLITE_MODULE`; no runtime dependency or production database connection is needed. HTTP integration tests create a temporary loopback listener and need an environment that permits localhost sockets.
