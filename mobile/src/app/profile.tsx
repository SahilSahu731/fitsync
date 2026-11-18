import React, { useMemo, useState } from "react";
import { ActivityIndicator, Image, RefreshControl, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable as Pressable, ScreenEntrance } from "@/src/components/motion";
import { TabScrollView } from "@/src/components/tab-bar-motion";
import { useAppAlert } from "@/src/components/app-dialog";
import { SectionHeading, Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { useSession } from "@/src/context/session";
import { useBilling } from "@/src/features/billing/billing-context";
import { useProgress } from "@/src/features/progress/use-progress";
import { dateLabel, localDate, weightValue } from "@/src/features/progress/model";
import { homeSnapshot } from "@/src/features/home/model";
import { useWorkout } from "@/src/features/workouts/workout-context";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
const GOALS = {
  muscle: "Build muscle",
  strength: "Get stronger",
  fat_loss: "Lose body fat",
  fitness: "Feel fitter",
};
const EXPERIENCE = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };
const EQUIPMENT = { gym: "Full gym", dumbbells: "Dumbbells", bodyweight: "Bodyweight" };
const NAVIGATION: {
  title: string;
  items: { icon: IconName; title: string; subtitle: string; route: Href }[];
}[] = [
  {
    title: "Your training",
    items: [
      {
        icon: "bullseye-arrow",
        title: "Goals",
        subtitle: "Your weekly targets & daily habits",
        route: "/goals",
      },
      {
        icon: "calendar-month-outline",
        title: "Training calendar",
        subtitle: "Your schedule and the work you’ve done",
        route: "/calendar",
      },
      {
        icon: "chart-line",
        title: "Progress journal",
        subtitle: "Training, measurements & milestones",
        route: "/(tabs)/progress",
      },
      {
        icon: "star-four-points-outline",
        title: "Personal coach",
        subtitle: "A plan around your time and equipment",
        route: "/coach",
      },
    ],
  },
  {
    title: "Health & everyday",
    items: [
      {
        icon: "account-heart-outline",
        title: "Companion",
        subtitle: "Daily check-ins, focus & reminders",
        route: "/companion",
      },
      {
        icon: "heart-pulse",
        title: "Connected health",
        subtitle: "Manage steps, sleep & weight imports",
        route: "/health-sync",
      },
      {
        icon: "food-apple-outline",
        title: "Meals & accountability",
        subtitle: "Meal ideas, shopping lists & commitments",
        route: "/wellness",
      },
    ],
  },
];

function Icon({
  name,
  size = 20,
  color = C.ink,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View className="min-w-0 flex-1 items-center px-1">
      <Txt
        weight="medium"
        numberOfLines={1}
        adjustsFontSizeToFit
        className="text-[25px] tracking-[-0.7px]"
      >
        {value}
      </Txt>
      <Txt className="mt-1 text-center text-[10px] text-muted">{label}</Txt>
    </View>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-4 py-3">
      <Txt className="flex-1 text-xs text-muted">{label}</Txt>
      <Txt weight="medium" className="max-w-[60%] text-right text-xs">
        {value}
      </Txt>
    </View>
  );
}
function NavRow({
  icon,
  title,
  subtitle,
  onPress,
  last = false,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      className={`min-h-20 flex-row items-center gap-3 py-4 ${last ? "" : "border-b border-white/5"}`}
    >
      <View className="h-10 w-10 items-center justify-center rounded-2xl bg-elevated">
        <Icon name={icon} size={21} color={C.brand} />
      </View>
      <View className="min-w-0 flex-1">
        <Txt weight="medium" className="text-sm">
          {title}
        </Txt>
        <Txt className="mt-1 text-[11px] leading-5 text-muted">{subtitle}</Txt>
      </View>
      <Icon name="chevron-right" size={20} color={C.muted} />
    </Pressable>
  );
}
function duration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  if (seconds > 0 && minutes === 0) return "<1m";
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ""}`;
}

export default function ProfileScreen() {
  const router = useRouter();
  const Alert = useAppAlert();
  const { user, profile, settings, signOut } = useSession();
  const billing = useBilling();
  const progress = useProgress();
  const { session } = useWorkout();
  const [busy, setBusy] = useState(false);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const name = user?.name.trim() || "Your profile";
  const initials =
    user?.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "FS";
  const today = localDate();
  const snapshot = useMemo(
    () => homeSnapshot(progress.journal.workouts, progress.journal.events, today),
    [progress.journal.workouts, progress.journal.events, today],
  );
  const timed = snapshot.completed.filter(
    (item) =>
      item.elapsed_seconds != null &&
      Number.isFinite(item.elapsed_seconds) &&
      item.elapsed_seconds >= 0,
  );
  const recordedSeconds = timed.reduce((total, item) => total + (item.elapsed_seconds ?? 0), 0);
  const loggedSets = snapshot.completed.reduce(
    (total, item) =>
      total +
      item.workout_session_exercises.reduce(
        (count, exercise) =>
          count + exercise.workout_logged_sets.filter((set) => set.completed_at).length,
        0,
      ),
    0,
  );
  const progressError = progress.workoutError || progress.storageError || progress.syncError;
  const statsUnavailable =
    progress.loading ||
    Boolean(progress.storageError) ||
    (Boolean(progress.workoutError) && snapshot.completed.length === 0);
  const unit = settings?.weightUnit ?? "kg";
  const weightKg = snapshot.weight?.value ?? profile?.weightKg;
  const weight =
    weightKg != null && Number.isFinite(weightKg) && weightKg > 0
      ? `${weightValue(weightKg, unit).toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unit}`
      : "—";
  const height = profile && profile.heightCm > 0 ? `${profile.heightCm} cm` : "—";
  const joined =
    user?.createdAt && Number.isFinite(Date.parse(user.createdAt))
      ? new Date(user.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })
      : null;
  const memberLabel = billing.loading
    ? "CHECKING MEMBERSHIP"
    : billing.isPro
      ? "PRO MEMBER"
      : billing.pendingActivation
        ? "ACTIVATION PENDING"
        : billing.error
          ? "CHECK MEMBERSHIP"
          : "FITSYNC ATHLETE";
  function logout() {
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
  }

  return (
    <ScreenEntrance className="flex-1 bg-bg">
      <TabScrollView
        className="flex-1"
        contentContainerClassName={`w-full max-w-2xl self-center px-6 pt-6 ${session ? "pb-48" : "pb-16"}`}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={progress.refreshing && !progress.loading}
            onRefresh={() => void progress.refresh()}
            tintColor={C.brand}
          />
        }
      >
        <View className="mb-7 flex-row items-center justify-between gap-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
            className="h-11 w-11 items-center justify-center rounded-full bg-panel"
          >
            <Icon name="arrow-left" size={21} />
          </Pressable>
          <Txt accessibilityRole="header" weight="medium" className="flex-1 text-center text-lg">
            Your profile.
          </Txt>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            onPress={() => router.push("/settings")}
            className="h-11 w-11 items-center justify-center rounded-full bg-panel"
          >
            <Icon name="cog-outline" size={22} />
          </Pressable>
        </View>

        <View className="overflow-hidden rounded-[28px] border border-white/10 bg-panel">
          <View className="p-5 pt-6">
            <View className="flex-row items-center gap-4">
              <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-brand bg-elevated">
                {user?.avatarUrl && failedAvatarUrl !== user.avatarUrl ? (
                  <Image
                    source={{ uri: user.avatarUrl }}
                    resizeMode="cover"
                    className="h-full w-full"
                    accessibilityLabel={`${name}'s profile photo`}
                    onError={() => setFailedAvatarUrl(user.avatarUrl ?? null)}
                  />
                ) : (
                  <Txt weight="medium" className="text-[25px] text-brand">
                    {initials}
                  </Txt>
                )}
              </View>
              <View className="min-w-0 flex-1">
                <View className="mb-2 self-start rounded-full bg-brand/10 px-2.5 py-1">
                  <Txt weight="medium" className="text-[8px] tracking-[0.7px] text-brand">
                    {memberLabel}
                  </Txt>
                </View>
                <Txt weight="medium" className="text-[23px] leading-8 tracking-[-0.7px]">
                  {name}
                </Txt>
                {!!user?.email && (
                  <Txt numberOfLines={1} className="mt-1 text-[11px] text-muted">
                    {user.email}
                  </Txt>
                )}
              </View>
            </View>
            {!!user?.bio.trim() && (
              <Txt className="mt-4 text-xs leading-6 text-muted">{user.bio.trim()}</Txt>
            )}
            {!!joined && <Txt className="mt-4 text-[10px] text-muted">In sync since {joined}</Txt>}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/edit-profile")}
              className="mt-5 min-h-12 flex-row items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5"
            >
              <Icon name="account-edit-outline" size={18} />
              <Txt weight="medium" className="text-xs">
                Edit profile
              </Txt>
            </Pressable>
          </View>
          <View className="border-t border-white/10 bg-white/[0.02] px-3 py-5">
            <View className="flex-row items-center">
              <Stat
                value={statsUnavailable ? "—" : `${snapshot.completed.length}`}
                label="Sessions"
              />
              <View className="h-8 w-px bg-white/10" />
              <Stat
                value={
                  statsUnavailable || (snapshot.completed.length > 0 && !timed.length)
                    ? "—"
                    : duration(recordedSeconds)
                }
                label="Recorded time"
              />
              <View className="h-8 w-px bg-white/10" />
              <Stat value={statsUnavailable ? "—" : `${loggedSets}`} label="Sets logged" />
            </View>
            {progress.loading ? (
              <View className="mt-4 flex-row items-center justify-center gap-2">
                <ActivityIndicator size="small" color={C.brand} />
                <Txt className="text-[10px] text-muted">Loading your progress…</Txt>
              </View>
            ) : (
              <Txt className="mt-4 text-center text-[10px] leading-5 text-muted">
                {progressError
                  ? "Showing saved progress. Pull down to retry."
                  : "Your completed training, all in one place."}
              </Txt>
            )}
          </View>
        </View>

        <View className="mt-8">
          <SectionHeading
            title="Your fitness profile"
            action="Edit"
            onAction={() => router.push("/edit-profile")}
          />
          <View className="rounded-[24px] border border-white/5 bg-panel px-5 pb-2 pt-5">
            <View className="mb-3 flex-row items-center gap-3 border-b border-white/5 pb-5">
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-brand/10">
                <Icon name="bullseye-arrow" size={24} color={C.brand} />
              </View>
              <View className="flex-1">
                <Txt className="text-[10px] tracking-[1px] text-muted">YOUR DIRECTION</Txt>
                <Txt weight="medium" className="mt-1 text-lg">
                  {profile ? GOALS[profile.goal] : "Find your starting point"}
                </Txt>
              </View>
            </View>
            <Detail label="Experience" value={profile ? EXPERIENCE[profile.experience] : "—"} />
            <Detail label="Equipment" value={profile ? EQUIPMENT[profile.equipment] : "—"} />
            <Detail
              label="Training schedule"
              value={profile ? `${profile.trainingDays} days / week` : "—"}
            />
            <Detail
              label="Session length"
              value={profile ? `${profile.minutesPerWorkout} minutes` : "—"}
            />
            <View className="mt-3 flex-row gap-4 border-t border-white/5 py-5">
              <View className="min-w-0 flex-1">
                <Txt className="text-[10px] text-muted">
                  {snapshot.weight ? "Latest weight" : "Profile weight"}
                </Txt>
                <Txt
                  weight="medium"
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  className="mt-2 text-[22px] tracking-[-0.5px]"
                >
                  {weight}
                </Txt>
                {snapshot.weight && (
                  <Txt className="mt-1 text-[10px] text-muted">
                    {dateLabel(snapshot.weight.date)}
                  </Txt>
                )}
              </View>
              <View className="w-px bg-white/10" />
              <View className="min-w-0 flex-1">
                <Txt className="text-[10px] text-muted">Height</Txt>
                <Txt
                  weight="medium"
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  className="mt-2 text-[22px] tracking-[-0.5px]"
                >
                  {height}
                </Txt>
              </View>
            </View>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open membership"
          onPress={() => router.push(billing.isPro ? "/billing" : "/membership")}
          className="mt-6 rounded-[24px] bg-brand p-5"
        >
          <View className="flex-row items-center justify-between">
            <Icon name="crown-outline" size={26} color={C.bg} />
            <Txt
              weight="medium"
              className="text-[10px] px-3 py-1 rounded-full bg-yellow-300 tracking-[1px] text-bg"
            >
              FITSYNC PRO
            </Txt>
          </View>
          <Txt weight="medium" className="mt-4 text-[25px] leading-8 tracking-[-0.7px] text-bg">
            {billing.loading
              ? "Your membership."
              : billing.isPro
                ? "More room to grow."
                : billing.pendingActivation
                  ? "Your plan is on its way."
                  : billing.error
                    ? "Let’s check your plan."
                    : "Make room for more."}
          </Txt>
          <Txt className="mt-2 text-xs leading-6 text-black/70">
            {billing.loading
              ? "Checking your membership status…"
              : billing.isPro
                ? "Your Pro tools, personal coaching and deeper insights, together."
                : billing.pendingActivation
                  ? "Review your pending activation and purchase status."
                  : billing.error
                    ? "Open membership to refresh your subscription status."
                    : "Explore adaptive coaching, deeper insights and your Pro workspace."}
          </Txt>
          <View className="mt-4 flex-row items-center gap-2">
            <Txt weight="semibold" className="text-xs text-bg">
              {billing.isPro ? "Manage membership" : "View membership"}
            </Txt>
            <Icon name="arrow-right" size={17} color={C.bg} />
          </View>
        </Pressable>

        {NAVIGATION.map((group) => (
          <View key={group.title} className="mt-8">
            <SectionHeading title={group.title} />
            <View className="overflow-hidden rounded-[24px] border border-white/5 bg-panel px-4">
              {group.items.map((item, index) => (
                <NavRow
                  key={item.title}
                  {...item}
                  last={index === group.items.length - 1}
                  onPress={() => router.push(item.route)}
                />
              ))}
            </View>
          </View>
        ))}

        <View className="mt-8">
          <SectionHeading
            title="Your preferences"
            action="Manage"
            onAction={() => router.push("/settings")}
          />
          <View className="rounded-[24px] border border-white/5 bg-panel px-5 py-2">
            <Detail
              label="Weight unit"
              value={settings ? settings.weightUnit.toUpperCase() : "—"}
            />
            <Detail label="Rest timer" value={settings ? `${settings.restSeconds} seconds` : "—"} />
            <Detail
              label="Workout reminders"
              value={settings ? (settings.workoutReminders ? "On" : "Off") : "—"}
            />
          </View>
        </View>
        <View className="mt-8">
          <SectionHeading title="Account" />
          <View className="overflow-hidden rounded-[24px] border border-white/5 bg-panel px-4">
            <NavRow
              icon="cog-outline"
              title="Settings & preferences"
              subtitle="Units, reminders, sound & app experience"
              onPress={() => router.push("/settings")}
            />
            <NavRow
              icon="credit-card-outline"
              title="Membership & billing"
              subtitle="Subscription, purchases & store settings"
              onPress={() => router.push("/billing")}
              last
            />
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          accessibilityState={{ disabled: busy, busy }}
          disabled={busy}
          onPress={logout}
          className="mt-8 min-h-14 flex-row items-center justify-center gap-2 rounded-full border border-white/10 bg-panel"
          style={{ opacity: busy ? 0.6 : 1 }}
        >
          {busy ? (
            <ActivityIndicator size="small" color={C.muted} />
          ) : (
            <Icon name="logout" size={18} color={C.muted} />
          )}
          <Txt weight="medium" className="text-sm text-muted">
            {busy ? "Signing out…" : "Sign out"}
          </Txt>
        </Pressable>
        <Txt className="mt-6 text-center text-[10px] tracking-[1px] text-muted">
          YOUR TRAINING. YOUR HABITS. IN SYNC.
        </Txt>
      </TabScrollView>
    </ScreenEntrance>
  );
}
