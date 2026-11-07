# FitSync billing

FitSync uses native App Store / Google Play purchases through RevenueCat. The mobile SDK displays store-supplied products/prices and completes purchases or restores. The Express server independently verifies the signed-in user's RevenueCat entitlement before allowing Pro coaching operations. A device flag, request body, receipt-shaped object or webhook product claim cannot grant Pro.

## Setup

1. Apply `server/sql/013_billing.sql` to the intended Supabase project after migration 001. The migration creates service-role-only entitlement snapshots, completed webhook IDs and an atomic snapshot function. It does not grant anyone Pro. Never put the service role key in Expo.
2. Configure the real app/bundle identifiers and store credentials in RevenueCat, connect App Store server notifications and Google Play real-time developer notifications, and create the products in the appropriate store consoles. Associate the products with the `pro` entitlement and a current offering. Configure renewal periods, regional prices, trial eligibility and subscription disclosures in the store consoles. The application must display the SDK's localized values rather than hard-coded offers.
3. Set server `REVENUECAT_SECRET_API_KEY` to the RevenueCat secret API key and `REVENUECAT_ENTITLEMENT_ID` to the matching entitlement identifier (default `pro`). These are optional for ordinary local/free use. The API starts without them; Pro mutations remain unavailable.
4. Set `REVENUECAT_WEBHOOK_AUTHORIZATION` to a long random value (at least 32 characters). Configure that **exact full Authorization header value** in RevenueCat's webhook integration. POST notifications to `https://YOUR_API/api/billing/webhook`, with all subscription lifecycle and transfer events enabled. The handler uses a constant-time comparison of fixed-length header digests. It does not authenticate the webhook using a user JWT. This integration uses RevenueCat's documented Authorization header method; it does not require HMAC signing or a raw-body parser.
5. Configure the platform-specific **public** SDK keys in the mobile app. The server secret API key must never be an `EXPO_PUBLIC_*` value. Sign into RevenueCat using the authenticated FitSync UUID as `appUserID` before purchase/restore, call the server sync after purchase/restore/login, and clear account-bound UI state on sign-out/account switching. RevenueCat restore/transfer behavior is a project setting; choose and test the intended account-ownership policy.
6. Keep `REVENUECAT_ALLOW_SANDBOX=false` on the production backend. Enable it only on an isolated test backend with test users. The customer API can return both production and sandbox transactions. Sandbox metadata comes from the canonical purchase, never from a client or webhook environment claim.

## API and access behavior

`GET /api/billing/status` and `POST /api/billing/sync` require the existing FitSync access token. The account comes exclusively from its verified session. Sync accepts an empty object (`{}`), not a user ID, premium flag, receipt, expiry or product. Both responses have this shape:

```json
{
  "entitlement": {
    "tier": "free",
    "active": false,
    "expiresAt": null,
    "willRenew": false,
    "managementUrl": null,
    "source": "none",
    "sandbox": false
  },
  "configured": false
}
```

`configured:false` means the server lacks its provider secret. With configured billing, `source` is `revenuecat` even for a verified free account. Status and sync responses are not cacheable. Provider, malformed-response and storage failures return HTTP 503; they never silently report a paying user as free or grant access from stale state. Clients should retain the last display with an explicit verification error, disable new purchases if configuration is missing, and allow retry/restore.

`billing.service.ts` exports `getEntitlement(userId)`. `billing.middleware.ts` exports `requirePro`, mounted after `requireAuth` on paid server actions. It verifies canonical status, returns 402 for a verified free account, and returns 503 when billing is unconfigured/unavailable. A mobile paywall alone is not an authorization boundary. Free tracking, account access, restored purchase discovery and subscription management must stay usable without Pro.

Every status/sync/guard call fetches RevenueCat's canonical `GET /v1/subscribers/{app_user_id}` using the server secret. There is no cached-entitlement fallback for authorization; this deliberately prefers correctness for refunds/transfers over permitting Pro work during a provider outage. It has an eight-second request timeout and status/sync rate limiting. At scale, introduce a bounded fresh cache and durable webhook worker with an explicit revocation policy before reducing verification calls.

## Lifecycle and delivery

The canonical entitlement and its expiration/grace expiration determine access. Cancellation disables renewal but retains paid access until expiration; billing grace can retain access through its grace deadline. A refund webhook triggers a canonical re-read: some store refunds preserve access, so the event name or `refunded_at` alone does not revoke it. Renewals, restorations, uncancellations, extensions and reversed refunds use the same reconciliation. Lifetime access requires an explicitly null expiry and purchase environment metadata. Production rejects sandbox entitlements.

The webhook handler checks authorization before parsing the event, tolerates additional provider fields/new event types, filters identities to existing FitSync UUIDs, and reconciles both sides of transfers plus known aliases/redemptions. Anonymous identifiers do not create FitSync accounts. Completed event IDs are durable and idempotent. Partial failures return an error without recording completion, allowing RevenueCat's retry to finish the work. Duplicate simultaneous deliveries can repeat a read, but no event directly grants access and atomic canonical snapshots keep the latest provider request timestamp. Older, delayed responses cannot overwrite newer snapshots. An equal timestamp retains the existing snapshot. Dashboard TEST events test delivery/authentication only; they never grant entitlement.

Processing is synchronous and acknowledges only after persistence. Typical purchase events reconcile one account; transfers reconcile a few. If alias lists or traffic grow enough to approach RevenueCat's response deadline, move this work to a durable queue, acknowledging only after enqueue. Monitor failed webhook deliveries and use RevenueCat dashboard retries. If automatic retries are exhausted, the next status/sync/Pro action still reconciles canonical state.

## Verification

Run the focused command from `server`: `node --import tsx tests/billing.test.ts` (or `node --import tsx --test tests/billing.test.ts`). These tests use injected provider/repository implementations and never contact RevenueCat, charge a card, or access the production database. They cover expiry/cancellation/grace, sandbox isolation, lifetime validation, refunds, missing configuration, provider failure, authentication, duplicate/failed deliveries, aliases/transfers, reordered responses, identity ownership and server enforcement. `npm run build` checks integration types.

Before release, test migration execution and service-role restrictions against an isolated Supabase database, then use real RevenueCat/store sandbox configuration in an Expo development build or store test distribution. Expo Go and synthetic TEST webhooks cannot validate native purchases. Required device checks: localized offering prices; trial disclosure and eligibility; purchase success/cancellation/pending/error; restore on another installation; logout/login and account switch; auto-renewal; cancellation preserving access; expiration; grace/recovery; refund/revocation; transfer/restore ownership; duplicate/reordered webhook delivery; provider/network failure; and return from the store's subscription-management page. Confirm the API denies Pro endpoints for free users even when client requests are edited. Repeat relevant checks for both stores. Real production purchase validation and store approval remain deployment work; local unit tests do not prove store configuration.

Official references checked November 7, 2026: [RevenueCat customer API](https://www.revenuecat.com/docs/api-v1/customers), [Customer Info model](https://www.revenuecat.com/docs/api-v1/customer-info-model), [webhook authentication/retry guidance](https://www.revenuecat.com/docs/integrations/webhooks), [event fields and cancellation semantics](https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields).
