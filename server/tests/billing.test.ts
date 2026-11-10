import test from "node:test";
import assert from "node:assert/strict";
import type { Request, Response as ExpressResponse } from "express";
import { ApiError } from "../src/common/errors.js";
import { createBillingService } from "../src/modules/billing/billing.core.js";
import { createProGuard } from "../src/modules/billing/billing.guard.js";
import { affectedUserIds, freeEntitlement, normalizeSubscriber, validWebhookAuthorization, webhookSchema } from "../src/modules/billing/billing.policy.js";
import { fetchRevenueCatSubscriber } from "../src/modules/billing/billing.provider.js";
import type { BillingRepository, BillingSnapshot, Entitlement } from "../src/modules/billing/billing.types.js";

const A = "550e8400-e29b-41d4-a716-446655440000";
const B = "550e8400-e29b-41d4-a716-446655440001";
const NOW = Date.parse("2026-11-07T12:00:00Z");
const PAST = "2026-11-06T12:00:00Z";
const FUTURE = "2026-12-07T12:00:00Z";
const SECRET = "test-webhook-authorization-value-12345";

function customer(options: { active?: boolean; expires?: string | null; grace?: string | null; cancelled?: boolean; sandbox?: boolean; refunded?: boolean; timestamp?: number } = {}) {
  const expires = options.expires === undefined ? FUTURE : options.expires;
  return {
    request_date: new Date(options.timestamp ?? NOW).toISOString(), request_date_ms: options.timestamp ?? NOW,
    subscriber: {
      entitlements: options.active === false ? {} : { pro: { product_identifier: "monthly", expires_date: expires, grace_period_expires_date: options.grace ?? null, purchase_date: PAST } },
      subscriptions: { monthly: { expires_date: expires, is_sandbox: options.sandbox ?? false, unsubscribe_detected_at: options.cancelled ? PAST : null, billing_issues_detected_at: options.grace ? PAST : null, refunded_at: options.refunded ? PAST : null, store: "app_store" } },
      non_subscriptions: {}, management_url: "https://apps.apple.com/account/subscriptions"
    }
  };
}

function harness(fetcher: (id: string) => Promise<unknown>, configured = true) {
  const stored = new Map<string, BillingSnapshot>();
  const completed = new Set<string>();
  const calls: string[] = [];
  const repository: BillingRepository = {
    knownUserIds: async ids => ids.filter(id => id === A || id === B),
    storeSnapshot: async (id, snapshot) => {
      const previous = stored.get(id);
      if (!previous || snapshot.verifiedAtMs > previous.verifiedAtMs) stored.set(id, snapshot);
      return stored.get(id)!;
    },
    webhookProcessed: async id => completed.has(id),
    completeWebhook: async id => { completed.add(id); }
  };
  const service = createBillingService({
    config: { secretApiKey: configured ? "test-only-secret" : undefined, entitlementId: "pro", webhookAuthorization: SECRET, allowSandbox: false },
    repository,
    fetchSubscriber: async id => { calls.push(id); return fetcher(id); },
    now: () => NOW
  });
  return { service, stored, completed, calls };
}
const event = (id: string, type = "RENEWAL", extra: Record<string, unknown> = {}) => ({ event: { id, type, app_user_id: A, ...extra } });
const statusError = (status: number) => (error: unknown) => error instanceof ApiError && error.status === status;

test("verified renewal grants Pro; cancellation preserves access until expiry but disables renewal", () => {
  const paid = normalizeSubscriber(customer(), "pro", false, NOW).entitlement;
  assert.equal(paid.active, true); assert.equal(paid.willRenew, true); assert.equal(paid.source, "revenuecat");
  const cancelled = normalizeSubscriber(customer({ cancelled: true }), "pro", false, NOW).entitlement;
  assert.equal(cancelled.active, true); assert.equal(cancelled.willRenew, false);
  assert.equal(normalizeSubscriber(customer({ expires: PAST }), "pro", false, NOW).entitlement.active, false);
});

test("billing grace preserves access only through canonical grace expiration", () => {
  const grace = normalizeSubscriber(customer({ expires: PAST, grace: FUTURE }), "pro", false, NOW).entitlement;
  assert.equal(grace.active, true); assert.equal(grace.expiresAt, FUTURE.replace("Z", ".000Z")); assert.equal(grace.willRenew, false);
  assert.equal(normalizeSubscriber(customer({ expires: PAST, grace: PAST }), "pro", false, NOW).entitlement.active, false);
});

test("sandbox cannot unlock the production backend; isolated sandbox backend can verify it", () => {
  const body = customer({ sandbox: true });
  const blocked = normalizeSubscriber(body, "pro", false, NOW).entitlement;
  assert.equal(blocked.active, false); assert.equal(blocked.sandbox, true);
  assert.equal(normalizeSubscriber(body, "pro", true, NOW).entitlement.active, true);
});

test("explicit lifetime purchases work; missing expiry/environment is a provider error, not lifetime Pro", () => {
  const lifetime: any = customer({ expires: null });
  lifetime.subscriber.entitlements.pro.product_identifier = "lifetime";
  lifetime.subscriber.subscriptions = {};
  lifetime.subscriber.non_subscriptions = { lifetime: [{ purchase_date: PAST, is_sandbox: false }] };
  const entitlement = normalizeSubscriber(lifetime, "pro", false, NOW).entitlement;
  assert.equal(entitlement.active, true); assert.equal(entitlement.expiresAt, null); assert.equal(entitlement.willRenew, false);
  delete lifetime.subscriber.entitlements.pro.expires_date;
  assert.throws(() => normalizeSubscriber(lifetime, "pro", false, NOW), statusError(503));
  assert.throws(() => normalizeSubscriber({ ...customer(), subscriber: { ...customer().subscriber, subscriptions: {} } }, "pro", false, NOW), statusError(503));
});

test("refund decisions follow canonical entitlements instead of assuming a cancellation revokes immediately", async () => {
  assert.equal(normalizeSubscriber(customer({ refunded: true }), "pro", false, NOW).entitlement.active, true);
  const h = harness(async () => customer({ active: false }));
  await h.service.processWebhook(SECRET, event("refund", "CANCELLATION", { cancel_reason: "CUSTOMER_SUPPORT", expiration_at_ms: NOW + 999999 }));
  assert.equal(h.stored.get(A)?.entitlement.active, false);
});

test("missing configuration is explicit and never calls provider or storage", async () => {
  const h = harness(async () => { throw new Error("must not fetch"); }, false);
  assert.deepEqual(await h.service.getStatus(A), { entitlement: freeEntitlement(), configured: false });
  assert.equal(h.calls.length, 0); assert.equal(h.stored.size, 0);
  await assert.rejects(h.service.processWebhook(SECRET, event("test")), statusError(503));
});

test("provider failures propagate as unavailable instead of silently changing an existing subscription", async () => {
  let failing = false;
  const h = harness(async () => { if (failing) throw new ApiError(503, "Provider unavailable"); return customer(); });
  assert.equal((await h.service.getEntitlement(A)).active, true);
  failing = true;
  await assert.rejects(h.service.getStatus(A), statusError(503));
  assert.equal(h.stored.get(A)?.entitlement.active, true);
});

test("webhook authentication checks the full configured header and rejects forged entitlement payloads", async () => {
  assert.equal(validWebhookAuthorization(SECRET, SECRET), true);
  for (const invalid of [undefined, "", SECRET.slice(0, -1), `${SECRET}x`, "Bearer fake"]) assert.equal(validWebhookAuthorization(invalid, SECRET), false);
  const h = harness(async () => customer({ active: false }));
  await assert.rejects(h.service.processWebhook("fake", event("forged", "INITIAL_PURCHASE", { tier: "pro" })), statusError(401));
  assert.equal(h.calls.length, 0);
  await h.service.processWebhook(SECRET, event("authentic", "INITIAL_PURCHASE", { tier: "pro", expiration_at_ms: NOW + 999999 }));
  assert.equal(h.stored.get(A)?.entitlement.active, false);
});

test("completed webhook IDs are idempotent and unknown future types reconcile normally", async () => {
  const h = harness(async () => customer());
  await h.service.processWebhook(SECRET, event("once", "FUTURE_EVENT_TYPE"));
  assert.equal((await h.service.processWebhook(SECRET, event("once"))).duplicate, true);
  assert.deepEqual(h.calls, [A]);
});

test("failed reconciliation is never marked complete and succeeds on retry", async () => {
  let failed = true;
  const h = harness(async () => { if (failed) throw new ApiError(503, "retry"); return customer(); });
  await assert.rejects(h.service.processWebhook(SECRET, event("retry")), statusError(503));
  assert.equal(h.completed.has("retry"), false);
  failed = false;
  await h.service.processWebhook(SECRET, event("retry"));
  assert.equal(h.completed.has("retry"), true);
});

test("transfers reconcile both local accounts and ignore anonymous/unknown IDs", async () => {
  const h = harness(async id => customer({ active: id === B }));
  await h.service.processWebhook(SECRET, { event: { id: "transfer", type: "TRANSFER", transferred_from: [A, "$RCAnonymousID:abc"], transferred_to: [B], aliases: [A, B, "550e8400-e29b-41d4-a716-446655440099"] } });
  assert.equal(h.stored.get(A)?.entitlement.active, false); assert.equal(h.stored.get(B)?.entitlement.active, true);
  assert.deepEqual([...h.calls].sort(), [A, B]);
});

test("aliases/redemptions resolve local UUIDs without accepting arbitrary or duplicate IDs", () => {
  assert.deepEqual(affectedUserIds(webhookSchema.parse(event("aliases", "PURCHASE_REDEEMED", { aliases: [A, "$RCAnonymousID:a"], redeemed_from: [B], redeemed_by: [A] }))), [A, B]);
});

test("reordered events use canonical state, and late earlier responses cannot overwrite newer snapshots", async () => {
  let completeOld!: (value: unknown) => void;
  let requests = 0;
  const h = harness(async () => ++requests === 1 ? new Promise(resolve => { completeOld = resolve; }) : customer({ active: false, timestamp: NOW + 20 }));
  const old = h.service.processWebhook(SECRET, event("old-renewal"));
  // Let the first request reach the provider before the newer reconciliation.
  await new Promise(resolve => setImmediate(resolve));
  await h.service.processWebhook(SECRET, event("new-refund", "CANCELLATION"));
  completeOld(customer({ timestamp: NOW + 10 }));
  await old;
  assert.equal(h.stored.get(A)?.entitlement.active, false);
  assert.equal(h.stored.get(A)?.verifiedAtMs, NOW + 20);
});

test("dashboard TEST webhooks are authenticated and recorded but never grant access", async () => {
  const h = harness(async () => { throw new Error("must not fetch"); });
  await h.service.processWebhook(SECRET, event("dashboard", "TEST"));
  assert.equal(h.calls.length, 0); assert.equal(h.completed.has("dashboard"), true);
});

test("provider requests encode identity, keep secrets in headers, and surface all provider failures", async () => {
  let url = ""; let authorization = "";
  const fetcher: typeof fetch = async (input, init) => {
    url = String(input); authorization = (init?.headers as Record<string, string>).Authorization;
    return new Response(JSON.stringify(customer()), { status: 200 });
  };
  await fetchRevenueCatSubscriber("user/with?chars", "private-test-key", fetcher);
  assert.equal(url, "https://api.revenuecat.com/v1/subscribers/user%2Fwith%3Fchars");
  assert.equal(authorization, "Bearer private-test-key"); assert.equal(url.includes("private-test-key"), false);
  for (const status of [401, 404, 429, 500]) await assert.rejects(fetchRevenueCatSubscriber(A, "key", async () => new Response("provider detail", { status })), statusError(503));
  await assert.rejects(fetchRevenueCatSubscriber(A, "key", async () => { throw new Error("network"); }), statusError(503));
  await assert.rejects(fetchRevenueCatSubscriber(A, "key", async () => new Response("not JSON", { status: 200 })), statusError(503));
});

async function guardResult(entitlement: Entitlement, configured = true, failure?: Error) {
  let lookedUp: string | null = null;
  const guard = createProGuard({ configured, userId: () => A, getEntitlement: async id => { lookedUp = id; if (failure) throw failure; return entitlement; } });
  let result: unknown = "not-called";
  await guard({ body: { userId: B, tier: "pro", active: true } } as Request, {} as ExpressResponse, error => { result = error; });
  return { result, lookedUp };
}

test("server guard uses authenticated identity and fails closed for free, unconfigured, and outage states", async () => {
  const paid = normalizeSubscriber(customer(), "pro", false, NOW).entitlement;
  assert.deepEqual(await guardResult(paid), { result: undefined, lookedUp: A });
  assert.ok(statusError(402)((await guardResult(freeEntitlement())).result));
  assert.ok(statusError(503)((await guardResult(paid, false)).result));
  assert.equal((await guardResult(paid, false)).lookedUp, null);
  assert.ok(statusError(503)((await guardResult(paid, true, new ApiError(503, "outage"))).result));
});
