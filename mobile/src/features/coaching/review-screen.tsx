import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useWorkout } from "@/src/features/workouts/workout-context";
import { useSession } from "@/src/context/session";
import { Card, PrimaryButton, Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { useBilling } from "@/src/features/billing/billing-context";
import { coachingForOwner, type WeeklyReview } from "./api";
import { CoachHeader, CoachLink, Notes } from "./components";
import { displayDate } from "./model";

export function CoachReviewScreen() {
  const { isPro, loading: billingLoading } = useBilling();
  const { user } = useSession();
  const { ensureSynced } = useWorkout();
  const syncLatest = useRef(ensureSynced);
  useLayoutEffect(() => { syncLatest.current = ensureSynced; }, [ensureSynced]);
  const identity = useRef(user?.id);
  useLayoutEffect(() => { identity.current = user?.id; return () => { identity.current = undefined; }; }, [user?.id]);
  const sequence = useRef(0);
  const [snapshot, setSnapshot] = useState<{ userId: string; review: WeeklyReview } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const review = snapshot && snapshot.userId === user?.id ? snapshot.review : null;
  const refresh = useCallback(async () => {
    if (!isPro || !user) return;
    const account = user.id; const request = ++sequence.current; setLoading(true);
    try { await syncLatest.current(); const result = await coachingForOwner(account).review(); if (identity.current === account && sequence.current === request) { setSnapshot({ userId: account, review: result }); setError(null); } }
    catch (failure) { if (identity.current === account && sequence.current === request) setError(failure instanceof Error ? failure.message : "Could not load your review."); }
    finally { if (identity.current === account && sequence.current === request) setLoading(false); }
  }, [isPro, user]);
  useFocusEffect(useCallback(() => { void refresh(); return () => { sequence.current++; }; }, [refresh]));
  return <View className="flex-1 bg-bg"><CoachHeader title="Weekly review" subtitle="FitSync Pro" /><ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={C.brand} />} contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
    {billingLoading || loading && !review ? <ActivityIndicator color={C.brand} style={{ marginVertical: 40 }} /> : !isPro ? <><View className="mb-6 h-16 w-16 items-center justify-center rounded-[23px] bg-brand/10"><MaterialCommunityIcons name="chart-timeline-variant" color={C.brand} size={30} /></View><Txt weight="extra" className="text-[32px] leading-[38px]">Know what to
carry into next week.</Txt><Txt className="mb-7 mt-4 text-base leading-7 text-muted">Review your completed workouts and next steps with FitSync Pro. Your normal progress tracking and history stay free.</Txt><PrimaryButton title="Explore FitSync Pro" onPress={() => router.push("/pro")} /></> : <>
    {error && <View className="mb-5 rounded-2xl bg-panel p-4"><Txt accessibilityRole="alert" className="text-sm">{error}</Txt><CoachLink label="Retry review" icon="refresh" onPress={() => void refresh()} /></View>}
    {review && <><Txt weight="semibold" className="mb-3 text-xs tracking-[1px] text-brand">{displayDate(review.period.start)} – {displayDate(review.period.end)}</Txt><Txt weight="extra" className="mb-6 text-[32px] leading-[38px] tracking-[-0.7px]">{review.headline}</Txt><View className="mb-6 flex-row gap-2">{[{ label: "workouts", value: review.metrics.workouts }, { label: "sets logged", value: review.metrics.completedSets }, { label: "minutes", value: Math.round(review.metrics.minutes) }].map(item => <View key={item.label} className="flex-1 rounded-[20px] bg-panel px-2 py-5"><Txt weight="bold" className="text-center text-[27px] text-brand">{item.value}</Txt><Txt className="mt-1 text-center text-[11px] text-muted">{item.label}</Txt></View>)}</View><View className="mb-5"><Card><Txt weight="bold" className="text-lg">What your logs show</Txt><Notes items={review.observations} /></Card></View><View className="mb-5"><Card><Txt weight="bold" className="text-lg">Your next steps</Txt><Notes items={review.actions} /><CoachLink label="Open your plan" onPress={() => router.push("/coach")} /></Card></View><Txt weight="semibold" className="text-sm">About this review</Txt><Notes items={review.dataNotes} /></>}
    </>}
  </ScrollView></View>;
}
