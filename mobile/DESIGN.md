# FitSync app visual system

The app follows the website's black and white direction with Poppins and restrained lime accents. NativeWind classes handle the shared controls and new layouts. Native animation, chart dimensions, safe-area offsets and runtime data still use the native styles those APIs need.

## Foundation

- `src/constants/theme.ts` and `tailwind.config.js` share black, charcoal, white, muted gray and lime tokens.
- `src/app/_layout.tsx` loads bundled Poppins regular, medium, semibold, bold and extra-bold assets before the navigator becomes visible.
- `src/components/ui.tsx` provides text, borderless cards, pills, buttons, section headings and the page heading.
- `src/components/motion.tsx` keeps short native press feedback and focus entrances, and respects both system and in-app reduced-motion settings.
- The floating tab bar has a spring-driven sliding selection, a small icon lift, and a label that fades in below only the active icon. Every tab keeps an accessible name and a fixed touch target. Motion respects the system and in-app reduced-motion settings; the existing blur fallback remains in place.

## Journeys

Home leads with the next workout, then weekly activity, personal plans and daily check-ins. Train puts starting or resuming a session before discovery and saved content. Routine cards have separate, comfortably sized preview and start actions. The live workout header contains long names, and logged sets use a checked state with an explicit undo action.

Library keeps search, categories, published content, loading, empty and retry states. Progress keeps all tracking, targets, histories, export, foreground walks and charts. Its overview/health/history control shares the same segmented pattern as the rest of the app.

Profile groups everyday tools and account preferences, uses the saved weight unit and presents membership separately. Sign-in, onboarding selections, measurement controls, coaching, programs, health import, meals, settings, dialogs and billing use the same surfaces and typography. Purchase offers, prices, subscription terms and restore/manage controls still come from the existing billing flow.

Red remains available for real error or destructive states. Selected muscles use the brand accent. Exercise/media content is retained; decorative palettes and card outlines have been removed.

## Verification

- TypeScript check and Expo lint pass.
- All 19 existing test files pass, including workout/offline, notifications, progress, coaching, health, calendar and billing checks.
- Android Metro export succeeds with Poppins assets bundled locally.
- NativeWind utility generation succeeds.

A device or emulator visual pass is still required. Compilation and automated checks do not establish device layout, accessibility or animation conformance.

Restart Metro with `npm run start:clean` after this change so the NativeWind config and font assets reload in the existing development client. The new font package contains assets and does not add a native module.
