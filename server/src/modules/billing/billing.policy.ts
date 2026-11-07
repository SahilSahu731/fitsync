import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { ApiError } from "../../common/errors.js";
import type { BillingSnapshot, Entitlement } from "./billing.types.js";

const date = z.iso.datetime({ offset: true });
const subscriptionSchema = z.object({
  is_sandbox: z.boolean(),
  expires_date: date.nullable(),
  grace_period_expires_date: date.nullable().optional(),
  unsubscribe_detected_at: date.nullable().optional(),
  billing_issues_detected_at: date.nullable().optional(),
  refunded_at: date.nullable().optional(),
  auto_resume_date: date.nullable().optional(),
  product_plan_identifier: z.string().nullable().optional(),
  store: z.string().optional()
});

export const subscriberSchema = z.object({
  request_date: date,
  request_date_ms: z.number().int().nonnegative().optional(),
  subscriber: z.object({
    entitlements: z.record(z.string(), z.object({
      expires_date: date.nullable(),
      grace_period_expires_date: date.nullable().optional(),
      product_identifier: z.string().min(1),
      purchase_date: date
    })),
    management_url: z.string().nullable().optional(),
    subscriptions: z.record(z.string(), subscriptionSchema).default({}),
    non_subscriptions: z.record(z.string(), z.array(z.object({
      is_sandbox: z.boolean(),
      purchase_date: date
    }))).default({})
  })
});

const userId = z.string().max(256);
export const webhookSchema = z.object({
  event: z.object({
    id: z.string().min(1).max(200),
    type: z.string().min(1).max(100),
    app_user_id: userId.optional(),
    original_app_user_id: userId.optional(),
    aliases: z.array(userId).max(100).optional(),
    transferred_from: z.array(userId).max(100).optional(),
    transferred_to: z.array(userId).max(100).optional(),
    redeemed_by: z.array(userId).max(100).optional(),
    redeemed_from: z.array(userId).max(100).optional()
  })
});
export type BillingWebhook = z.infer<typeof webhookSchema>;

export function freeEntitlement(): Entitlement {
  return { tier: "free", active: false, expiresAt: null, willRenew: false, managementUrl: null, source: "none", sandbox: false };
}

// Hash fixed-length buffers before comparison so even a mismatched length takes
// the constant-time comparison path. This checks the entire configured header.
export function validWebhookAuthorization(actual: string | undefined, expected: string | undefined): boolean {
  if (!expected || !actual || actual.length > 4096) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(actual), digest(expected));
}

export function affectedUserIds(payload: BillingWebhook): string[] {
  const event = payload.event;
  const candidates = [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? []), ...(event.transferred_from ?? []), ...(event.transferred_to ?? []), ...(event.redeemed_by ?? []), ...(event.redeemed_from ?? [])];
  // Anonymous RevenueCat IDs and deleted/non-FitSync customers never create users.
  return [...new Set(candidates.filter((id): id is string => typeof id === "string" && z.uuid().safeParse(id).success))];
}

export function normalizeSubscriber(payload: unknown, entitlementId: string, allowSandbox: boolean, nowMs = Date.now()): BillingSnapshot {
  const parsed = subscriberSchema.safeParse(payload);
  if (!parsed.success) throw new ApiError(503, "The billing provider returned an invalid response. Please try again.");
  const { subscriber } = parsed.data;
  const verifiedAtMs = parsed.data.request_date_ms ?? Date.parse(parsed.data.request_date);
  const entitlement = subscriber.entitlements[entitlementId];
  const free = { ...freeEntitlement(), source: "revenuecat" as const };
  if (!entitlement) return { entitlement: free, verifiedAtMs };

  const product = entitlement.product_identifier;
  const subscription = subscriber.subscriptions[product] ?? Object.entries(subscriber.subscriptions).find(([id, item]) => item.product_plan_identifier && `${id}:${item.product_plan_identifier}` === product)?.[1];
  const purchases = subscriber.non_subscriptions[entitlement.product_identifier] ?? [];
  const purchase = [...purchases].sort((a, b) => Date.parse(b.purchase_date) - Date.parse(a.purchase_date))[0];
  const sandbox = subscription?.is_sandbox ?? purchase?.is_sandbox;
  // No environment metadata must never accidentally turn a sandbox purchase into
  // production access. Provider/schema failures are explicit, not fake free.
  if (sandbox === undefined) throw new ApiError(503, "The billing provider returned incomplete purchase information. Please try again.");

  const grace = entitlement.grace_period_expires_date ?? subscription?.grace_period_expires_date;
  const expiresAt = entitlement.expires_date === null ? null
    : new Date(Math.max(Date.parse(entitlement.expires_date), grace ? Date.parse(grace) : 0)).toISOString();
  // RevenueCat's entitlement is authoritative. Some store refunds preserve
  // current access/auto-renewal; refunded_at alone must not revoke that access.
  const active = (!sandbox || allowSandbox) && (expiresAt === null || Date.parse(expiresAt) > Math.max(nowMs, verifiedAtMs));
  const willRenew = Boolean(active && expiresAt && subscription && subscription.store !== "promotional" && !subscription.unsubscribe_detected_at && !subscription.billing_issues_detected_at && !subscription.auto_resume_date);
  let managementUrl: string | null = null;
  if (subscriber.management_url) {
    try { const url = new URL(subscriber.management_url); if (url.protocol === "https:") managementUrl = url.toString(); } catch { /* No unsafe management links. */ }
  }
  return { verifiedAtMs, entitlement: { tier: active ? "pro" : "free", active, expiresAt, willRenew, managementUrl, source: "revenuecat", sandbox } };
}

export function atCurrentTime(entitlement: Entitlement, nowMs: number): Entitlement {
  if (entitlement.active && entitlement.expiresAt && Date.parse(entitlement.expiresAt) <= nowMs) {
    return { ...entitlement, active: false, tier: "free", willRenew: false };
  }
  return entitlement;
}
