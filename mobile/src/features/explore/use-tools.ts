import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { apiRequest } from "@/src/services/api";
import type { ToolDefinition, ToolId } from "./tools";

type ToolRecord = { slug: string; calculator_key: ToolId; title: string; summary: string; cover_url: string | null; explanation: string; example: string };
export function usePublishedTools() {
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    // Changing retry deliberately restarts the focus subscription.
    void retry;
    apiRequest<ToolRecord[]>("/explore/tools").then(rows => {
      if (active) { setTools(rows.map(row => ({ ...row, id: row.slug, name: row.title, description: row.summary, icon: "calculator" }))); setError(""); }
    }).catch(e => { if (active) { setTools([]); setError(e instanceof Error ? e.message : "Unable to load tools."); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]));
  return { tools, loading, error, reload: () => setRetry(n => n + 1) };
}
