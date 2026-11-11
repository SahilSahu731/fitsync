# FitSync navigation and footer

The public shell stays in `src/components/shell.tsx`, which also preserves the existing `Brand`, `Header`, and `Footer` exports. The signed-in workspace is unchanged.

| File              | Edit here for                                                                |
| ----------------- | ---------------------------------------------------------------------------- |
| `brand.tsx`       | Shared logo, wordmark, account avatar, and focus styling                     |
| `navigation.ts`   | Header labels, menu descriptions, footer groups, and published external URLs |
| `site-header.tsx` | Full-width header, floating scroll state, and mobile menu                    |
| `site-footer.tsx` | Footer layout, account actions, web/mobile overview, and copyright row       |

## Navbar behavior

The header starts full-width with a straight bottom edge. It becomes a compact, rounded glass bar after scrolling 72 pixels and returns to the normal state below 24 pixels. The two thresholds prevent flicker near the transition. Its space in the page remains fixed while the bar changes size.

The mobile menu closes on navigation, outside pointer presses, browser history changes, or Escape. Escape returns focus to its toggle. A closed menu is invisible and inert, so its links cannot intercept pointer or keyboard input. Layout transitions respect reduced motion.

## Published external links

Optional HTTPS URLs are listed in `web/.env.example`:

- `NEXT_PUBLIC_PRIVACY_URL`
- `NEXT_PUBLIC_TERMS_URL`
- `NEXT_PUBLIC_GOOGLE_PLAY_URL`
- `NEXT_PUBLIC_APP_STORE_URL`
- `NEXT_PUBLIC_INSTAGRAM_URL`
- `NEXT_PUBLIC_YOUTUBE_URL`

Empty or invalid URLs stay hidden. Until a store URL is supplied, the mobile section links to the working app preview. No app-store listing, social profile, support address, or legal document is invented. These public environment variables are read during the Next build; rebuild after changing them.

The footer uses the grouped product/resource/account structure of [Hevy's footer](https://www.hevyapp.com/) as a reference, with FitSync's own copy, routes, branding, and capabilities.
