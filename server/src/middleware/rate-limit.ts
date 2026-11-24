import { createHmac } from "node:crypto";
import { rateLimit, type Options, type Store } from "express-rate-limit";
import { db } from "../config/supabase.js";
import { env } from "../config/env.js";
import { authRateLimitKey } from "../common/client-ip.js";

// PostgreSQL makes increments atomic across instances and rolling deployments.
export class DatabaseRateLimitStore implements Store {
  windowMs = 60_000;
  localKeys = false;
  constructor(readonly prefix: string) {}
  init(options: Options) {
    this.windowMs = options.windowMs;
  }
  key(value: string) {
    return createHmac("sha256", env.JWT_SECRET).update(`${this.prefix}:${value}`).digest("hex");
  }
  async increment(key: string) {
    const { data, error } = await db
      .rpc("consume_rate_limit", {
        p_key: this.key(key),
        p_window_ms: this.windowMs,
      })
      .abortSignal(AbortSignal.timeout(3_000));
    const totalHits = Number(data?.[0]?.total_hits);
    const resetTime = new Date(data?.[0]?.reset_time);
    if (
      error ||
      !Number.isSafeInteger(totalHits) ||
      totalHits < 1 ||
      !Number.isFinite(resetTime.getTime())
    )
      throw new Error("Rate limit store unavailable");
    return { totalHits, resetTime };
  }
  async decrement(_key: string) {
    /* All requests count, including failures. */
  }
  async resetKey(key: string) {
    const { error } = await db.from("api_rate_limits").delete().eq("key", this.key(key));
    if (error) throw new Error("Rate limit reset unavailable");
  }
}

export function apiRateLimit(prefix: string, options: Partial<Options> = {}) {
  return rateLimit({
    windowMs: 60_000,
    limit: 120,
    keyGenerator: authRateLimitKey,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Too many requests. Please wait a moment and try again." },
    ...options,
    // Development/test use isolated memory; production always fails closed on store errors.
    ...(env.NODE_ENV === "production" ? { store: new DatabaseRateLimitStore(prefix) } : {}),
    passOnStoreError: false,
  });
}
