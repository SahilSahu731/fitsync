# FitSync

FitSync combines workout logging, training programs, progress and optional health
imports in an Expo Android app, with a Next.js website and Express API.

| Directory | Purpose                                                                |
| --------- | ---------------------------------------------------------------------- |
| `mobile/` | Expo SDK 57 app, native integrations and store billing                 |
| `web/`    | Next.js website, public legal pages, account tools and admin workspace |
| `server/` | Express API, Supabase access, billing verification and reminder worker |
| `docs/`   | Feature behavior and operational guides                                |

## Local development

Use Node.js 22. Each application has its own npm lockfile; run `npm ci` in each
directory. Copy `server/.env.example` to `server/.env`, `web/.env.example` to
`web/.env.local`, and `mobile/.env.example` to `mobile/.env` and fill in your values.
Keep Supabase service-role, Cloudinary, JWT, RevenueCat secret keys, Expo access
tokens and `WEB_PROXY_SECRET` on servers only.

1. Prepare a Supabase project using [the migration guide](server/sql/README.md).
   Apply numbered migrations in order on a fresh database; inspect existing
   environments before applying anything. Migrations are never applied on startup.
2. In `server/`, run `npm run dev` (port 4000).
3. In `web/`, run `npm run dev` (port 3000). Configure the Google OAuth client's
   authorized JavaScript origins for the exact web origin.
4. In `mobile/`, use `npm run build:android:dev` for a native development build.
   Start Metro with `EAS_BUILD_PROFILE=development npm run start:clean`.
   Set the mobile API URL to your reachable LAN address during development.

Android cleartext traffic is enabled only when `EAS_BUILD_PROFILE=development`.
All other profiles, including an unspecified profile, disable it. Changes to native
configuration require rebuilding the app. Health, billing and other native modules
require a development or release build; Expo Go does not validate those integrations.

## Checks

```sh
npm --prefix server run build
npm --prefix server test
npm --prefix server run test:sql
npm --prefix server run db:generate -- --check
npm --prefix web test
npm --prefix web run lint
npm --prefix web run build
npm --prefix mobile run typecheck
npm --prefix mobile run lint
npm --prefix mobile test
```

[GitHub Actions](.github/workflows/ci.yml) runs these checks and builds both Docker
images on pushes and pull requests, without production credentials. SQL integration
tests run in fresh in-memory PostgreSQL databases and reject live connection settings.
Do not source server `.env` files or point manual SQL bootstraps at production.

## Deployment

See [deployment.md](docs/deployment.md) for the Render Blueprint, Docker commands,
environment variables, reminder scheduling, monitoring, rollout and rollback.
The checked-in configuration prepares deployments; it does not create cloud
resources, run migrations, publish the website or submit a store build by itself.

The public pages are `/privacy`, `/terms`, and `/delete-account`. They include the
support contact `sahillsahudev@gmail.com`. Set `LEGAL_OPERATOR_NAME` to the public
operator name shown on your store listing and `SUPPORT_EMAIL` if it changes.
Set `EXPO_PUBLIC_WEB_URL` to the published HTTPS website origin before building
mobile; privacy and terms links derive from it unless explicitly overridden.

More detail: [web setup](web/README.md), [mobile setup](mobile/README.md),
[billing](docs/billing.md), [health sync](docs/health-sync.md),
[program reminders](docs/program-following.md).

Analytics, error reporting, migration 021 and Android release configuration: [step-by-step setup guide](docs/observability-setup.md).

Personal Pro previews, Google Play seven-day trial configuration and funnel checks: [conversion setup guide](docs/pro-conversion-setup.md).
