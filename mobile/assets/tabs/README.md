# Tab artwork

These SVG files are the editable design references for the navigation artwork:

| File | Tab |
| --- | --- |
| `home.svg` | Home |
| `train.svg` | Train |
| `progress.svg` | Progress |
| `library.svg` | Library |
| `pro.svg` | Pro |

Keep the filenames and a square `viewBox` (currently `0 0 24 24`). You can edit the paths in a text editor or open the files in a vector editor. Update the matching native SVG elements in `src/components/tab-artwork.tsx` with the same geometry. Pixel tests compare the rendered components with these files to catch differences.

Use `stroke="currentColor"` and `fill="none"` in these outline references. The native component uses the tab's idle color (`#E8E4E3`) or active color (`#000000`). All five icons use 1.5-unit rounded strokes.

The tab order is Home, Train, Progress, Library, Pro. The Stats screen has been merged into Progress; old `/stats` links redirect there. Inactive tabs show light outline SVGs; only the selected tab has a black icon on a light pill. Profile is accessed from Home and has no tab button. The active pill uses its measured label width with equal padding on both sides, and the label stays to the right of the icon. Scrolling down contracts the bar into an icon-only capsule. It stays compact while idle and expands when scrolling up or changing tabs; there is no automatic expansion timer.

`src/components/tab-artwork.tsx` renders `Svg`, `Path`, `Rect`, and `G` elements directly with `react-native-svg`. It does not import `.svg` assets, parse XML, or depend on a custom transformer, image tinting, or image caches. Native component edits work with Fast Refresh. The old transformer file only delegates to Expo for compatibility with Metro sessions that have its path cached.
