# Editing the FitSync homepage

`src/app/page.tsx` only arranges the sections. Reorder, add, or remove a section there.

## Where to edit

| File                        | What it controls                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `content.ts`                | Hero copy and links, image paths, ticker labels, getting-started steps, movement descriptions, sample workouts, and FAQs |
| `hero-section.tsx`          | Hero headline, buttons, assurances, and the product facts strip                                                          |
| `hero-visual.tsx`           | Athlete illustration, track layers, pointer tilt, floating motion, and pause control                                     |
| `app-preview-section.tsx`   | Separate interactive app demo section                                                                                    |
| `workout-preview.tsx`       | Interactive example phone: choose a session and toggle example sets                                                      |
| `movement-ticker.tsx`       | Moving labels and their pause/resume button                                                                              |
| `story-section.tsx`         | Scroll-emphasized statement and the three getting-started steps                                                          |
| `features-section.tsx`      | Movement library, progress, and connected-device panels                                                                  |
| `movement-study.tsx`        | Strength, mobility, and bodyweight illustration controls                                                                 |
| `progress-illustration.tsx` | Example trend chart and connected-device SVG artwork                                                                     |
| `rhythm-section.tsx`        | Program-planning section and weekly rhythm preview                                                                       |
| `equipment-section.tsx`     | Interactive 3D equipment section                                                                                         |
| `faq-section.tsx`           | Native FAQ accordion layout                                                                                              |
| `cta-section.tsx`           | Lime closing section, image, and signup link                                                                             |
| `artwork.tsx`               | Decorative SVG orbit, gesture arrow, and track lines                                                                     |

## Shared design and interactive components

- Colors, Inter, animation definitions, and reduced-motion defaults: `src/app/globals.css`.
- Reveal, scroll emphasis, pointer light, tilt, and reading progress: `src/components/motion.tsx`. These use Tailwind classes rather than inline CSS.
- Movement illustrations: `src/components/training-sketch.tsx`.
- Weekly planner controls: `src/components/routine-rhythm.tsx`.
- 3D scene, weights, keyboard controls, and motion toggle: `src/components/dumbbell-scene.tsx`.
- Navigation and footer: `src/components/shell.tsx`.

Change `homeImages` in `content.ts` when replacing imagery. Put final assets in `public/art/`; Next Image URLs start with `/art/`. The chalk runner leads the hero and also appears in the equipment section. The studio image sits behind the separate app demo, and the preparation photo appears in the closing section. Image generation details are in `docs/homepage-design.md` at the repository root.

The phone, chart, and weekly rhythm are clearly marked examples. The phone and planner update local preview state only; they do not save workouts or change a user's account. Keep example labels when editing them.

The ticker and floating hero artwork each have a pause control. Reveal/tilt/chart animations honor reduced motion, and content remains readable without JavaScript.

## Validate changes

From `web/`:

```bash
npm run build
npx prettier --check src/app/page.tsx src/app/globals.css src/components/home src/components/motion.tsx
```
