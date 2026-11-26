import { env } from "../../config/env.js";
import { isUserAdmin } from "../../middleware/admin.js";
import { createBillingService } from "./billing.core.js";
import { fetchRevenueCatSubscriber } from "./billing.provider.js";
import { billingRepository } from "./billing.repository.js";

export const billingService = createBillingService({
  config: {
    secretApiKey: env.REVENUECAT_SECRET_API_KEY,
    entitlementId: env.REVENUECAT_ENTITLEMENT_ID,
    webhookAuthorization: env.REVENUECAT_WEBHOOK_AUTHORIZATION,
    allowSandbox: env.REVENUECAT_ALLOW_SANDBOX,
  },
  repository: billingRepository,
  isUserAdmin,
  fetchSubscriber: (userId) => fetchRevenueCatSubscriber(userId, env.REVENUECAT_SECRET_API_KEY!),
});

export const getEntitlement = billingService.getEntitlement;
export type { Entitlement, BillingStatus } from "./billing.types.js";
