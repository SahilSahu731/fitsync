# FitSync backend environment

For a free staging API, select `render.staging.yaml` in **Render → New → Blueprint**.
It creates one Docker web service. The root `render.yaml` provisions paid services.
The API reads these variables at runtime. For local development, use `server/.env`.
For later changes on Render, open the API service's **Environment** page.
[Staging walkthrough](deployment.md#free-render-staging-for-the-api) · [Example environment file](../server/.env.example)

## Seven values to supply for staging

| Variable | Where to get the value |
| --- | --- |
| `SUPABASE_URL` | Copy the HTTPS Project URL from the staging Supabase project's Connect dialog. |
| `SUPABASE_SERVICE_ROLE_KEY` | In the same project's API Keys settings, copy a server secret key or the legacy `service_role` key. Keep it on the API server. [Supabase keys](https://supabase.com/docs/guides/api/api-keys) |
| `GOOGLE_WEB_CLIENT_ID` | In Google Cloud, open Google Auth Platform → Clients and copy your **Web application** OAuth client ID, ending in `.apps.googleusercontent.com`. The mobile sign-in client must request tokens for the same ID. |
| `JWT_SECRET` | Run `openssl rand -hex 32` locally and save the generated value in Render. Keep it stable between deploys. FitSync requires at least 48 characters. |
| `CLOUDINARY_CLOUD_NAME` | Copy the cloud name of the staging Cloudinary product environment. |
| `CLOUDINARY_API_KEY` | Copy an API key for that Cloudinary environment. |
| `CLOUDINARY_API_SECRET` | Copy the secret for the same key. All three Cloudinary values are required at startup. |

The staging Blueprint sets `NODE_ENV=production` for production-mode middleware and
generates `WEB_PROXY_SECRET`. A manual production-mode deployment must supply that
secret (at least 32 characters). If you add the Next.js web service, give its server
the same proxy secret. `PORT` comes from the hosting environment and defaults to
`4000` locally. HTTPS terminates at Render. The Docker build requires no application secrets.

## Optional integrations

| Purpose | Variables and defaults |
| --- | --- |
| API performance in PostHog | `POSTHOG_PROJECT_TOKEN` enables tracing. Use the project token beginning with `phc_`. `POSTHOG_HOST` defaults to `https://us.i.posthog.com`. EU projects use `https://eu.i.posthog.com`. `POSTHOG_TRACE_SAMPLE_RATE` defaults to `0.01` (about 1% of supported API requests). Use `0` to switch it off. `POSTHOG_ENVIRONMENT` defaults to `NODE_ENV` and accepts `development`, `test`, `staging` or `production`. The staging Blueprint sets `staging`. |
| Sentry errors | `SENTRY_DSN` is the HTTPS DSN for the API project. If set, `SENTRY_RELEASE` can identify the deployed commit. Both are optional. |
| RevenueCat subscriptions | `REVENUECAT_SECRET_API_KEY` is the server secret. `REVENUECAT_ENTITLEMENT_ID` defaults to `pro`. Set `REVENUECAT_WEBHOOK_AUTHORIZATION` to the exact Authorization header configured for `POST /api/billing/webhook` (at least 32 characters). `REVENUECAT_ALLOW_SANDBOX` defaults to `false`. Enable it only for an isolated sandbox billing test. [Billing guide](billing.md) |
| Expo push delivery | A separately scheduled reminder worker uses `EXPO_ACCESS_TOKEN` when Expo push security is enabled. The free API-only Blueprint runs no reminder worker. |

The running API connects through Supabase's HTTPS API. A database password or
`DATABASE_URL` is used separately for database administration. The API also has
no use for a Google OAuth client secret, an Expo public client variable or a Sentry
source-map upload token. `SEED_ADMIN_USER_ID` and `FITSYNC_TEST_PUSH_TOKEN` belong
to manual seed and push-test scripts.

## Test PostHog from localhost

1. In PostHog, open the staging project's settings and copy its project token.
   In `server/.env`, set `POSTHOG_PROJECT_TOKEN`, the matching `POSTHOG_HOST`, and
   `POSTHOG_TRACE_SAMPLE_RATE=1` for this short test. Use `NODE_ENV=development`.
2. From `server/`, run `npm run dev` (restart it after changing the file).
   From another terminal run the following request. An empty sign-in payload
   returns HTTP 400 and exercises a real route without signing anyone in.

   ```sh
   curl -i -X POST http://localhost:4000/api/auth/google -H 'Content-Type: application/json' -d '{}'
   ```

3. Open **PostHog → Tracing** and filter by service `fitsync-api`. After the batch
   arrives, look for the sign-in route, HTTP status and duration. The response's
   `X-Request-ID` remains available for reporting an error. Health probes produce
   no traces. Routine request output can be restored by uncommenting the
   `console.log` line in `server/src/middleware/request-log.ts`. [PostHog Node.js tracing](https://posthog.com/docs/distributed-tracing/installation/nodejs)
4. Restore `POSTHOG_TRACE_SAMPLE_RATE=0.01` and restart. For mobile analytics in
   the same project, use its token and host in the mobile app's
   `EXPO_PUBLIC_POSTHOG_KEY` and `EXPO_PUBLIC_POSTHOG_HOST`. For a local
   development build, set `EXPO_PUBLIC_TELEMETRY_DEBUG=true`, restart Expo, then
   tap **Settings → Help improve FitSync → Send test analytics & error** with
   anonymous usage analytics enabled. Look for `telemetry_test` under **PostHog →
   Activity**. [Mobile setup](observability-setup.md)

## Verify the database before deployment

Apply migrations `001` through `022` in order on a new staging Supabase project.
For an existing project, check its schema and apply only the missing migrations.
Run `server/sql/verify-migrations.sql` as the database owner and resolve any rows
it returns, including missing grants. After deployment, check `GET /health`,
Google sign-in and an authenticated request such as `GET /api/workouts/history`.
The health check reads `app_users`. Normal production API requests also exercise
the database rate limiter introduced in migration `021`. [SQL guide](../server/sql/README.md) · [Grants](../config.md#data)
