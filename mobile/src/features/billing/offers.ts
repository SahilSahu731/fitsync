import type { PurchasesPackage } from "react-native-purchases";
import { periodLabel } from "./model";
export type BillingOffer = {
  id: string;
  title: string;
  price: string;
  period: string;
  intro: string | null;
  /** Exact eligible store offer used by purchasePackage; never an app-created trial. */
  trialDays?: number | null;
  purchaseType: "subscription" | "lifetime";
  package: PurchasesPackage;
};

const isLifetime = (item: PurchasesPackage) =>
  item.packageType === "LIFETIME" &&
  !item.product.subscriptionPeriod &&
  (item.product.productCategory == null || item.product.productCategory === "NON_SUBSCRIPTION") &&
  (item.product.productType == null ||
    item.product.productType === "UNKNOWN" ||
    item.product.productType === "NON_CONSUMABLE");

export function makeOffers(packages: PurchasesPackage[], platform: string): BillingOffer[] {
  return packages
    .filter((item) => {
      const product = item.product;
      // Lifetime must be an explicitly configured store package. Keep prepaid and
      // installment commitments out of ordinary subscription renewal terms.
      return (
        isLifetime(item) ||
        (!!product.subscriptionPeriod &&
          !product.installmentsInfo &&
          !product.defaultOption?.installmentsInfo &&
          !product.defaultOption?.isPrepaid)
      );
    })
    .map((item) => {
      const product = item.product;
      if (isLifetime(item))
        return {
          id: item.identifier,
          title: product.title || "FitSync Pro",
          price: product.priceString,
          period: "lifetime",
          intro: null,
          purchaseType: "lifetime" as const,
          package: item,
        };
      const intro = product.introPrice;
      let introText = intro
        ? `${intro.price === 0 ? "Free" : intro.priceString} for ${intro.periodNumberOfUnits} ${String(intro.periodUnit).toLowerCase()}${intro.periodNumberOfUnits === 1 ? "" : "s"}${intro.cycles > 1 ? ` × ${intro.cycles}` : ""}, if eligible.`
        : null;
      let price = product.priceString;
      let period = periodLabel(product.subscriptionPeriod);
      let trialDays: number | null = null;
      if (platform === "android" && product.defaultOption) {
        const full = product.defaultOption.fullPricePhase;
        if (full) {
          price = full.price.formatted;
          period = periodLabel(full.billingPeriod.iso8601);
        }
        const phases = product.defaultOption.pricingPhases;
        const introductory = phases.slice(0, -1);
        const free = introductory[0];
        if (
          introductory.length === 1 &&
          free.price.amountMicros === 0 &&
          free.billingCycleCount === 1 &&
          /^(P7D|P1W)$/.test(free.billingPeriod.iso8601)
        )
          trialDays = 7;
        introText = introductory.length
          ? introductory
              .map(
                (phase) =>
                  `${phase.price.amountMicros === 0 ? "Free" : phase.price.formatted} for ${phase.billingPeriod.value} ${String(phase.billingPeriod.unit).toLowerCase()}${phase.billingPeriod.value === 1 ? "" : "s"}${phase.billingCycleCount && phase.billingCycleCount > 1 ? ` × ${phase.billingCycleCount}` : ""}`,
              )
              .join(". Then ") + ", if eligible."
          : null;
      }
      return {
        id: item.identifier,
        title: product.title || "FitSync Pro",
        price,
        period,
        intro: introText,
        trialDays,
        purchaseType: "subscription" as const,
        package: item,
      };
    });
}
