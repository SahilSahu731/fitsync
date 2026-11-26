# FitSync navigation and footer

`src/components/shell.tsx` composes the public shell and the signed-in workspace. Both use the shared monochrome theme in `src/app/globals.css`.

- `brand.tsx`: logo, wordmark, avatar and focus styling.
- `navigation.ts`: navigation labels, footer groups and validated published HTTPS destinations.
- `site-header.tsx`: full-width header, compact floating state after scrolling, and mobile menu.
- `site-footer.tsx`: product, account and resource links with a quiet wordmark.

The mobile menu is closed and inert until opened. It closes on a route change, outside press or Escape. Escape returns focus to the menu button. Scroll and menu transitions honor reduced motion. Decorative menu numbering and outlines have been removed.

Member navigation leads to an account home with the web workspace launch notice. Members can access their fitness profile and account settings, including deletion. Administrators can open the admin panel from the same header and footer.

The mobile download dialog uses the destination saved in the admin panel for both the Google Play button and the QR code. Social destinations use the environment settings in `web/.env.example`. The policy pages have permanent public routes.
