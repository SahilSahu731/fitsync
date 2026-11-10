import React, { useState } from "react";
import { ActivityIndicator, Linking, RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable } from "@/src/components/motion";
import { PrimaryButton, Txt } from "@/src/components/ui";
import { useAppAlert } from "@/src/components/app-dialog";
import { C } from "@/src/constants/theme";
import { useBilling } from "./billing-context";
import { legalUrl } from "./model";

const benefits = [
  { icon: "calendar-refresh-outline" as const, title: "A plan that fits your day", description: "Adjust time, equipment or effort. Move a missed session and keep your schedule together." },
  { icon: "trending-up" as const, title: "Your next step, explained", description: "Review your logged sets and choose the next progression with a clear reason." },
  { icon: "chart-timeline-variant" as const, title: "A weekly review with direction", description: "See what you completed, what the data can tell you and what to focus on next." },
  { icon: "silverware-fork-knife" as const, title: "A calmer week of meals", description: "Build a menu around your food preferences, swap meals and share a practical shopping list." },
];

export function ProScreen() {
  const billing = useBilling();
  const { alert } = useAppAlert();
  const [selection, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const terms = legalUrl(process.env.EXPO_PUBLIC_TERMS_URL);
  const privacy = legalUrl(process.env.EXPO_PUBLIC_PRIVACY_URL);
  const selected = billing.offers.find(item => item.id === selection)?.id ?? billing.offers[0]?.id ?? null;
  const chosen = billing.offers.find(item => item.id === selected);
  const run = async (action: () => Promise<void>) => {
    setNotice(null);
    try { await action(); } catch (error) { alert("Could not complete the request", error instanceof Error ? error.message : "Please try again.", undefined, "error"); }
  };
  const buy = () => void run(async () => {
    if (!selected) return;
    if (await billing.purchase(selected) === "active") setNotice("FitSync Pro is active. Your plan is ready to adapt with you.");
  });
  const restore = () => void run(async () => {
    const result = await billing.restore();
    setNotice(result === "active" ? "Your FitSync Pro subscription is restored." : result === "none" ? "No active subscription was found for this store account. If you purchased elsewhere, sign in with the same FitSync account." : null);
  });
  const link = (title: string, action: () => void, disabled = false) => <MotionPressable accessibilityRole="button" disabled={disabled} onPress={action} className="min-h-12 items-center justify-center px-2"><Txt className="text-sm text-muted">{title}</Txt></MotionPressable>;
  return <SafeAreaView className="flex-1 bg-bg" edges={["bottom"]}>
    <View className="flex-row items-center justify-between px-5 py-2">
      <MotionPressable accessibilityRole="button" accessibilityLabel="Go back" disabled={billing.busy} onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/profile")} className="h-11 w-11 items-center justify-center rounded-full bg-panel"><MaterialCommunityIcons name="arrow-left" size={23} color={C.ink} /></MotionPressable>
      <Txt weight="semibold" className="text-sm">FITSYNC PRO</Txt><MotionPressable accessibilityRole="button" accessibilityLabel="Membership and billing" disabled={billing.busy} onPress={() => router.push("/billing")} className="h-11 w-11 items-center justify-center"><MaterialCommunityIcons name="credit-card-outline" size={23} color={C.ink} /></MotionPressable>
    </View>
    <ScrollView refreshControl={<RefreshControl refreshing={billing.loading} onRefresh={() => void billing.refresh()} tintColor={C.brand} />} contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
      <View className="mb-6 mt-4 h-16 w-16 items-center justify-center rounded-[23px] bg-brand"><MaterialCommunityIcons name="star-four-points" size={34} color={C.bg} /></View>
      <Txt weight="extra" className="text-[40px] leading-[44px] tracking-[-1.3px]">Make your plan{"\n"}work for your life.</Txt>
      <Txt className="mb-8 mt-4 text-base leading-6 text-muted">Clear next steps. Room for real life. Progress you can understand.</Txt>
      {billing.isPro && <View className="mb-7 rounded-[26px] border border-brand/40 bg-brand/10 p-5">
        <View className="flex-row items-center gap-2"><MaterialCommunityIcons name="check-decagram" size={24} color={C.brand} /><Txt weight="bold" className="text-xl text-brand">Your Pro membership</Txt></View>
        <Txt className="mt-3 text-sm leading-6">{billing.entitlement.expiresAt ? `${billing.entitlement.willRenew ? "Renews" : "Access until"} ${new Date(billing.entitlement.expiresAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}.` : "FitSync Pro is active on your account."}</Txt>
        {!billing.entitlement.willRenew && billing.entitlement.expiresAt && <Txt className="mt-1 text-sm text-muted">Renewal is off. Your access continues until this date.</Txt>}
        {billing.entitlement.sandbox && <Txt className="mt-2 text-xs text-muted">Test subscription</Txt>}
        <View className="mt-4"><PrimaryButton title="Open your plan" onPress={() => router.push("/coach")} /></View>
        {link("Manage or cancel subscription ↗", () => void run(billing.manage))}
      </View>}
      {benefits.map(item => <View key={item.title} className="mb-6 flex-row items-start gap-4"><View className="h-11 w-11 items-center justify-center rounded-2xl bg-panel"><MaterialCommunityIcons name={item.icon} size={24} color={C.brand} /></View><View className="flex-1"><Txt weight="semibold" className="text-lg">{item.title}</Txt><Txt className="mt-1 text-sm leading-6 text-muted">{item.description}</Txt></View></View>)}
      <View className="mb-7 rounded-[24px] bg-panel p-5"><Txt weight="semibold" className="text-base">A useful free app, always.</Txt><Txt className="mt-2 text-sm leading-6 text-muted">Your personal starting plan, workout logging, daily tracking, meal ideas, private commitments and progress history stay free. Pro adds plan adjustments, progression reviews, weekly guidance and meal planning.</Txt></View>
      {billing.pendingActivation && !billing.isPro && <View accessibilityLiveRegion="polite" className="mb-5 rounded-2xl border border-brand/40 bg-brand/10 p-4"><Txt weight="semibold" className="text-brand">Purchase received · activating Pro</Txt><Txt className="mt-2 text-sm leading-6 text-muted">Your store purchase went through. We are waiting for confirmation. Refresh in a moment; you do not need to buy again.</Txt>{link("Check activation", () => void billing.refresh())}</View>}
      {notice && <Txt accessibilityLiveRegion="polite" className="mb-5 text-sm leading-6 text-brand">{notice}</Txt>}
      {billing.error && <View className="mb-4 rounded-2xl bg-panel p-4"><Txt className="text-sm leading-5">{billing.error}</Txt>{link("Refresh subscription status", () => void billing.refresh())}</View>}
      {!billing.isPro && <>
        <Txt weight="bold" className="mb-4 text-xl">Choose your plan</Txt>
        {billing.loading && !billing.offers.length ? <ActivityIndicator color={C.brand} style={{ marginVertical: 24 }} /> : null}
        {billing.offers.map(offer => <MotionPressable key={offer.id} accessibilityRole="radio" accessibilityState={{ selected: selected === offer.id, disabled: billing.busy || billing.pendingActivation }} disabled={billing.busy || billing.pendingActivation} onPress={() => setSelected(offer.id)} className={`mb-3 rounded-[22px] border p-5 ${selected === offer.id ? "border-brand bg-brand/10" : "border-border bg-panel"}`}>
          <View className="flex-row items-center gap-3"><MaterialCommunityIcons name={selected === offer.id ? "radiobox-marked" : "radiobox-blank"} size={24} color={selected === offer.id ? C.brand : C.muted} /><View className="flex-1"><Txt weight="semibold" className="text-base">{offer.title}</Txt><Txt className="mt-1 text-sm text-muted">{offer.price} / {offer.period}</Txt></View></View>
          {offer.intro && <Txt className="mt-3 text-xs leading-5 text-brand">{offer.intro} Then {offer.price} / {offer.period}.</Txt>}
        </MotionPressable>)}
        {!billing.loading && (!billing.configured || !billing.offers.length || billing.storeError) && <Txt className="mb-4 text-sm leading-6 text-muted">{billing.storeError || "Subscriptions are unavailable right now. You can continue using FitSync Free."}</Txt>}
        {(!terms || !privacy) && billing.offers.length > 0 && <Txt className="mb-4 text-sm text-muted">Subscriptions are unavailable right now. Please try again later.</Txt>}
        <PrimaryButton title={billing.pendingActivation ? "Waiting for activation" : chosen ? `Subscribe · ${chosen.price} / ${chosen.period}` : "Plans unavailable"} onPress={buy} loading={billing.busy} disabled={!billing.configured || !billing.storeReady || !chosen || !terms || !privacy || billing.pendingActivation || !!billing.error} />
        {chosen && <Txt className="mt-3 text-center text-xs leading-5 text-muted">{chosen.intro ? "Any eligible offer and its final terms appear in the store confirmation. " : ""}Payment is charged to your store account. Subscription renews automatically at {chosen.price} / {chosen.period} unless cancelled in your store subscription settings before renewal.</Txt>}
      </>}
      <View className="mt-5 flex-row flex-wrap items-center justify-center gap-x-3">
        {link("Restore purchases", restore, billing.busy)}{link("Refresh status", () => void billing.refresh(), billing.busy)}
        {!billing.isPro && link("Manage subscription ↗", () => void run(billing.manage))}
      </View>
      <View className="mt-1 flex-row justify-center gap-6">{terms && <MotionPressable accessibilityRole="link" onPress={() => void run(async () => { await Linking.openURL(terms); })} className="min-h-11 justify-center"><Txt className="text-xs text-muted">Terms of service ↗</Txt></MotionPressable>}{privacy && <MotionPressable accessibilityRole="link" onPress={() => void run(async () => { await Linking.openURL(privacy); })} className="min-h-11 justify-center"><Txt className="text-xs text-muted">Privacy policy ↗</Txt></MotionPressable>}</View>
    </ScrollView>
  </SafeAreaView>;
}
