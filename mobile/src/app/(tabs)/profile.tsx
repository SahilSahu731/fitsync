import { TabScrollView } from "@/src/components/tab-bar-motion";
import React, { useState } from "react";
import { ActivityIndicator, Image, View } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable as Pressable, ScreenEntrance } from "@/src/components/motion";
import { useAppAlert } from "@/src/components/app-dialog";
import { PageHeading, SectionHeading, Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { useSession } from "@/src/context/session";
import { useBilling } from "@/src/features/billing/billing-context";
import { weightValue } from "@/src/features/progress/model";

type Setting = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  title: string;
  subtitle: string;
  route:
    | "/calendar"
    | "/coach"
    | "/health-sync"
    | "/wellness"
    | "/edit-profile"
    | "/settings"
    | "/billing";
};
function SettingRow({ item, onPress }: { item: Setting; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="min-h-20 flex-row items-center gap-4 py-5"
    >
      <MaterialCommunityIcons name={item.icon} size={23} color={C.muted} />
      <View className="min-w-0 flex-1">
        <Txt weight="medium" className="text-sm">
          {item.title}
        </Txt>
        <Txt className="mt-1 text-xs leading-5 text-muted">{item.subtitle}</Txt>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={19} color={C.muted} />
    </Pressable>
  );
}
const groups: { title: string; items: Setting[] }[] = [
  {
    title: "Your everyday",
    items: [
      {
        icon: "calendar-month-outline",
        title: "Training calendar",
        subtitle: "The week ahead, and the work you’ve done",
        route: "/calendar",
      },
      {
        icon: "calendar-check-outline",
        title: "Your personal plan",
        subtitle: "Built around your goal, time and equipment",
        route: "/coach",
      },
      {
        icon: "heart-pulse",
        title: "Connected health",
        subtitle: "Import steps, sleep and weight on your terms",
        route: "/health-sync",
      },
      {
        icon: "food-apple-outline",
        title: "Meals & accountability",
        subtitle: "Meal ideas, shopping lists and commitments",
        route: "/wellness",
      },
    ],
  },
  {
    title: "Make it yours",
    items: [
      {
        icon: "account-edit-outline",
        title: "Personal information",
        subtitle: "Your photo, details and fitness profile",
        route: "/edit-profile",
      },
      {
        icon: "cog-outline",
        title: "Settings & preferences",
        subtitle: "Units, reminders, sound and app experience",
        route: "/settings",
      },
      {
        icon: "credit-card-outline",
        title: "Membership & billing",
        subtitle: "Your subscription and store settings",
        route: "/billing",
      },
    ],
  },
];

export default function ProfileScreen() {
  const Alert = useAppAlert();
  const router = useRouter();
  const { user, profile, settings, signOut } = useSession();
  const { isPro } = useBilling();
  const [busy, setBusy] = useState(false);
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  const unit = settings?.weightUnit ?? "kg";
  const goals: Record<string, string> = {
    muscle: "Build muscle",
    strength: "Get stronger",
    fat_loss: "Lose body fat",
    fitness: "Feel fitter",
  };
  const logout = () =>
    Alert.alert("Sign out?", "Your account and saved progress will be here when you return.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        onPress: async () => {
          setBusy(true);
          try {
            await signOut();
            router.replace("/(auth)/sign-in");
          } catch (error) {
            Alert.alert(
              "Could not sign out",
              error instanceof Error ? error.message : "Please try again.",
            );
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  return (
    <ScreenEntrance className="flex-1 bg-bg">
      <TabScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="w-full max-w-2xl self-center px-6 pt-6 pb-44"
      >
        <PageHeading
          eyebrow="A little more you"
          title="Your FitSync."
          action={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open settings"
              onPress={() => router.push("/settings")}
              className="h-12 w-12 items-center justify-center rounded-full bg-panel"
            >
              <MaterialCommunityIcons name="cog-outline" size={23} color={C.ink} />
            </Pressable>
          }
        />
        <View className="mb-8 flex-row items-center gap-5">
          <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-elevated">
            {user?.avatarUrl && failedAvatar !== user.avatarUrl ? (
              <Image
                source={{ uri: user.avatarUrl }}
                onError={() => setFailedAvatar(user.avatarUrl ?? null)}
                className="h-full w-full"
                resizeMode="cover"
              />
            ) : (
              <Txt weight="medium" className="text-3xl">
                {(user?.name || "A")[0].toUpperCase()}
              </Txt>
            )}
          </View>
          <View className="min-w-0 flex-1">
            <Txt weight="medium" className="text-2xl leading-8 tracking-[-0.7px]">
              {user?.name || "Athlete"}
            </Txt>
            <Txt numberOfLines={1} className="mt-1 text-xs text-muted">
              {user?.email}
            </Txt>
            <View className="mt-3 flex-row items-center gap-2">
              <View className={`h-1.5 w-1.5 rounded-full ${isPro ? "bg-brand" : "bg-white/50"}`} />
              <Txt weight="medium" className="text-[11px] tracking-[1px] text-muted">
                {isPro ? "FITSYNC PRO" : "FITSYNC ATHLETE"}
              </Txt>
            </View>
          </View>
        </View>
        {!!user?.bio && <Txt className="mb-6 text-sm leading-6 text-muted">{user.bio}</Txt>}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/edit-profile")}
          className="min-h-12 flex-row items-center justify-center gap-3 rounded-full bg-panel"
        >
          <Txt weight="medium" className="text-xs">
            Edit your profile
          </Txt>
          <MaterialCommunityIcons name="arrow-top-right" size={16} color={C.ink} />
        </Pressable>
        <View className="mt-9">
          <SectionHeading title="Your starting point" />
          <View className="flex-row gap-3">
            {[
              {
                value: profile?.weightKg
                  ? weightValue(profile.weightKg, unit).toLocaleString(undefined, {
                      maximumFractionDigits: 1,
                    })
                  : "—",
                label: `Weight · ${unit}`,
              },
              { value: profile?.heightCm?.toString() || "—", label: "Height · cm" },
              { value: profile?.trainingDays?.toString() || "—", label: "Days / week" },
            ].map((stat) => (
              <View key={stat.label} className="min-w-0 flex-1 rounded-2xl bg-panel px-4 py-5">
                <Txt
                  weight="medium"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  className="text-[26px] tracking-[-1px]"
                >
                  {stat.value}
                </Txt>
                <Txt className="mt-2 text-[11px] text-muted">{stat.label}</Txt>
              </View>
            ))}
          </View>
          <View className="mt-3 flex-row items-center gap-4 rounded-2xl bg-panel px-5 py-5">
            <MaterialCommunityIcons name="bullseye-arrow" size={25} color={C.muted} />
            <View className="flex-1">
              <Txt className="text-[11px] text-muted">The direction you chose</Txt>
              <Txt weight="medium" className="mt-1 text-base">
                {goals[profile?.goal || "fitness"] ?? "Your fitness, your way"}
              </Txt>
            </View>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/pro")}
          className="mt-8 rounded-[28px] bg-ink p-6"
        >
          <View className="flex-row items-center justify-between">
            <Txt weight="medium" className="text-[11px] tracking-[1.5px] text-black/60">
              FITSYNC PRO
            </Txt>
            <MaterialCommunityIcons name="star-four-points-outline" size={23} color={C.bg} />
          </View>
          <Txt weight="medium" className="mt-5 text-2xl leading-8 tracking-[-0.7px] text-black">
            {isPro ? "A little more flexibility." : "Room for real life."}
          </Txt>
          <Txt className="mt-3 text-xs leading-6 text-black/60">
            {isPro
              ? "Your membership helps your plan adapt with you."
              : "Adapt your plan, move a missed session and find your next step."}
          </Txt>
          <View className="mt-5 flex-row items-center gap-2">
            <Txt weight="semibold" className="text-xs text-black">
              {isPro ? "Your Pro membership" : "Explore the possibilities"}
            </Txt>
            <MaterialCommunityIcons name="arrow-top-right" size={16} color={C.bg} />
          </View>
        </Pressable>
        {groups.map((group) => (
          <View key={group.title} className="mt-9">
            <SectionHeading title={group.title} />
            <View className="rounded-[28px] bg-panel px-5">
              {group.items.map((item) => (
                <SettingRow key={item.route} item={item} onPress={() => router.push(item.route)} />
              ))}
            </View>
          </View>
        ))}
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          accessibilityState={{ disabled: busy, busy }}
          onPress={logout}
          className="mt-9 min-h-14 flex-row items-center justify-center gap-3 rounded-full bg-panel"
        >
          {busy ? (
            <ActivityIndicator color={C.ink} />
          ) : (
            <MaterialCommunityIcons name="logout" size={18} color={C.muted} />
          )}
          <Txt weight="medium" className="text-sm text-muted">
            {busy ? "Signing out…" : "Sign out"}
          </Txt>
        </Pressable>
        <Txt className="mt-7 text-center text-[11px] text-muted">
          Your training. Your habits. In sync.
        </Txt>
      </TabScrollView>
    </ScreenEntrance>
  );
}
