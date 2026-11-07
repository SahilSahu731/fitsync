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
export const FREE_ENTITLEMENT: Entitlement = {
  tier: "free", active: false, expiresAt: null, willRenew: false,
  managementUrl: null, source: "none", sandbox: false,
};

// Only the authenticated server response can enable Pro. A successful store
// transaction is a separate state while receipt verification catches up.
export function hasPro(status: BillingStatus | null, nowMs = Date.now()) {
  if (status?.entitlement.tier !== "pro" || status.entitlement.active !== true) return false;
  return status.entitlement.expiresAt === null || Date.parse(status.entitlement.expiresAt) > nowMs;
}

export function periodLabel(period: string | null | undefined) {
  const match = period?.match(/^P(\d+)(D|W|M|Y)$/);
  if (!match) return "subscription period";
  const count = Number(match[1]);
  const unit = ({ D: "day", W: "week", M: "month", Y: "year" } as const)[match[2] as "D" | "W" | "M" | "Y"];
  return count === 1 ? unit : `${count} ${unit}s`;
}

export function subscriptionManagementUrl(value: string | null, platform: string) {
  if (value) {
    try { if (new URL(value).protocol === "https:") return value; } catch { /* Use the store fallback below. */ }
  }
  if (platform === "ios") return "https://apps.apple.com/account/subscriptions";
  if (platform === "android") return "https://play.google.com/store/account/subscriptions";
  return null;
}

export function isCancelledPurchase(error: unknown) {
  return !!error && typeof error === "object" && "userCancelled" in error && error.userCancelled === true;
}

export function legalUrl(value: string | undefined) {
  try { const url = new URL(value ?? ""); return url.protocol === "https:" ? url.toString() : null; } catch { return null; }
}

export async function confirmStorePurchase(sync: () => Promise<BillingStatus>): Promise<"active" | "pending"> {
  try { return hasPro(await sync()) ? "active" : "pending"; }
  catch { return "pending"; }
}
