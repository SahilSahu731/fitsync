# FitSync Pro feature proposal

Status: initial proposal from November 14, 2026. The user subsequently authorized the Pro hub, deep analytics, muscle insights, PRs, all-time graph history, measurement tools, unlimited routines, custom exercises, trainer, warm-up calculator and plan maker. See [pro-hub.md](pro-hub.md) for the implemented scope and verification. Other roadmap items below remain proposals, not shipped or promised subscription benefits.

## Product direction

FitSync Pro should help users decide what to do next: adapt training, understand performance, and plan their week. Home remains today's starting point; Train handles workouts; Progress holds stats, health and history; Library holds browsable content; Pro becomes the coaching and membership hub.

Keep workout logging, saved routines, the free starting plan, basic exercise instructions, all current health metrics, personal records, ordinary charts, full history, raw export, existing health imports and private commitments free. Preserve access to a user's own records after their subscription ends.

Existing below means code exists in this repository. It does not mean store configuration, deployment or real-device purchases have been verified. New and Extend describe proposals only.

## Full proposed feature list

### Training and programs

| ID  | Feature                               | What the user gets                                                                                                                   | Repository baseline                              | Suggested timing              |
| --- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ | ----------------------------- |
| 1   | Advanced personalized training blocks | Multi-phase plans with chosen splits, goals, session length, equipment and training days, beyond the free starting plan.             | Extend free four-week plans                      | Later                         |
| 2   | Expert program collection             | Reviewed strength, muscle-building, home, beginner and return-to-training programs, with clear prerequisites.                        | New premium collection                           | Later                         |
| 3   | Shorten or extend today's session     | Preview a session adjusted to today's available time.                                                                                | Existing adaptation                              | Launch                        |
| 4   | Equipment-aware substitutions         | Adapt for gym, dumbbells or bodyweight and swap a suitable movement before accepting.                                                | Existing adaptation                              | Launch                        |
| 5   | Saved training locations              | Keep different equipment lists for home, gym and travel.                                                                             | New                                              | Later                         |
| 6   | Easier-day adjustment                 | Choose a lighter session while keeping the plan coherent.                                                                            | Existing adaptation                              | Launch                        |
| 7   | Missed-session rescheduling           | Move an unstarted session and the remaining schedule while preserving spacing.                                                       | Existing                                         | Launch                        |
| 8   | Pause, travel and return mode         | Pause a plan and review its resumed calendar instead of accumulating overdue sessions.                                               | New                                              | Later                         |
| 9   | Explained progression                 | Suggest load or repetition targets from comparable recorded sets; let users choose a real available increment and accept the change. | Existing load progression; extend other types    | Launch baseline, extend later |
| 10  | Plateau review                        | Explain when comparable performance has stalled and propose one reviewable change.                                                   | New                                              | Later                         |
| 11  | Easier training weeks                 | Offer a lighter block when recorded effort, attendance and user feedback justify reviewing the plan.                                 | New                                              | Later                         |
| 12  | Plan editing with previews            | Review the affected days, accept or discard changes, and retain a change history.                                                    | Existing preview/accept; extend history and undo | Launch baseline, extend later |

### Coaching and recovery

| ID  | Feature                        | What the user gets                                                                                                       | Repository baseline                                   | Suggested timing |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- | ---------------- |
| 13  | Weekly coaching review         | Completed work, useful observations, missing-data notes and specific next steps.                                         | Existing                                              | Launch           |
| 14  | Guided weekly check-in         | Review schedule, preferences, effort and goals before accepting next week's changes.                                     | New guided flow                                       | Launch           |
| 15  | Coach questions                | Ask about the saved plan or logged performance; receive explanations connected to the actual data.                       | New; current coaching is deterministic, not a chatbot | Later            |
| 16  | Daily training recommendation  | Suggest the planned workout, a lighter option or rest based on recent logs and self-reported readiness; show the reason. | New                                                   | Later            |
| 17  | Recovery trends in context     | Put sleep, soreness, energy and effort next to training performance, with coverage and source labels.                    | Extend free recovery tracking                         | Later            |
| 18  | Warm-up and cooldown selection | Offer session-specific preparation and cooldown routines from reviewed content.                                          | New                                                   | Later            |
| 19  | Goal milestones                | Break a training goal into reviewable milestones and revisit them at check-ins.                                          | Extend free goals                                     | Later            |
| 20  | Return after a break           | Re-establish a recent baseline and revise future sessions without treating old bests as today's capacity.                | New                                                   | Later            |

Recovery suggestions must be presented as training guidance, not medical assessments or precise measurements of muscle recovery. Keep manual effort and readiness feedback available even when wearable data is missing.

### Progress intelligence

| ID  | Feature                      | What the user gets                                                                                           | Repository baseline                            | Suggested timing |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- | ---------------- |
| 21  | Program-level insights       | Scheduled-week trends, adherence, routine comparisons and drill-down into actual workout logs.               | Existing Pro insights                          | Launch           |
| 22  | Muscle-group workload        | Weekly completed sets by muscle group and movement pattern with clear counting rules.                        | New                                            | Launch           |
| 23  | Comparable exercise analysis | Compare similar sessions, load, reps and effort; distinguish more volume from stronger performance.          | Extend free exercise records and estimated 1RM | Later            |
| 24  | Custom period comparisons    | Compare chosen training blocks or date ranges, including incomplete-period labels.                           | Extend ordinary free ranges                    | Later            |
| 25  | Monthly coaching report      | A readable monthly recap with a small set of next actions and a shareable PDF.                               | New; raw export stays free                     | Later            |
| 26  | Trend observations           | Explain sustained attendance, training and logged weight trends only when enough data exists.                | New                                            | Later            |
| 27  | Custom insight dashboard     | Pin the coaching insights and goal indicators a user cares about.                                            | New                                            | Later            |
| 28  | Private progress photos      | Optional dated photos and side-by-side comparisons, with deletion controls and no public posting by default. | New                                            | Later            |

### Nutrition and meal planning

| ID  | Feature                             | What the user gets                                                                                          | Repository baseline                                  | Suggested timing |
| --- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------- |
| 29  | Weekly meal menu                    | Build a menu from dietary preferences and reviewed recipes.                                                 | Existing                                             | Launch           |
| 30  | Meal replacements                   | Swap menu items while retaining saved preferences.                                                          | Existing                                             | Launch           |
| 31  | Servings and shopping list          | Scale quantities and share a practical grocery list.                                                        | Existing                                             | Launch           |
| 32  | Budget and cooking-time preferences | Favor affordable, quick meals and locally relevant food choices.                                            | New                                                  | Later            |
| 33  | Meal-prep planning                  | Reuse ingredients, batch recipes and plan leftovers across the week.                                        | New                                                  | Later            |
| 34  | Nutrition coaching check-in         | Review intake and weight trends and offer user-approved target changes when logging coverage is sufficient. | New; current menu planner does not prescribe targets | Later            |
| 35  | Food database and barcode lookup    | Search food entries and scan products, with editable portions and visible data sources.                     | New; licensing and regional coverage required        | Later            |
| 36  | Reusable meals and recipe import    | Save frequently eaten combinations and import recipes with editable nutrition estimates.                    | New                                                  | Later            |

A larger food database and adaptive nutrition are separate investments. Do not advertise them as part of today's curated meal planner. Food-photo calorie estimation is not recommended for the initial scope.

### Planning, integrations and convenience

| ID  | Feature                         | What the user gets                                                                                       | Repository baseline                                              | Suggested timing |
| --- | ------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------- |
| 37  | Pro home hub                    | Today's coaching action, current plan, next review, meal plan and membership shortcuts in one place.     | New; the current Pro tab reuses the existing subscription screen | Launch           |
| 38  | Coaching reminders              | Optional reminders for reviews and accepted plan changes, respecting quiet hours and completed sessions. | Extend existing program reminders                                | Later            |
| 39  | Offline plan access             | Download upcoming prescriptions and reviewed exercise media; queue supported edits visibly.              | Extend existing local workout saves                              | Later            |
| 40  | Training calendar sync          | Sync accepted future sessions with a chosen external calendar and handle later rescheduling.             | Extend existing calendar integration after capability review     | Later            |
| 41  | Watch workout controls          | Start/resume sessions, record sets and run rest timers from a companion watch app.                       | New platform work                                                | Later            |
| 42  | Additional wearable connections | Add specific integrations only after choosing supported devices and data types.                          | New; existing Health Connect/HealthKit imports remain free       | Later            |
| 43  | Private coach sharing           | Grant a chosen coach time-limited access to selected reports, then revoke it.                            | New; existing private commitments remain free                    | Later            |
| 44  | Priority support                | A clear support channel with a response target the team can actually sustain.                            | New operational commitment                                       | Later            |

### Membership essentials

These are required subscription controls, not benefits that should themselves be paywalled.

| ID  | Feature                          | What the user gets                                                                                                           | Repository baseline                                           | Suggested timing         |
| --- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------ |
| 45  | Clear free-versus-Pro comparison | Exactly what is included, what is available now, and what remains free.                                                      | Existing benefits copy; extend comparison                     | Launch                   |
| 46  | Monthly and annual options       | Local store prices, billing periods, renewal terms and genuine savings when offered.                                         | Existing offering support; actual products need configuration | Launch                   |
| 47  | Eligible introductory offer      | Show a trial or introductory price only when configured and eligible.                                                        | Existing store-derived offer support                          | Optional launch decision |
| 48  | Restore and account access       | Restore purchases and reconcile membership with the signed-in account.                                                       | Existing                                                      | Launch                   |
| 49  | Manage membership                | Show active/pending/expired status, renewal date, and access to store cancellation/management.                               | Existing                                                      | Launch                   |
| 50  | Clear billing failure states     | Explain unavailable offers, pending activation, failed verification and retry actions without prompting duplicate purchases. | Existing                                                      | Launch                   |

## Recommended first release

Start with the existing premium capabilities (3, 4, 6, 7, 9's current load progression, 12's preview/accept, 13, 21, 29–31), plus a useful Pro hub (37), a guided weekly check-in (14), and muscle-group workload (22). Include the membership essentials (45, 46, 48–50); decide separately whether to offer a trial (47).

This keeps the paid promise focused on adaptive training, weekly direction and meal planning. All later items remain candidates, not promised subscription benefits. Do not put unbuilt features on the live paywall.

## Pro tab after approval

For free members: a concise benefit overview, real previews, the comparison, current offers and restore. For paid members: today's coaching action, current plan, weekly check-in/review, meal planning, program insights, and membership management. Do not turn the paid member's primary tab into a permanent upsell screen.

## Decisions to finalize before development

1. Approve or change the recommended first-release set by feature ID.
2. Choose whether nutrition remains a core pillar or is deferred after the existing meal planner.
3. Decide whether conversational coaching belongs in a later phase; choose a usage policy before promising unlimited access.
4. Set monthly/annual positioning and trial policy after reviewing operating costs. No price is assumed here.
5. Prioritize watch support, nutrition logging and private coach sharing independently; each adds substantial scope.

## Research informing the proposal

These are product recommendations for FitSync, not a claim that all competitors have every feature. Fitbod describes personalization around goals, equipment, past performance and recovery in its [official FAQ](https://fitbod.me/faqs/). Hevy's [official Pro description](https://help.hevyapp.com/hc/en-us/articles/35119778922263-Hevy-Pro-Subscription-How-to-get-Pro-and-What-Does-It-Include) includes expanded tracking and muscle distribution. MacroFactor's [official check-in guide](https://help.macrofactorapp.com/en/articles/247-introduction-to-check-ins-and-coaching-modules) describes weekly nutrition reviews and suggested target changes. These support a direction centered on adaptation and interpretation; FitSync's existing free tracking should stay useful.
