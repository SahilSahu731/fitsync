# FitSync homepage refresh

The homepage now composes eight independent sections from `web/src/components/home/`. Shared copy and illustrative data live in `content.ts`. The component map and editing instructions are in `web/src/components/home/README.md`.

The design keeps forest black, Inter, chalk white, and the existing lime brand. It combines a photographic studio background, a functional example phone, custom SVG movement studies, an interactive weekly schedule, the 3D equipment studio, native FAQs, and a lime/photo closing section. Animation definitions live in `globals.css`; the homepage has no embedded style block or inline CSS.

## New background artwork

- Final asset: `web/public/art/training-studio.webp`
- Mode: built-in ImageGen.
- Usage: responsive homepage hero background, with dark scrims for readable text.
- The generated PNG was encoded as WebP for delivery.
- Existing original athlete and preparation artwork are reused elsewhere on the page.

### Final prompt

Use case: photorealistic-natural. Asset type: premium fitness website atmospheric hero background. Create a sophisticated wide 16:9 editorial architecture photograph of an empty boutique strength-training studio in deep forest black and charcoal, sculptural concrete walls and textured dark rubber flooring. A long low rack with a few neatly arranged matte black dumbbells occupies only the far right third. A single muted electric lime (#c5f460) resistance band rests naturally on a small concrete block near the lower right. Tall narrow windows out of frame on the upper right cast crisp slanted shafts of pale daylight and long shadows across the floor toward the lower center. The left two thirds and upper middle must be quiet, dark negative space for large website headings and a phone UI that will be added in code. No people, no screens, no typography or text, no logos, no watermark. Emphasize exceptional tactile detail, understated photographic grain, real materials, a calm early-morning atmosphere, and intentional high-end sports campaign art direction. Avoid gym clutter, neon strips, luminous lime fog, artificial glowing effects, overdone gradients, decorative plants, or excessive equipment. Overall very dark and low-key yet visibly photographic, harmonizing with #0b0e0b; the floor light and subtle equipment edges provide depth.
