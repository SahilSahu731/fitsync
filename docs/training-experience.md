# FitSync training terminology and experience

## Terms used throughout the product

- Exercise: an individual movement with instructions and a tracking type.
- Routine: a reusable plan for one session, containing exercise order, sets, targets, and rest.
- Workout: an actual session, with recorded performance and a completion time.
- Program: routines and recovery days scheduled across multiple weeks.
- Category: a browsing label for routines, such as gym or bodyweight. It is not a program.

Example: Upper / Lower is a program; Upper Body is a routine; the Upper Body session completed today is a workout.

## Implemented experience

The website training library separates programs and routines, supports relevant filters, previews exercises and weekly schedules, and explains what saving does. Published catalog reads are public; personal data, saves, and administration require authentication. Save actions use the existing mobile-backed catalog APIs. Login returns to the selected plan.

Program pages describe the actual data model: a seven-day schedule repeated for the listed number of weeks. They do not claim automatic load progression, individualized coaching, or week-specific exercise changes. Rest days appear explicitly. Category, routine, and program explanations also appear in the admin editor. Mobile routine creation uses “routine” rather than “workout”; saving messages distinguish library preparation from starting a session.

Duration-based exercise targets are copied into target_duration_seconds instead of target_reps when saving a catalog routine.

## Content and verification limits

Only published catalog records are displayed. This change does not publish unreviewed exercises or seed incomplete routines. Existing catalog content still requires editorial review and publication. Live workout logging remains in the mobile app. Saved routines are personal copies, not live references to catalog prescriptions.

Browser/device visual QA was unavailable in this session. The existing mobile Explore lint issue is separate from these changes.

## Research

Reviewed October 23, 2026:

- Hevy, Workouts vs Routines: https://help.hevyapp.com/hc/en-us/articles/33703513582871-Workouts-vs-Routines-in-Hevy-What-They-Mean-and-How-to-Use-Them
- Hevy, Routine and Program Library: https://help.hevyapp.com/hc/en-us/articles/36011518408983-How-to-Access-and-Use-Hevy-s-Routine-and-Program-Library
- NSCA, Determination of Resistance Training Frequency: https://www.nsca.com/education/articles/kinetic-select/determination-of-resistance-training-frequency/

Hevy informs the separation of reusable plans from performed sessions and the preview/save/start flow. NSCA informs the emphasis on available training days, experience, and recovery. No Hevy visual assets or branding are reused.
