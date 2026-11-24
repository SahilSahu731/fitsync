# Contextual Pro previews and seven-day trial setup

The mobile changes are implemented. The seven-day trial must also be configured
in Google Play and returned by RevenueCat for an eligible customer. Until that
happens, checkout shows the ordinary store price without a trial promise.

## 1. Create the Google Play offer

1. Open Play Console and select FitSync (`com.sahil.fitsync`). Open **Monetize with
   Play → Products → Subscriptions** (console labels can vary).
2. Open the subscription used for Pro. Check that its monthly and yearly base
   plans are **auto-renewing**, active, priced and available in your launch regions.
   Keep existing product and base-plan IDs; changing IDs can break existing buyers.
3. On the yearly base plan, choose **Add offer**. Give the offer an ID such as
   `seven-day-trial`.
4. Choose **New customer acquisition** eligibility and the appropriate “never had
   any subscription in this app” rule. Use Google Play eligibility, rather than
   developer-determined eligibility, for this acquisition offer.
5. Add one **Free trial** phase lasting **7 days** (one week is also supported).
   After that phase, the customer must go directly to the normal yearly price.
   Do not add an intermediate discount phase if you want the exact Day 7 billing
   timeline implemented here.
6. Check the regions and final renewal prices, then save and activate the offer.
   An offer cannot add a free trial to Lifetime Pro; that remains a one-time purchase.
7. Repeat on monthly if you want eligible monthly buyers to receive the same
   seven-day trial. Yearly remains the app’s default when available.

The app deliberately recognizes only an exact seven-day free phase in the selected
Android default option. It continues showing other introductory terms accurately,
but does not label them as this seven-day trial. Google Play determines eligibility;
returning customers may see ordinary billing.

Official references: [Create and manage subscriptions](https://support.google.com/googleplay/android-developer/answer/140504?hl=en),
[RevenueCat offers](https://www.revenuecat.com/docs/subscription-guidance/subscription-offers).

## 2. Verify RevenueCat products and packages

1. Open your existing RevenueCat project and Android app. Verify the Google Play
   service account connection and store credentials are healthy.
2. Under **Product catalog → Products**, import or verify the existing Google Play
   products. RevenueCat maps Android products to subscription **base plans**; the
   acquisition offer belongs to the Play base plan, not a new entitlement.
3. Attach monthly/yearly (and Lifetime, if sold) to the existing **`pro` entitlement**.
   If your server uses a different `REVENUECAT_ENTITLEMENT_ID`, keep that existing
   mapping consistent.
4. In the current Offering, ensure the monthly and annual packages point at the
   correct base plans. Do not create a duplicate package just for the trial.
5. Check that the acquisition offer has no `rc-ignore-offer` tag. Avoid competing
   eligible offers with a longer trial: RevenueCat’s default option can select
   another eligible offer. This app purchases that same default package option.
6. Keep RevenueCat webhook/server verification configured. A successful store
   purchase alone does not unlock Pro before the server confirms the entitlement.

Reference: [RevenueCat Google Play product setup](https://www.revenuecat.com/docs/getting-started/entitlements/android-products).

## 3. Test the purchase and reminder on Android

1. Upload the compatible native build to your Play internal testing track and add
   a license tester. Install through the testing track using that Play account.
2. Use a tester eligible for the new-customer offer. Open Pro from a real preview.
   Check yearly selection, actual annual charge, monthly equivalent and savings.
3. Confirm the CTA says **Start my 7-day free trial** and the timeline states full
   access today, an optional Day 5 reminder, and the exact Day 7 charge/renewal period.
   Check the visible Restore and close controls.
4. Tap **Remind me two days before billing**, grant notification permission and
   complete checkout. The app schedules a local notification from the receipt’s
   actual expiry minus two days. It never schedules merely because checkout opened.
5. Test notification denial: checkout must still work, the reminder stays off,
   and the UI tells the customer to set their own reminder.
6. Test cancellation and reopening FitSync. Reconciliation cancels the pending
   reminder when the receipt no longer represents a renewing trial. Signing out or
   changing FitSync accounts clears it too. Purchases and access remain store/server
   controlled.
7. Test an ineligible returning account. It must see normal pricing and no false
   seven-day CTA/timeline. Test restore, cancelled checkout, offline verification,
   and pending activation without a duplicate purchase.

Play test subscriptions can use accelerated durations. A receipt whose actual trial
is not seven days will not schedule a misleading “two days before” reminder. Verify
the normal-duration reminder with a controlled notification/receipt test and a real
eligible device before broad rollout. Device reminders are optional, depend on OS
permissions/settings, and do not replace Google Play billing communications. If the
app is never reopened after an external cancellation, its local reminder may remain
until the OS delivers it; opening FitSync reconciles the current store state.

## 4. Verify the personal preview journeys

- **Workout three:** save three distinct completed strength workouts. The summary
  shows actual logged totals and one target from the existing progression engine.
  Missing effort produces an honest repeat target. Other targets and full planning
  remain Pro. No supported recorded set means no invented target.
- **Personal best:** beat a previous comparable working set. The celebration and
  sharing controls appear first, followed by the next-target preview. A first-ever
  movement and warm-ups do not count as records.
- **Missed session:** let a real structured-plan session become overdue. The card
  identifies that session and an available date. A free/lapsed member can upgrade;
  a Pro member can confirm the move through the existing revision-checked reschedule
  API. It never changes a plan silently. This trigger needs a saved structured plan;
  it does not infer a missed workout from inactivity or invent a free-user schedule.
- **After day seven:** the first completed signup week supplies one visible review
  insight from actual logs. Remaining insight titles are locked. Empty weeks do not
  get fabricated reviews. Each later completed week has its own preview.
- **Free access:** previous-session hints, logging and saved routines remain free.
  Existing custom-exercise and meal-plan gates continue to work.
- **Prompt frequency:** proactive cards are limited to one per account per app process, at least
  48 hours apart, at most two in a rolling seven days, and once per event/review ID on
  that installation. Pro members do not see these upgrade prompts. Manually opening
  Pro or a gated feature is always available.
- **Delayed completion:** unseen workout milestones remain eligible for 72 hours after
  completion, including a sync after midnight. Already-seen milestones cannot hide an
  eligible weekly review or recovery card. The same global cooldowns still apply.
- **Preferred units:** the live logger and target previews share a 2.5 kg / 5 lb load
  increment, while all stored weights remain in kg.

## 5. Measure the contextual funnel

Follow [the PostHog and Sentry setup guide](observability-setup.md) first. In PostHog,
create a funnel:

1. `upgrade_moment_viewed`
2. `upgrade_moment_opened`
3. `paywall_viewed`
4. `purchase_started`
5. `purchase_result`, filtered to `result=active`

Break down by `source`: `workout_three`, `personal_best`, `missed_session`, or
`weekly_review`. Each step carries the source, without workout values, exercise
names, account IDs or health information. Track `upgrade_moment_dismissed` alongside
views. Direct feature gates bypass proactive frequency limits, so compare those
paywall sources separately. Do not require a plan-selection event in the funnel:
yearly is already selected. Activation is not revenue; use RevenueCat/Play reporting
for renewals, trial conversions, refunds and financial totals.
