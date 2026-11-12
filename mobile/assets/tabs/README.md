# Tab artwork

Edit or replace these SVG files to change the navigation artwork directly:

| File | Tab |
| --- | --- |
| `home.svg` | Home |
| `train.svg` | Train |
| `library.svg` | Library |
| `progress.svg` | Progress |
| `profile.svg` | Me fallback |

Keep the filenames and a square `viewBox` (currently `0 0 24 24`). You can edit the paths in a text editor or open the files in a vector editor. Use SVG elements and presentation attributes rather than embedded CSS or external images.

Use `stroke="currentColor"` and `fill="currentColor"` for monochrome shapes, and `fill="none"` for outlines. The app tints the same SVG white on inactive tabs and black on the active white pill. Shape fills and stroke thickness come directly from the SVG file.

Inactive tabs show white outline SVGs; only the selected tab has a black icon on a light pill. The Me tab shows the signed-in user’s profile photo in its original colors, using `profile.svg` if no photo is available or loading fails. The active pill uses its measured label width with equal padding on both sides, and the label stays to the right of the icon. Scrolling down contracts the bar into an icon-only capsule. It stays compact while idle and expands when scrolling up or changing tabs; there is no automatic expansion timer.

SVG files use Expo's standard asset pipeline and native image cache, without a custom Metro transformer, JavaScript file fetching, or an asset generation step. A built-in vector fallback in `src/components/tab-artwork.tsx` keeps every tab visible while its asset loads or if decoding fails. Later SVG edits reload normally.
