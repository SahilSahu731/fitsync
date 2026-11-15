import React, { useState } from "react";
import { ActivityIndicator, Share, View } from "react-native";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { Sheet } from "./editors";
import { Icon, SmallButton } from "./visuals";
import type { ProgressAnalytics } from "./analytics";
import { progressShareSummary } from "./share-summary";

export function ShareProgress({
  data,
  unit,
  loading,
  error,
  onRetry,
  onClose,
}: {
  data: ProgressAnalytics;
  unit: "kg" | "lb";
  loading: boolean;
  error: string;
  onRetry: () => void;
  onClose: () => void;
}) {
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState("");
  const preview = progressShareSummary(data, unit);
  async function share() {
    if (sharing || loading || error || !data.current.workouts) return;
    setSharing(true);
    setShareError("");
    try {
      await Share.share(
        { title: "My FitSync progress", message: preview.message },
        { dialogTitle: "Share progress", subject: "My FitSync progress" },
      );
    } catch {
      setShareError("Could not open sharing. Please try again.");
    } finally {
      setSharing(false);
    }
  }
  return (
    <Sheet
      title="Share progress"
      subtitle="A snapshot of the work you’ve put in."
      onClose={onClose}
      busy={sharing}
    >
      {loading ? (
        <View className="items-center gap-3 py-8">
          <ActivityIndicator color={C.ink} />
          <Txt className="text-sm text-muted">Loading your progress…</Txt>
        </View>
      ) : error ? (
        <View className="gap-4 py-5">
          <Txt className="text-sm leading-6 text-muted">{error}</Txt>
          <SmallButton label="Retry" icon="sync" onPress={onRetry} />
        </View>
      ) : (
        <>
          <View
            className="rounded-[26px] border bg-elevated p-5"
            style={{ borderColor: "#FFFFFF1F" }}
          >
            <View className="flex-row items-center gap-2">
              <Icon name="chart-line" size={21} color={C.ink} />
              <Txt weight="semibold" className="text-xs tracking-[2px]" style={{ color: C.ink }}>
                FITSYNC
              </Txt>
            </View>
            <Txt weight="semibold" className="mt-5 text-[26px] tracking-[-0.7px]">
              My progress.
            </Txt>
            <Txt className="mb-5 mt-1 text-xs text-muted">{preview.range}</Txt>
            <View className="flex-row flex-wrap gap-3">
              {preview.stats.map((stat) => (
                <View
                  key={stat.label}
                  className="min-w-0 grow rounded-2xl bg-panel p-3"
                  style={{ width: "45%" }}
                >
                  <View className="mb-3 flex-row items-center gap-2">
                    <Icon name={stat.icon} size={17} color={C.ink} />
                    <Txt className="flex-1 text-[10px] text-muted">{stat.label}</Txt>
                  </View>
                  <Txt
                    weight="semibold"
                    className="text-[25px]"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {stat.value}
                  </Txt>
                  <Txt className="mt-1 text-[10px] text-muted">{stat.suffix}</Txt>
                </View>
              ))}
            </View>
            <Txt className="mt-5 text-xs text-muted">One session at a time.</Txt>
          </View>
          {!data.current.workouts && (
            <Txt className="mt-4 text-sm leading-6 text-muted">
              Complete a workout to start your progress snapshot. You can also select a longer range
              in Analytics.
            </Txt>
          )}
          {!!shareError && (
            <Txt accessibilityRole="alert" className="mt-4 text-sm" style={{ color: "#FF9A94" }}>
              {shareError}
            </Txt>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: sharing || !data.current.workouts, busy: sharing }}
            disabled={sharing || !data.current.workouts}
            onPress={() => void share()}
            className={`mt-5 min-h-14 flex-row items-center justify-center gap-2 rounded-full ${!data.current.workouts ? "opacity-40" : ""}`}
            style={{ backgroundColor: C.ink }}
          >
            {sharing ? (
              <ActivityIndicator color={C.bg} />
            ) : (
              <Icon name="share-variant-outline" size={20} color={C.bg} />
            )}
            <Txt weight="semibold" className="text-sm text-bg">
              {sharing ? "Opening share…" : "Share summary"}
            </Txt>
          </Pressable>
          <Txt className="mt-3 text-center text-[10px] leading-4 text-muted">
            Shares these training totals as text.
          </Txt>
        </>
      )}
    </Sheet>
  );
}
