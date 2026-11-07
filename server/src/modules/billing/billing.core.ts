import { ApiError } from "../../common/errors.js";
import { affectedUserIds, atCurrentTime, freeEntitlement, normalizeSubscriber, validWebhookAuthorization, webhookSchema } from "./billing.policy.js";
import type { BillingConfig, BillingRepository, BillingStatus } from "./billing.types.js";

export function createBillingService(options: {
  config: BillingConfig;
  repository: BillingRepository;
  fetchSubscriber: (userId: string) => Promise<unknown>;
  now?: () => number;
}) {
  const { config, repository } = options;
  const now = options.now ?? Date.now;
  const configured = Boolean(config.secretApiKey);

  async function reconcile(userId: string) {
    const canonical = await options.fetchSubscriber(userId);
    const snapshot = normalizeSubscriber(canonical, config.entitlementId, config.allowSandbox, now());
    // An atomic DB comparison prevents a delayed earlier canonical response from
    // overwriting a later response, across workers and webhook/request races.
    const stored = await repository.storeSnapshot(userId, snapshot);
    return atCurrentTime(stored.entitlement, now());
  }

  async function getStatus(userId: string): Promise<BillingStatus> {
    if (!configured) return { entitlement: freeEntitlement(), configured: false };
    return { entitlement: await reconcile(userId), configured: true };
  }

  async function processWebhook(authorization: string | undefined, body: unknown) {
    if (!configured || !config.webhookAuthorization) throw new ApiError(503, "Billing webhooks are not configured.");
    if (!validWebhookAuthorization(authorization, config.webhookAuthorization)) throw new ApiError(401, "Invalid webhook authorization.");
    const payload = webhookSchema.parse(body);
    const { id, type } = payload.event;
    if (await repository.webhookProcessed(id)) return { received: true, duplicate: true };
    if (type !== "TEST") {
      const ids = await repository.knownUserIds(affectedUserIds(payload));
      // Read the current state for *both* sides of transfers. Event timestamps,
      // expiry fields, products and tier claims never directly grant access.
      // Partial failures remain unacknowledged and retry safely.
      for (let index = 0; index < ids.length; index += 5) {
        await Promise.all(ids.slice(index, index + 5).map(reconcile));
      }
    }
    await repository.completeWebhook(id, type);
    return { received: true, duplicate: false };
  }

  return { configured, getStatus, getEntitlement: async (userId: string) => (await getStatus(userId)).entitlement, processWebhook };
}
