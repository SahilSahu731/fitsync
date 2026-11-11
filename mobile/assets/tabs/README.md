# Tab artwork

Edit or replace these SVG files to change the navigation artwork directly:

| File | Tab |
| --- | --- |
| `home.svg` | Home |
| `train.svg` | Train |
| `library.svg` | Library |
| `progress.svg` | Progress |
| `profile.svg` | Me fallback when no profile photo is available |

Keep the filenames and a square `viewBox` (currently `0 0 24 24`). You can edit the paths in a text editor or open the files in a vector editor. Use SVG elements and presentation attributes rather than embedded CSS or external images.

Use `stroke="currentColor"` to follow the tab's animated color. Shapes with `fill="none"` stay outlines. Shapes that inherit the root fill are filled when selected; `fill-opacity="0.13"` gives the subtle selected shading. The app controls the rendered size and selected stroke thickness in `src/components/tab-artwork.tsx`.

The Me tab displays the signed-in user's `avatarUrl` above its SVG, falling back to the artwork while loading, when no photo is set, or if loading fails. It updates when the session's photo URL changes.

SVG files are imported directly through Metro, so no asset generation step is needed. After this setup change, restart Metro once from `mobile` with `npm run start:clean`. Later SVG edits reload normally.
