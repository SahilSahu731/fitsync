export type TrialInfo = {
  requestDate?: string;
  entitlements: {
    active: Record<
      string,
      {
        isActive: boolean;
        willRenew: boolean;
        periodType: string;
        productIdentifier: string;
        latestPurchaseDate: string;
        expirationDate: string | null;
      }
    >;
  };
};

/** Use the receipt's actual expiry, never seven days from an app tap. */
export function trialReminderDate(
  info: TrialInfo,
  productId: string,
  now = Date.now(),
): number | null {
  const entitlement = Object.values(info.entitlements.active).find(
    (item) =>
      item.isActive &&
      item.willRenew &&
      item.periodType === "TRIAL" &&
      item.productIdentifier.split(":")[0] === productId.split(":")[0],
  );
  if (!entitlement?.expirationDate) return null;
  const start = Date.parse(entitlement.latestPurchaseDate),
    end = Date.parse(entitlement.expirationDate);
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    Math.abs(end - start - 7 * 86400_000) > 60_000
  )
    return null;
  const remindAt = end - 2 * 86400_000;
  return remindAt > now ? remindAt : null;
}
