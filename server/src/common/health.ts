import type { RequestHandler } from "express";
import { db } from "../config/supabase.js";

export const health: RequestHandler = async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    // HEAD verifies the real REST/database path, schema and credentials without
    // retrieving any account rows or performing a costly exact count.
    const { error } = await db
      .from("app_users")
      .select("id", { head: true })
      .limit(1)
      .abortSignal(AbortSignal.timeout(3_000));
    if (error) throw error;
    res.json({ ok: true, service: "fitsync-api", database: "up" });
  } catch {
    res.status(503).json({ ok: false, service: "fitsync-api", database: "unavailable" });
  }
};
