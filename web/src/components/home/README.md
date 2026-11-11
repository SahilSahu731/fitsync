# FitSync marketing website

The homepage follows the existing hero's black and white direction: Poppins, open layouts, neutral surfaces, a small amount of lime, and Tailwind utilities. There are no inline styles or injected style blocks in the active marketing components. Animation keyframes live in `src/app/globals.css`; Tailwind classes control their use and reduced-motion behavior.

## Active components

- `src/app/page.tsx` arranges the homepage.
- `hero-section.tsx` keeps the outlined headline, scattered fitness items, moving type and app drawer. Pause/resume controls stop the decorative motion. Store links come from the existing environment settings; no placeholder QR or invented store destination is shown.
- `../marketing/product-demo.tsx` provides keyboard-accessible Train, Plan, Track and Progress tabs. The set toggles change local illustrative data only.
- `../marketing/sections.tsx` contains the product story, weekly-plan example, health groups, movement library, Free/Pro comparison and closing section.
- `../marketing/feature-catalog.ts` records the capabilities and health metrics shown on the full features page.
- `faq-section.tsx` uses native, mutually exclusive disclosures.
- `../site/` owns navigation, branding and the footer.

The older artwork and section components remain available in this folder but are not mounted by the new homepage.

## Product grounding

Copy was checked against `mobile/src/features/workouts`, `coaching`, `program-follow`, `calendar`, `progress`, `wellness`, `explore`, `health-sync` and `billing`. Web catalog and profile actions keep using the existing API and account gates.

Workout tracking, a four-week starter plan, program following, manual health tracking, library content and raw export form the free core. Pro covers session adaptation, rescheduling, progression suggestions and weekly reviews. Actual subscription prices remain in the mobile purchase flow. Health import is optional and reads only steps, sleep and weight.

All preview values are illustrative. Marketing does not claim a food database, medical advice, invented user counts, testimonials or automatic health imports beyond the implemented metrics.

## Verification

From `web/`, run `npm run build -- --webpack`. The project also supports its default Turbopack build, but this execution environment restricts the local ports Turbopack's worker needs. Browser QA requires a connected browser host; compilation does not establish visual or interaction conformance.
