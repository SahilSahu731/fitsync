export type Entitlement = {
  tier: "free" | "pro";
  active: boolean;
  expiresAt: string | null;
  willRenew: boolean;
  managementUrl: string | null;
  source: "revenuecat" | "none";
  sandbox: boolean;
};

export type BillingStatus = { entitlement: Entitlement; configured: boolean };
export type BillingSnapshot = { entitlement: Entitlement; verifiedAtMs: number };
export type BillingConfig = {
  secretApiKey?: string;
  entitlementId: string;
  webhookAuthorization?: string;
  allowSandbox: boolean;
};

export interface BillingRepository {
  knownUserIds(ids: string[]): Promise<string[]>;
  storeSnapshot(userId: string, snapshot: BillingSnapshot): Promise<BillingSnapshot>;
  webhookProcessed(id: string): Promise<boolean>;
  completeWebhook(id: string, type: string): Promise<void>;
}
