import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable as Pressable, ScreenEntrance } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { useSession } from "@/src/context/session";
import { C } from "@/src/constants/theme";
import { useBilling } from "./billing-context";
import { revenueCatKey } from "./native";
import { legalUrl } from "./model";
import { presentPlans, selectedPlan } from "./plan-presentation";
import { ProFeatureArt } from "./pro-feature-art";
import { PRO_BENEFITS, PRO_COMPARISON, PRO_FAQS } from "./pro-marketing-content";

type Work = "purchase" | "restore" | "refresh" | "manage";

function TextAction({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className="min-h-11 items-center justify-center px-3"
    >
      <Txt weight="medium" className="text-xs text-brand">
        {label}
      </Txt>
    </Pressable>
  );
}

function ComparisonValue({ value, pro = false }: { value: string | boolean; pro?: boolean }) {
  return (
    <View className="w-[72px] items-center justify-center px-1 py-4">
      {typeof value === "boolean" ? (
        <MaterialCommunityIcons
          name={value ? "check" : "minus"}
          size={22}
          color={value ? (pro ? "yellow" : C.ink) : "#606660"}
        />
      ) : (
        <Txt
          weight={pro ? "medium" : "regular"}
          className={`text-center text-[11px] leading-5 ${pro ? "text-yellow-400" : "text-muted"}`}
        >
          {value}
        </Txt>
      )}
    </View>
  );
}

export function ProScreen({ embedded = false }: { embedded?: boolean } = {}) {
  const { user } = useSession();
  return <ProMarketingPage key={user?.id ?? "guest"} embedded={embedded} />;
}

function ProMarketingPage({ embedded }: { embedded: boolean }) {
  const billing = useBilling();
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const [selection, setSelection] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [dockHeight, setDockHeight] = useState(310);
  const [working, setWorking] = useState<Work | null>(null);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);
  const locked = useRef(false);
  const website = legalUrl(process.env.EXPO_PUBLIC_WEB_URL);
  const terms =
    legalUrl(process.env.EXPO_PUBLIC_TERMS_URL) ??
    (website ? new URL("/terms", website).toString() : null);
  const privacy =
    legalUrl(process.env.EXPO_PUBLIC_PRIVACY_URL) ??
    (website ? new URL("/privacy", website).toString() : null);
  const testStoreCheckout = __DEV__ && revenueCatKey()?.startsWith("test_") === true;
  const legalReady = Boolean(terms && privacy) || testStoreCheckout;
  const plans = presentPlans(billing.offers, Platform.OS);
  const chosen = selectedPlan(plans, selection);
  const busy = working !== null || billing.busy;
  const inlineDock = height < 660 || fontScale > 1.25;
  const contentWidth = Math.min(width, 640) - 40;
  const cardWidth = Math.max(
    106,
    (contentWidth - (Math.min(plans.length, 3) - 1) * 10) / Math.max(1, Math.min(plans.length, 3)),
  );
  const canPurchase =
    !busy &&
    !billing.loading &&
    !billing.isPro &&
    !billing.pendingActivation &&
    !billing.error &&
    billing.configured &&
    billing.storeReady &&
    Boolean(chosen && legalReady);
  const plansUnavailable = !billing.storeReady || !plans.length;
  const checkoutSetupMissing = !billing.configured || !legalReady;
  const unavailable = !billing.loading && (plansUnavailable || checkoutSetupMissing);
  const close = () => {
    if (busy) return;
    if (!embedded && router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  };
  async function run(kind: Work, action: () => Promise<void>) {
    if (locked.current || billing.busy) return;
    locked.current = true;
    setWorking(kind);
    setNotice(null);
    try {
      await action();
    } catch (error) {
      setNotice({
        error: true,
        text:
          error instanceof Error
            ? error.message
            : "Could not complete the request. Please try again.",
      });
    } finally {
      locked.current = false;
      setWorking(null);
    }
  }
  const refresh = () => void run("refresh", billing.refresh);
  const restore = () =>
    void run("restore", async () => {
      const result = await billing.restore();
      setNotice({
        error: false,
        text:
          result === "active"
            ? "Your Pro membership is restored. You’re all set."
            : result === "pending"
              ? "Your purchase is waiting for verification. Check your status before buying again."
              : "No active purchase was found for this store account. Check that you’re using the same FitSync and store accounts as before.",
      });
    });
  const buy = () => {
    if (!canPurchase || !chosen) return;
    void run("purchase", async () => {
      const result = await billing.purchase(chosen.offer.id);
      if (result !== "cancelled")
        setNotice({
          error: false,
          text:
            result === "active"
              ? "Welcome to FitSync Pro. Your next chapter starts here."
              : "Purchase received. We’re verifying your membership. You do not need to purchase again.",
        });
    });
  };
  const primaryTitle =
    working === "purchase"
      ? "Opening checkout…"
      : working === "restore"
        ? "Restoring purchases…"
        : working === "refresh" || billing.loading
          ? "Checking membership…"
          : billing.isPro
            ? "Open your Pro workspace"
            : billing.pendingActivation
              ? "Check activation"
              : billing.error
                ? "Retry membership check"
                : plansUnavailable
                  ? "Refresh plans"
                  : checkoutSetupMissing
                    ? "Checkout unavailable"
                    : chosen
                      ? chosen.oneTime
                        ? "Get lifetime Pro"
                        : `Continue with ${chosen.title.toLowerCase()}`
                      : "Choose a plan";
  const primaryAction = billing.isPro
    ? () => router.replace("/(tabs)/pro")
    : billing.pendingActivation || billing.error || plansUnavailable
      ? refresh
      : buy;
  const primaryDisabled =
    busy ||
    billing.loading ||
    (!billing.isPro &&
      !billing.pendingActivation &&
      !billing.error &&
      !plansUnavailable &&
      !canPurchase);

  const dock = (
    <View
      onLayout={(event) => {
        const next = Math.ceil(event.nativeEvent.layout.height);
        setDockHeight((previous) => (previous === next ? previous : next));
      }}
      className={`border-t border-white/10 bg-bg ${inlineDock ? "mt-5" : "absolute inset-x-0 bottom-0"}`}
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      <View className="w-full max-w-[640px] self-center px-5 pt-4">
        {!billing.isPro &&
          !billing.pendingActivation &&
          (billing.loading && !plans.length ? (
            <View accessibilityLabel="Loading subscription plans" className="mb-4 flex-row gap-3">
              <View className="h-28 flex-1 rounded-[20px] bg-panel" />
              <View className="h-28 flex-1 rounded-[20px] bg-panel" />
            </View>
          ) : plans.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingBottom: 4 }}
              className="mb-3"
              accessibilityLabel="Subscription plans"
            >
              {plans.map((plan) => {
                const active = chosen?.offer.id === plan.offer.id;
                return (
                  <Pressable
                    key={plan.offer.id}
                    accessibilityRole="radio"
                    accessibilityLabel={`${plan.title}, ${plan.offer.price}, ${plan.cadence}${plan.savings ? `, save ${plan.savings} percent versus monthly` : ""}`}
                    accessibilityState={{ checked: active, disabled: busy || billing.loading }}
                    disabled={busy || billing.loading}
                    onPress={() => setSelection(plan.offer.id)}
                    className={`overflow-hidden rounded-[20px] border-2 ${active ? "border-brand bg-[#171C12]" : "border-[#202020] bg-[#191919]"}`}
                    style={{ width: cardWidth }}
                  >
                    <View
                      className={`min-h-6 items-center justify-center px-1 ${active ? "bg-brand" : "bg-transparent"}`}
                    >
                      <Txt
                        weight="medium"
                        className={`text-[9px] ${active ? "text-bg" : "text-muted"}`}
                      >
                        {plan.savings
                          ? `Save ${plan.savings}%`
                          : plan.months === 12
                            ? "A year of possibility"
                            : plan.oneTime
                              ? "One-time purchase"
                              : "Flexible billing"}
                      </Txt>
                    </View>
                    <View className="items-center px-2 pb-4 pt-2.5">
                      <Txt weight="medium" className="text-sm">
                        {plan.title}
                      </Txt>
                      <Txt
                        weight="semibold"
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        className="mt-2 text-[23px] leading-8 tracking-[-0.7px]"
                      >
                        {plan.offer.price}
                      </Txt>
                      <Txt className="mt-1 text-center text-[10px] leading-4 text-muted">
                        {plan.cadence}
                      </Txt>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <Txt className="mb-3 text-center text-xs leading-5 text-muted">
              {billing.storeError ||
                "Plans are temporarily unavailable. Your free training stays here."}
            </Txt>
          ))}
        {billing.pendingActivation && !billing.isPro && (
          <Txt className="mb-3 text-center text-xs leading-5 text-muted">
            Purchase received. Check your activation before buying again.
          </Txt>
        )}
        {billing.error && !billing.pendingActivation && !billing.isPro && (
          <Txt className="mb-3 text-center text-xs leading-5 text-muted">
            We couldn’t verify your membership. Refresh to try again.
          </Txt>
        )}
        {unavailable &&
          plans.length > 0 &&
          !billing.error &&
          !billing.pendingActivation &&
          !billing.isPro && (
            <Txt className="mb-3 text-center text-xs leading-5 text-muted">
              {billing.storeError ||
                (checkoutSetupMissing
                  ? "Your plans are loaded, but checkout is not available yet. You can continue using FitSync Free."
                  : "Subscriptions are temporarily unavailable. Refresh to try again.")}
            </Txt>
          )}
        {chosen?.offer.intro && !billing.isPro && !billing.pendingActivation && (
          <Txt className="mb-3 text-center text-[10px] leading-4 text-muted">
            {chosen.offer.intro} Then {chosen.offer.price} / {chosen.offer.period}.
          </Txt>
        )}
        {notice && (
          <View accessibilityLiveRegion="polite" className="mb-3 rounded-xl bg-white/5 p-3">
            <Txt
              className="text-center text-xs leading-5"
              style={{ color: notice.error ? "#FFB4A8" : C.brand }}
            >
              {notice.text}
            </Txt>
          </View>
        )}
        {testStoreCheckout && !billing.isPro && (
          <Txt className="mb-3 text-center text-xs leading-5 text-brand">
            Test checkout · No real charges
          </Txt>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: primaryDisabled, busy }}
          disabled={primaryDisabled}
          onPress={primaryAction}
          className="min-h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3.5"
          style={{ opacity: primaryDisabled ? 0.55 : 1 }}
        >
          {busy && <ActivityIndicator size="small" color={C.bg} />}
          <Txt weight="semibold" className="text-center text-sm text-bg">
            {primaryTitle}
          </Txt>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={close}
          className="min-h-11 items-center justify-center"
        >
          <Txt weight="medium" className="text-xs text-brand">
            {billing.isPro ? "Go back" : "Not now"}
          </Txt>
        </Pressable>
        <Txt className="text-center text-[10px] leading-4 text-muted">
          {billing.isPro
            ? "Your training. A level deeper."
            : chosen?.oneTime
              ? "Pay once. No automatic renewal."
              : "Cancel renewal anytime through your store."}
        </Txt>
      </View>
    </View>
  );

  return (
    <ScreenEntrance className="flex-1 bg-bg">
      <View className="w-full max-w-[640px] self-center flex-row items-center justify-between px-4 py-2">
        <View className="h-11 w-11" />
        <View className="flex-row items-center gap-2">
          <Txt weight="semibold" className="text-[22px] tracking-[-0.5px]">
            FITSYNC
          </Txt>
          <View className="rounded-3xl bg-yellow-400 px-2.5 py-1">
            <Txt weight="semibold" className="text-[11px] text-bg">
              PRO
            </Txt>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close Pro page"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={close}
          className="h-11 w-11 items-center justify-center"
        >
          <MaterialCommunityIcons name="close" color={C.ink} size={24} />
        </Pressable>
      </View>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={billing.loading} onRefresh={refresh} tintColor={C.brand} />
        }
        contentContainerStyle={{ paddingBottom: inlineDock ? 0 : dockHeight + 24 }}
      >
        <View className="w-full max-w-[640px] self-center px-5">
          <View className="pb-5 pt-3">
            <Txt
              accessibilityRole="header"
              weight="semibold"
              className="text-center text-[28px] leading-[38px] tracking-[-0.9px]"
            >
              Get more out of{"\n"}every workout.
            </Txt>
            <Txt className="mt-3 px-3 text-center text-[12px] leading-6 text-muted">
              Your effort deserves the full picture.
            </Txt>
          </View>
          {billing.isPro && (
            <View className="mb-3 mt-3 rounded-[24px] border border-brand/20 bg-brand/5 p-5">
              <View className="flex-row items-center gap-2">
                <MaterialCommunityIcons name="check-decagram" size={23} color={C.brand} />
                <Txt weight="medium" className="text-base">
                  You’re already Pro.
                </Txt>
              </View>
              <Txt className="mt-2 text-xs leading-6 text-muted">
                {billing.entitlement.expiresAt
                  ? `${billing.entitlement.willRenew ? "Renews" : "Access until"} ${new Date(billing.entitlement.expiresAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}.`
                  : "All your Pro tools are ready in your workspace."}
              </Txt>
              <TextAction
                label="Manage membership"
                disabled={busy}
                onPress={() => void run("manage", billing.manage)}
              />
            </View>
          )}
          {billing.loading && (
            <View
              accessibilityLiveRegion="polite"
              className="mb-2 flex-row items-center justify-center gap-2"
            >
              <ActivityIndicator size="small" color={C.brand} />
              <Txt className="text-[11px] text-muted">Checking your membership…</Txt>
            </View>
          )}
          {PRO_BENEFITS.map((benefit) => (
            <View
              key={benefit.title}
              className="min-h-[154px] flex-row items-center gap-5 border-b border-white/10 py-7"
            >
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <ProFeatureArt kind={benefit.art} width={width < 360 ? 88 : 110} />
              </View>
              <View className="min-w-0 flex-1">
                <Txt weight="medium" className="text-[16px] leading-6 tracking-[-0.3px]">
                  {benefit.title}
                </Txt>
                <Txt className="mt-1.5 text-[13px] leading-[22px] text-muted">
                  {benefit.description}
                </Txt>
              </View>
            </View>
          ))}

          <View className="py-10">
            <Txt weight="medium" className="text-center text-[22px] leading-8 tracking-[-0.5px]">
              More insight. More direction.
            </Txt>
            <Txt className="mt-3 px-3 text-center text-[13px] leading-6 text-muted">
              Spend less time figuring out what’s next.{"\n"}More time making it happen.
            </Txt>
            <View className="mt-6 flex-row items-center justify-center gap-2">
              <MaterialCommunityIcons name="heart" size={18} color={"red"} />
              <Txt className="text-[12px] text-muted">
                Your membership helps FitSync keep growing.
              </Txt>
            </View>
          </View>

          <View className="pb-9">
            <Txt
              accessibilityRole="header"
              weight="medium"
              className="mb-6 text-center text-[22px] tracking-[-0.5px]"
            >
              Find your fit.
            </Txt>
            <View className="flex-row items-center border-b border-white/10 pb-2">
              <Txt className="flex-1 text-[11px] text-muted">What’s included</Txt>
              <View className="w-[72px] items-center">
                <Txt weight="medium" className="text-sm">
                  Free
                </Txt>
              </View>
              <View className="w-[72px] items-center">
                <View className="rounded-full bg-yellow-400/10 px-3 py-1">
                  <Txt weight="semibold" className="text-sm text-yellow-400">
                    Pro
                  </Txt>
                </View>
              </View>
            </View>
            {PRO_COMPARISON.map((row) => (
              <View
                key={row.feature}
                accessible
                accessibilityLabel={`${row.feature}. Free: ${row.free === true ? "Included" : row.free === false ? "Not included" : row.free}. Pro: ${row.pro === true ? "Included" : row.pro === false ? "Not included" : row.pro}`}
                className="min-h-14 flex-row items-center border-b border-white/5"
              >
                <Txt className="flex-1 pr-2 text-xs leading-5">{row.feature}</Txt>
                <ComparisonValue value={row.free} />
                <ComparisonValue value={row.pro} pro />
              </View>
            ))}
            <Txt className="mt-4 text-center text-[11px] leading-5 text-muted">
              A useful free app. More possibilities with Pro.
            </Txt>
          </View>

          <View className="pb-8">
            <Txt
              accessibilityRole="header"
              weight="medium"
              className="mb-6 text-center text-[22px] tracking-[-0.5px]"
            >
              A few good questions.
            </Txt>
            <View className="gap-3">
              {PRO_FAQS.map((faq, index) => (
                <View key={faq.question} className="overflow-hidden rounded-[20px] bg-[#191919]">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: expanded === index }}
                    onPress={() => setExpanded(expanded === index ? null : index)}
                    className="min-h-16 flex-row items-center gap-3 px-5 py-5"
                  >
                    <Txt weight="medium" className="flex-1 text-[13px] leading-6">
                      {faq.question}
                    </Txt>
                    <MaterialCommunityIcons
                      name={expanded === index ? "chevron-up" : "chevron-down"}
                      color={C.ink}
                      size={22}
                    />
                  </Pressable>
                  {expanded === index && (
                    <Txt className="px-5 pb-5 text-xs leading-6 text-muted">{faq.answer}</Txt>
                  )}
                </View>
              ))}
            </View>
          </View>

          <View className="border-t border-white/10 py-7">
            <Txt className="text-center text-[11px] leading-6 text-muted">
              {chosen
                ? chosen.oneTime
                  ? `Lifetime Pro is a one-time purchase of ${chosen.offer.price}, charged to your store account. It does not renew automatically. Your store confirms the final terms before purchase.`
                  : `Payment is charged to your store account. Your subscription renews automatically at ${chosen.offer.price} / ${chosen.offer.period} unless you cancel renewal in your store settings before the next billing period. ${chosen.offer.intro ? "Eligible introductory offers and final terms appear in the store confirmation." : ""}`
                : "Available subscription prices and billing periods appear above when plans are loaded. Your app store confirms the final terms before purchase."}
            </Txt>
            <View className="mt-4">
              <TextAction
                label={working === "restore" ? "Restoring purchases…" : "Restore purchases"}
                disabled={busy}
                onPress={restore}
              />
              <TextAction
                label="Membership & billing"
                disabled={busy}
                onPress={() => router.push("/billing")}
              />
            </View>
            <View className="mt-1 flex-row flex-wrap justify-center gap-x-3">
              {privacy && (
                <TextAction
                  label="Privacy policy ↗"
                  disabled={busy}
                  onPress={() =>
                    void run("manage", async () => {
                      await Linking.openURL(privacy);
                    })
                  }
                />
              )}
              {terms && (
                <TextAction
                  label="Terms of service ↗"
                  disabled={busy}
                  onPress={() =>
                    void run("manage", async () => {
                      await Linking.openURL(terms);
                    })
                  }
                />
              )}
            </View>
          </View>
        </View>
        {inlineDock && dock}
      </ScrollView>
      {!inlineDock && dock}
    </ScreenEntrance>
  );
}
