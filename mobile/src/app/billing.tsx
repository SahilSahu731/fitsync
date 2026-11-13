import React, { useRef, useState } from "react";
import { ActivityIndicator, Image, Linking, Platform, RefreshControl, ScrollView, View } from "react-native";
import { Redirect, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, ArrowUpRight, Check, ChevronRight, Receipt, RefreshCw, ShieldCheck, WalletCards } from "lucide-react-native";
import { useSession } from "@/src/context/session";
import { useBilling } from "@/src/features/billing/billing-context";
import { useAppAlert } from "@/src/components/app-dialog";
import { MotionPressable, ScreenEntrance } from "@/src/components/motion";
import { PrimaryButton, Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";

export default function BillingScreen() {
  const { user } = useSession();
  const billing = useBilling();
  const { alert } = useAppAlert();
  const insets = useSafeAreaInsets();
  const locked = useRef(false);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");
  const run = async (action: () => Promise<void>) => {
    if (locked.current || billing.busy) return;
    locked.current = true; setWorking(true); setNotice("");
    try { await action(); } catch (error) { alert("Could not complete the request", error instanceof Error ? error.message : "Please try again."); }
    finally { locked.current = false; setWorking(false); }
  };
  const restore = async () => {
    const result = await billing.restore();
    setNotice(result === "active" ? "Your Pro membership is restored." : result === "pending" ? "Your purchase is waiting for verification. Refresh shortly; you do not need to buy again." : "No active purchase was found for this store account.");
  };
  const store = Platform.OS === "ios" ? "App Store" : "Google Play";
  const history = Platform.OS === "ios" ? "https://reportaproblem.apple.com" : "https://play.google.com/store/account/orderhistory";
  const payments = Platform.OS === "ios" ? "https://support.apple.com/billing" : "https://play.google.com/store/paymentmethods";
  const busy = working || billing.busy;
  const verifiedFree = !billing.loading && !billing.error && !billing.isPro && !billing.pendingActivation;
  const status = billing.loading ? "Checking membership" : billing.error ? "Status needs verification" : billing.pendingActivation && !billing.isPro ? "Activating your membership" : billing.isPro ? "FitSync Pro" : "FitSync Free";
  const date = billing.entitlement.expiresAt ? new Date(billing.entitlement.expiresAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : null;
  if (!user) return <Redirect href="/(auth)/sign-in" />;
  return <ScreenEntrance style={{ flex: 1 }}><ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 40 }} refreshControl={<RefreshControl refreshing={billing.loading} onRefresh={() => void billing.refresh()} tintColor={C.brand} />}>
    <View className="mb-8 flex-row items-center gap-4"><MotionPressable accessibilityRole="button" accessibilityLabel="Go back" disabled={busy} onPress={() => router.canGoBack() ? router.back() : router.replace("/profile")} className="h-11 w-11 items-center justify-center rounded-full bg-panel"><ArrowLeft size={22} color={C.ink} /></MotionPressable><Txt weight="semibold" className="text-sm">MEMBERSHIP & BILLING</Txt></View>
    <Txt weight="semibold" className="text-[36px] leading-[42px] tracking-tight">Your membership.{`\n`}All in one place.</Txt><Txt className="mb-7 mt-4 text-base leading-6 text-muted">Your plan, renewal details, and store payment settings.</Txt>
    <View className="mb-7 overflow-hidden rounded-[28px] bg-white/5 p-6"><View className="flex-row items-center gap-3"><View className="h-14 w-14 items-center justify-center rounded-2xl bg-bg"><Image source={require("../../assets/images/splash-icon.png")} className="h-14 w-14" resizeMode="contain" /></View><View className="flex-1"><Txt className="text-xs tracking-widest text-muted">YOUR CURRENT PLAN</Txt><Txt accessibilityLiveRegion="polite" weight="semibold" className="mt-1 text-2xl">{status}</Txt></View>{billing.loading ? <ActivityIndicator color={C.ink} /> : billing.isPro && <ShieldCheck color={C.ink} size={26} />}</View>
      {billing.isPro && <View className="mt-5 pt-4"><View className="flex-row items-center justify-between gap-4"><Txt className="text-sm text-muted">{billing.entitlement.willRenew ? "Next renewal" : "Access until"}</Txt><Txt weight="semibold" className="text-sm">{date ?? "No expiry reported"}</Txt></View><Txt className="mt-3 text-sm leading-6 text-muted">{billing.entitlement.willRenew ? "Your store handles renewal and payment confirmation." : "Renewal is off. Access continues until the verified expiry date."}</Txt>{billing.entitlement.sandbox && <Txt className="mt-3 text-xs text-ink">Sandbox membership · test purchase</Txt>}</View>}
      {verifiedFree && <Txt className="mt-4 text-sm leading-6 text-muted">Workouts, daily tracking, and progress stay free. Pro adds personal plan adjustments, progression reviews, and meal planning.</Txt>}
      {billing.pendingActivation && !billing.isPro && <Txt className="mt-4 text-sm leading-6">Your store purchase was received. Verification is still pending. Refresh your status before trying another purchase.</Txt>}
      <View className="mt-5"><PrimaryButton title={billing.isPro ? "Manage or cancel membership" : billing.pendingActivation || billing.error || billing.loading ? "Refresh membership status" : "Explore FitSync Pro"} disabled={busy} onPress={() => billing.isPro ? void run(billing.manage) : billing.pendingActivation || billing.error || billing.loading ? void billing.refresh() : router.push("/pro")} /></View>
    </View>
    {!!billing.error && <View className="mb-5 rounded-2xl p-4"><Txt className="text-sm leading-6">{billing.error}</Txt><Txt className="mt-2 text-xs text-muted">We could not verify current membership details. Pull down to retry.</Txt></View>}
    <Txt weight="semibold" className="mb-4 text-xl">Payments & account</Txt>
    <View className="overflow-hidden rounded-[24px] bg-panel">{[
      { title: "Restore purchases", detail: "Reconnect a purchase from your store account", Icon: RefreshCw, action: restore },
      { title: "Receipts & order history", detail: `Open your ${store} purchase history`, Icon: Receipt, action: () => Linking.openURL(history), external: true },
      { title: "Payment methods", detail: `Update payment details through ${store}`, Icon: WalletCards, action: () => Linking.openURL(payments), external: true },
      { title: "Manage subscriptions", detail: "Review renewal, cancellation, or payment issues", Icon: ShieldCheck, action: billing.manage, external: true },
    ].map(({ title, detail, Icon, action, external }, index) => <MotionPressable accessibilityRole="button" key={title} disabled={busy} onPress={() => void run(action)} className={`min-h-20 flex-row items-center gap-4 p-5 ${index < 3 ? " " : ""}`}><Icon size={23} color={C.ink} /><View className="flex-1"><Txt weight="semibold" className="text-base">{title}</Txt><Txt className="mt-1 text-xs leading-5 text-muted">{detail}</Txt></View>{external ? <ArrowUpRight color={C.muted} size={19} /> : <ChevronRight color={C.muted} size={20} />}</MotionPressable>)}</View>
    {!!notice && <View accessibilityLiveRegion="polite" className="mt-5 flex-row gap-3 rounded-2xl bg-white/5 p-4"><Check color={C.ink} size={20} /><Txt className="flex-1 text-sm leading-6">{notice}</Txt></View>}
    {!billing.storeReady && !!billing.storeError && <Txt className="mt-5 text-sm leading-6 text-muted">{billing.storeError}</Txt>}
    <View className="mt-7 flex-row items-start gap-3"><ShieldCheck size={20} color={C.muted} /><Txt className="flex-1 text-xs leading-5 text-muted">Payments are confirmed by your app store. FitSync does not collect card details. Prices and receipts are shown by the store; membership access is verified by the FitSync server.</Txt></View>
  </ScrollView></ScreenEntrance>;
}
