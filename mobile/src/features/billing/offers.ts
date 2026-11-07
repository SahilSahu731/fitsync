import type { PurchasesPackage } from "react-native-purchases";
import { periodLabel } from "./model";
export type BillingOffer = { id: string; title: string; price: string; period: string; intro: string | null; package: PurchasesPackage };

export function makeOffers(packages: PurchasesPackage[], platform: string): BillingOffer[] {
  return packages.filter(item => {
    const product = item.product;
    // This paywall describes ordinary auto-renewing subscriptions. Do not sell
    // prepaid or installment commitments under inaccurate renewal terms.
    return !!product.subscriptionPeriod && !product.installmentsInfo && !product.defaultOption?.installmentsInfo && !product.defaultOption?.isPrepaid;
  }).map(item => {
    const product = item.product;
    const intro = product.introPrice;
    let introText = intro ? `${intro.price === 0 ? "Free" : intro.priceString} for ${intro.periodNumberOfUnits} ${String(intro.periodUnit).toLowerCase()}${intro.periodNumberOfUnits === 1 ? "" : "s"}${intro.cycles > 1 ? ` × ${intro.cycles}` : ""}, if eligible.` : null;
    let price = product.priceString;
    let period = periodLabel(product.subscriptionPeriod);
    if (platform === "android" && product.defaultOption) {
      const full = product.defaultOption.fullPricePhase;
      if (full) { price = full.price.formatted; period = periodLabel(full.billingPeriod.iso8601); }
      const phases = product.defaultOption.pricingPhases;
      const introductory = phases.slice(0, -1);
      introText = introductory.length ? introductory.map(phase => `${phase.price.amountMicros === 0 ? "Free" : phase.price.formatted} for ${phase.billingPeriod.value} ${String(phase.billingPeriod.unit).toLowerCase()}${phase.billingPeriod.value === 1 ? "" : "s"}${phase.billingCycleCount && phase.billingCycleCount > 1 ? ` × ${phase.billingCycleCount}` : ""}`).join(". Then ") + ", if eligible." : null;
    }
    return { id: item.identifier, title: product.title || "FitSync Pro", price, period, intro: introText, package: item };
  });
}
