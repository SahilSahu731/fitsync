# FitSync navigation and footer

`src/components/shell.tsx` composes the public shell and the signed-in workspace. Both use the shared monochrome theme in `src/app/globals.css`.

- `brand.tsx`: logo, wordmark, avatar and focus styling.
- `navigation.ts`: navigation labels, footer groups and validated published HTTPS destinations.
- `site-header.tsx`: full-width header, compact floating state after scrolling, and mobile menu.
- `site-footer.tsx`: product, account and resource links with a quiet wordmark.

The mobile menu is closed and inert until opened. It closes on a route change, outside press or Escape. Escape returns focus to the menu button. Scroll and menu transitions honor reduced motion. Decorative menu numbering and outlines have been removed.

App Store, Google Play, social and legal URLs use the existing `NEXT_PUBLIC_*` environment variables documented in `web/.env.example`. Unpublished destinations remain hidden. The mobile drawer explains availability when store links are missing. Rebuild after changing public environment variables.
