import { db } from "../../config/supabase.js";
import { ApiError } from "../../common/errors.js";
import type { BillingRepository, BillingSnapshot } from "./billing.types.js";

function checked(error: { message: string } | null) {
  if (error) throw new ApiError(503, "Subscription storage is unavailable. Please try again.");
}

export const billingRepository: BillingRepository = {
  async knownUserIds(ids) {
    if (!ids.length) return [];
    const { data, error } = await db.from("app_users").select("id").in("id", ids);
    checked(error);
    return (data ?? []).map(row => row.id as string);
  },
  async storeSnapshot(userId, snapshot) {
    const { data, error } = await db.rpc("billing_store_snapshot", {
      p_user_id: userId,
      p_entitlement: snapshot.entitlement,
      p_verified_at_ms: snapshot.verifiedAtMs
    });
    checked(error);
    if (!data) throw new ApiError(503, "Subscription storage is unavailable. Please try again.");
    return { entitlement: data.entitlement, verifiedAtMs: Number(data.verified_at_ms) } as BillingSnapshot;
  },
  async webhookProcessed(id) {
    const { data, error } = await db.from("billing_webhook_events").select("id").eq("id", id).maybeSingle();
    checked(error);
    return Boolean(data);
  },
  async completeWebhook(id, type) {
    const { error } = await db.from("billing_webhook_events").upsert({ id, event_type: type }, { onConflict: "id", ignoreDuplicates: true });
    checked(error);
  }
};
