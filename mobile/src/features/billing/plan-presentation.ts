import type { BillingOffer } from "./offers";

export type PresentedPlan = {
  offer: BillingOffer;
  title: string;
  cadence: string;
  months: number | null;
  savings: number | null;
  oneTime: boolean;
};

function recurring(offer: BillingOffer, platform: string) {
  const product = offer.package.product;
  const phase = platform === "android" ? product.defaultOption?.fullPricePhase : null;
  const period = phase?.billingPeriod.iso8601 ?? product.subscriptionPeriod;
  const match = period?.match(/^P(\d+)(M|Y)$/);
  return {
    months: match ? Number(match[1]) * (match[2] === "Y" ? 12 : 1) : null,
    price: phase ? phase.price.amountMicros / 1_000_000 : product.price,
    currency: phase?.price.currencyCode ?? product.currencyCode,
  };
}

/** Savings always compare matching currencies and full recurring store prices. */
export function presentPlans(offers: BillingOffer[], platform: string): PresentedPlan[] {
  const monthly = offers
    .map((offer) => recurring(offer, platform))
    .filter((item) => item.months === 1 && Number.isFinite(item.price) && item.price > 0);
  return offers
    .map((offer) => {
      if (offer.purchaseType === "lifetime")
        return {
          offer,
          months: null,
          title: "Lifetime",
          cadence: "Pay once",
          savings: null,
          oneTime: true,
        };
      const price = recurring(offer, platform);
      const comparison = monthly
        .filter((item) => item.currency && item.currency === price.currency)
        .sort((a, b) => a.price - b.price)[0];
      const savings =
        price.months === 12 && comparison && Number.isFinite(price.price) && price.price > 0
          ? Math.floor((1 - price.price / (comparison.price * 12)) * 100)
          : 0;
      return {
        offer,
        oneTime: false,
        months: price.months,
        title:
          price.months === 1
            ? "Monthly"
            : price.months === 12
              ? "Yearly"
              : `Every ${offer.period === "week" ? "week" : offer.period}`,
        cadence:
          price.months === 1
            ? "Billed monthly"
            : price.months === 12
              ? "Billed yearly"
              : `Billed every ${offer.period}`,
        savings: savings > 0 && savings < 100 ? savings : null,
      };
    })
    .sort((a, b) => (a.months ?? Infinity) - (b.months ?? Infinity));
}

export function selectedPlan(plans: PresentedPlan[], selection: string | null) {
  return (
    plans.find((item) => item.offer.id === selection) ??
    plans.find((item) => item.months === 12) ??
    plans[0] ??
    null
  );
}
