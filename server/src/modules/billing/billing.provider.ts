import { ApiError } from "../../common/errors.js";

export async function fetchRevenueCatSubscriber(userId: string, secretApiKey: string, fetcher: typeof fetch = fetch): Promise<unknown> {
  try {
    const response = await fetcher(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${secretApiKey}`, Accept: "application/json" },
      signal: AbortSignal.timeout(8000)
    });
    // A 404/401/429/5xx is not evidence that a customer has no entitlement.
    if (!response.ok) throw new ApiError(503, "Subscription verification is temporarily unavailable. Please try again.");
    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(503, "Subscription verification is temporarily unavailable. Please try again.");
  }
}
