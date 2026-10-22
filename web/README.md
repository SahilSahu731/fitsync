# FitSync web client

Next.js web client using the white/blue layout, Figtree typography, landing-page structure, exercise cards, sign-in artwork, and admin sidebar from the supplied `src.zip`. It uses the existing Express/Supabase API and the same Google identity as mobile.

## Run locally

1. Install dependencies with `npm ci` in `server/` and `web/` if needed.
2. Keep the existing `server/.env` configuration (Supabase, Google Web client ID, JWT secret, and Cloudinary credentials).
3. Apply `server/sql/005_cloudinary_exercise_images.sql` in the Supabase SQL editor **after** migrations 001–004. This permits Cloudinary image records while preserving legacy Supabase images. This migration has been prepared but is not automatically applied to your database.
4. Copy `web/.env.example` to `web/.env.local` and set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to the server's `GOOGLE_WEB_CLIENT_ID`. The local file has already been populated from the existing public client ID in this checkout; no service credentials are copied to the web client.
5. Add your frontend origins to the Google Web OAuth client's **Authorized JavaScript origins**: `http://localhost:3000`, and `http://127.0.0.1:3000` if you use that address. Add your HTTPS frontend origin for production. See [Google's setup guide](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).
6. Run `npm run dev` in `server/`, and `npm run dev` in `web/`. Open `http://localhost:3000`.

`API_BASE_URL` is the API origin without `/api` (default `http://localhost:4000`). `WEB_ORIGIN` is the exact browser-facing origin when behind a reverse proxy. Cloudinary and Supabase service credentials stay on the Express server.

For production, run `npm run build` then `npm start`. The production web origin must use HTTPS because session cookies are Secure in production. Configure the API URL and frontend origin in the hosting environment. The web client requires a Next.js server; it is not a static export.

## Administration

Sign in once with the intended Google account. An existing database administrator can assign that account the `admin` role. The browser cannot self-assign this role. Review the email before running this in the Supabase SQL editor:

```sql
update public.app_users
set role = 'admin'
where email = 'your-admin-email@example.com';
```

Open `/admin` for totals, or `/admin/exercises` to search, filter, edit, and delete exercises. Only admins can create, update, publish, archive, upload, or remove exercise content; Express checks the database role on each mutation.

- Save drafts without media.
- Upload JPEG/PNG/WebP images and optional GIF/MP4 demonstrations. Each original upload is limited to 25 MB. Images are validated and optimized to WebP, with a 3 MB processed-image limit; animated GIF frames are retained. Use MP4 for larger animations.
- All **new exercise media** uploads go to Cloudinary. Existing Supabase images still display and can be deleted. Profile avatars keep their existing storage behavior.
- Provide usage rights for each upload; description, credit, and source URL are also supported.
- Publish with an image alone. Animation is not required and can be added later.
- Remove individual media, keeping at least one demonstration on a published exercise. Save as a draft first to remove the last one.
- Archive to hide an exercise reversibly. Permanent deletion removes its media and database record after confirmation.
- Upload failures preserve the saved draft/record. Retry failed uploads from the same editor without creating another exercise.

Mobile exercise creation/editing screens, buttons, and upload/mutation helpers have been removed. Mobile remains a reader of the shared published library.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing page |
| `/features`, `/programs` | Feature overview and training guide |
| `/login`, `/register` | Google Identity Services sign-in/sign-up |
| `/exercises`, `/exercises/[id-or-slug]` | Authenticated exercise library and demonstrations |
| `/user/home`, `/user/profile`, `/user/settings` | Account overview, shared fitness profile, preferences |
| `/admin` | Admin overview with live catalog totals |
| `/admin/exercises` | Searchable, paginated admin catalog |
| `/admin/exercises/new`, `/admin/exercises/[id]/edit` | Exercise and media editor |

## API and session behavior

The browser talks to same-origin Next.js route handlers. Access and refresh tokens are stored in HttpOnly, SameSite=Lax cookies, with Secure enabled in production. Tokens are not exposed in browser JSON or localStorage. Refresh is coordinated between requests and tabs. Mutations require a matching origin, and the proxy only forwards exercise and account paths to the configured API.

The existing Express endpoints remain compatible with the mobile reader:

| Endpoint | Access |
| --- | --- |
| `POST /api/auth/google` | Google ID token verification |
| `GET /api/exercises`, `GET /api/exercises/:id` | Authenticated; published catalog for non-admins |
| `GET /api/exercises/taxonomies` | Authenticated |
| `GET /api/exercises/permissions` | Authenticated; returns `canManageExercises` |
| `POST /api/exercises` | Admin; create draft |
| `PATCH /api/exercises/:id` | Admin; edit, publish, unpublish, archive |
| `DELETE /api/exercises/:id` | Admin; permanently remove exercise and media |
| `POST /api/exercises/:id/media` | Admin; multipart `media`, `license`, optional `altText`, `credit`, `sourceUrl` |
| `DELETE /api/exercises/:id/media/:mediaId` | Admin; remove individual media |

List parameters: `q`, `category`, `activityType`, `bodyRegion`, `muscle`, `equipment`, `difficulty`, `page`, `pageSize`. Admins can use `includeDrafts=true` and `status=draft|published|archived`. All classifications are loaded from the database, using the same fields as mobile.

See [Cloudinary's Node upload documentation](https://cloudinary.com/documentation/node_image_and_video_upload) for the provider integration.

## Validation

- Web: `npm run build`
- Server: `npm run build && npm test`
- Mobile: `npm run typecheck && npm run lint`

Server tests cover exercise validation, missing authentication, database admin-role checks, Cloudinary image delivery, preserving animated frames, rejecting invalid media, correct Cloudinary deletion resource types, and legacy image cleanup. Local HTTP checks cover rendered routes, missing sessions, malformed Google credentials, and cross-origin request rejection.

Live Google OAuth, database writes, and real Cloudinary uploads still require the migration and authorized-origin setup. They were not exercised against production data. No browser surface was available in the agent session for visual/responsive QA.
