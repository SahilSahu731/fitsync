# Deployment

## Free Render staging for the API

1. Prepare a staging Supabase project. On a fresh database, apply the numbered migrations
   in order. On an existing database, apply only missing changes. Run the repository's
   verifier and resolve any rows it reports, including missing service-role grants.
   [Database setup](../server/sql/README.md) · [Grant instructions](../config.md#data)
2. Push the branch containing `render.staging.yaml` to the Git provider connected to Render.
   In **Render Dashboard → New → Blueprint**, select the repository and branch, then set
   **Blueprint Path** to `render.staging.yaml`. The preview should show one Docker web
   service named **fitsync-api-staging** on **Free**. The default `render.yaml` provisions
   paid services. [Staging Blueprint](../render.staging.yaml) · [Render setup](https://render.com/docs/infrastructure-as-code)
3. Enter the staging Supabase URL and service-role key, Google Web client ID, and Cloudinary
   cloud name, API key and secret. Generate the staging JWT signing secret with
   `openssl rand -hex 32`. Render generates the web proxy secret. Choose **Deploy Blueprint**.
   [Backend environment variables](backend-environment.md)
4. To see API timings in PostHog, open **fitsync-api-staging → Environment** and add
   `POSTHOG_PROJECT_TOKEN` and the project's ingestion origin in `POSTHOG_HOST`
   (`https://us.i.posthog.com` or `https://eu.i.posthog.com`). The Blueprint sets
   `POSTHOG_ENVIRONMENT=staging`. With the token configured, the default
   `POSTHOG_TRACE_SAMPLE_RATE=0.01` samples about one in 100 requests. For a short
   smoke test, set the rate to `1`, save and deploy the settings, then restore `0.01`
   after verification. [PostHog tracing](https://posthog.com/docs/distributed-tracing)
5. Open the service's HTTPS URL with `/health` appended and confirm a 200 response.
   Point your test app's `EXPO_PUBLIC_API_URL` at that HTTPS origin, sign in with a
   staging account and open workout history. With tracing configured, check
   **PostHog → Tracing** for the API request. A free instance can take about a minute
   to wake up after 15 minutes of inactivity. Scheduled reminders require a separate
   worker. Monitor free instance hours, outbound bandwidth and build minutes under
   **Render Dashboard → Billing**. [Free instance limits](https://render.com/docs/free)

## Paid Render deployment

Import the repository's [`render.yaml`](../render.yaml) as a Render Blueprint. It
defines a Docker API service, a Docker Next.js service and a five-minute cron job
running `npm run programs:reminders:prod`. The reminder CLI is compiled with the
server and runs without `tsx` or other development dependencies in the image.
These are paid resources. Automatic deployments are disabled initially.

1. Use an isolated staging Supabase project and provider configuration first.
   Apply and verify required migrations using [the SQL guide](../server/sql/README.md).
   The Blueprint does not create or migrate Supabase.
2. Supply the API values from `server/.env.example`. Use a random JWT secret of
   at least 48 characters (for example, `openssl rand -hex 32`). Render generates
   `WEB_PROXY_SECRET` and shares it with Next.js. Configure optional billing,
   push and Sentry values, or leave them empty while the features are disabled.
   The cron inherits its required credentials from the API service.
3. Set web `API_BASE_URL` to the API's HTTPS origin, without `/api`. Set `WEB_ORIGIN`
   to the exact public HTTPS web origin. Add that web origin to the Google Web
   OAuth client's authorized JavaScript origins. The Google client ID must match
   on web, mobile and API.
4. Set the web operator name and support email. Public `NEXT_PUBLIC_*` variables
   and legal contact values are build-time settings; rebuild the web image after
   changing them. Render exposes service variables as Docker build arguments;
   the Dockerfile declares only public values. Secrets are runtime variables.
5. Deploy API, then web, then the cron. Keep production
   `REVENUECAT_ALLOW_SANDBOX=false`; sandbox testing needs an isolated backend.
   Configure the RevenueCat webhook to the API billing webhook route and use the
   exact server-side authorization value described in [billing.md](billing.md).
6. Set mobile `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_WEB_URL` to the deployed HTTPS
   origins. `/privacy` and `/terms` derive from the web origin; explicit
   `EXPO_PUBLIC_PRIVACY_URL` and `EXPO_PUBLIC_TERMS_URL` override them. Use the
   same privacy URL in the store listing and Health Connect declarations, and
   publish `/delete-account` as the external account deletion resource. The CNG
   privacy plugin generates a native policy activity for Health Connect rationale
   and Android 14+ permission-usage intents; it opens the policy without sign-in or
   JavaScript. Non-development EAS builds reject missing or insecure API/legal URLs.
7. Build with `npx eas-cli@latest build --platform android --profile production`
   from `mobile/`. Preview and store-test profiles also disallow cleartext.
   Verify Google sign-in, checkout/restore, health permissions and actual push
   delivery on physical devices before production release.

## Docker and other hosts

Build contexts are the individual application directories:

```sh
docker build -t fitsync-api ./server
docker build --build-arg NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client.apps.googleusercontent.com -t fitsync-web ./web
docker run --rm --env-file server/.env -e NODE_ENV=production -p 4000:4000 fitsync-api
docker run --rm --env-file web/.env.local -e NODE_ENV=production -p 3000:3000 fitsync-web
docker run --rm --env-file server/.env -e NODE_ENV=production fitsync-api npm run programs:reminders:prod
```

Images run as a non-root user. The API image includes production dependencies,
compiled source and public exercise assets. The web uses Next.js standalone output,
including `public` and `.next/static`. Image build contexts exclude local `.env`
files, installed dependencies and previous outputs. Run containers behind HTTPS
ingress; do not expose their application ports directly on the public internet.

The API explicitly uses `app.set("trust proxy", 1)`. Your trusted ingress must
overwrite or correctly append forwarding headers. This assumes exactly one trusted
hop; review the setting if you add another CDN/proxy or allow a shorter path.
The Next.js BFF forwards the ingress-selected client IP under `WEB_PROXY_SECRET`.
Only a matching server secret lets that header affect authentication rate limits.
Keep that secret identical on web and API, and never expose it as `NEXT_PUBLIC_*`.
Production API/job configuration rejects a missing secret, and web API forwarding
fails closed if it is absent. The cron inherits it alongside the shared API configuration.
The production API uses the shared PostgreSQL rate limiter installed by migration
`021`. Verify a normal API request after deployment to exercise it.

If using Railway, Fly or another scheduler, run the compiled reminder command
every five minutes with the API environment and one active invocation. Do not
expose it as a public HTTP endpoint. Delivery is approximate; users' reminder
timezones are applied in the existing queue logic, while the cron schedule is UTC.

## Health and monitoring

`GET /health` sends a bounded, read-only HEAD request through Supabase to the
`app_users` table. Success returns 200 with `database: "up"`; database, schema,
credentials or network failures return 503 within the three-second query timeout.
Responses are not cached and contain no database errors or account data. Render
and the API Docker health check use this route. Web health checks use `/privacy`
so legal documents remain reachable independently of API outages.

Set `SENTRY_DSN` on API and cron to enable error reporting; set `SENTRY_RELEASE` to
the deployed commit SHA. The reporter sends fixed failure categories, error type,
code file basenames and line/column numbers via Sentry's documented envelope
protocol. It excludes request bodies, headers, cookies, user identity, error message
text, breadcrumbs and health values, caps delivery at ten events per minute per
process, and uses a two-second delivery timeout. Delivery failures never replace
the API response. Generic JSON errors also go to stderr; fatal exceptions exit
after draining requests and flushing monitoring. Normal SIGTERM drains for up to
25 seconds. This is API/job error reporting; it does not collect mobile or browser
session replay or performance traces.

Configure Sentry issue alerts, a platform uptime alert for `/health`, and failed
cron-run alerts. Trigger one controlled staging failure and confirm receipt before
release. Monitor the reminder pending-job age and delivery receipts using the
queries in [program-following.md](program-following.md); a successful process exit
does not guarantee notification delivery. Use Supabase backup/restore facilities
and document provider retention settings with the operator.

## Acceptance and rollback

- Confirm `/privacy`, `/terms`, `/delete-account`, login and registration work
  without a session, with the correct operator/contact and Google OAuth origin.
- Confirm `/health` returns 200 with the intended database, and use staging to
  check that an unavailable database returns 503.
- Check two clients can sign in independently after one hits its auth limit.
- Verify the cron run, configured Expo push credentials and real device delivery;
  reminders require the existing Pro entitlement and user/device consent checks.
- Verify account deletion and private photo removal with a staging account. Cancel
  any test subscription separately; account deletion does not cancel store billing.
- Retain the last known good image/deployment and roll back API, web and mobile
  compatibility together. Database rollback requires a reviewed migration or
  restore procedure; redeploying an older image does not undo migrations.

Implementation references: [Render Blueprint fields](https://render.com/docs/blueprint-spec),
[cron jobs](https://render.com/docs/cronjobs),
[Express proxy trust](https://expressjs.com/en/guide/behind-proxies/),
[Sentry envelopes](https://develop.sentry.dev/sdk/foundations/envelopes/),
[Google Play user data](https://support.google.com/googleplay/android-developer/answer/10144311).
