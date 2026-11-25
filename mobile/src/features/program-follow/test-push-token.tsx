import React, { useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { Txt } from "@/src/components/ui";
import { getDevelopmentPushToken } from "./notifications";

export function TestPushToken() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const pending = useRef(false);

  async function showToken() {
    if (pending.current) return;
    if (token) {
      setToken("");
      return;
    }
    pending.current = true;
    setLoading(true);
    setError("");
    try {
      setToken(await getDevelopmentPushToken());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn’t get a token. Please try again.");
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }

  return (
    <View className="mt-3 rounded-2xl bg-panel px-5">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: loading, busy: loading, expanded: !!token }}
        disabled={loading}
        onPress={() => void showToken()}
        className="min-h-12 justify-center py-3"
      >
        <Txt weight="medium">
          {loading ? "Getting token…" : token ? "Hide test push token" : "Show test push token"}
        </Txt>
      </Pressable>
      {!!token && (
        <View className="gap-2 pb-4">
          <Txt className="text-xs leading-5 text-muted">
            Long-press the token, select all and copy it. It identifies this installation.
          </Txt>
          <Txt selectable className="text-sm">
            {token}
          </Txt>
        </View>
      )}
      {!!error && (
        <Txt accessibilityRole="alert" className="pb-4 text-sm text-muted">
          {error}
        </Txt>
      )}
    </View>
  );
}
