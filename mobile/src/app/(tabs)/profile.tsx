
import React, { useState } from "react";

import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  View
} from "react-native";

import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { C } from "@/src/constants/theme";
import { Txt } from "@/src/components/ui";
import { useSession } from "@/src/context/session";

function SettingRow({
  icon,
  title,
  subtitle,
  onPress
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-row items-center rounded-2xl border border-border bg-panel p-4"
    >
      <View className="mr-4 h-12 w-12 items-center justify-center rounded-xl bg-elevated">
        <MaterialCommunityIcons
          name={icon}
          size={23}
          color={C.brand}
        />
      </View>

      <View className="flex-1">
        <Txt weight="bold" className="text-[15px]">
          {title}
        </Txt>

        <Txt className="mt-1 text-xs text-muted">
          {subtitle}
        </Txt>
      </View>

      <MaterialCommunityIcons
        name="chevron-right"
        size={24}
        color={C.muted}
      />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, signOut } = useSession();

  const [busy, setBusy] = useState(false);

  const logout = () => {
    Alert.alert(
      "Sign out?",
      "You can sign in again with your Google account.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Sign out",
          onPress: async () => {
            setBusy(true);

            try {
              await signOut();
              router.replace("/(auth)/sign-in");
            } finally {
              setBusy(false);
            }
          }
        }
      ]
    );
  };

  const goalNames: Record<string, string> = {
    muscle: "Build Muscle",
    strength: "Get Stronger",
    fat_loss: "Fat Loss",
    fitness: "General Fitness"
  };

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{
        paddingHorizontal: 22,
        paddingTop: 24,
        paddingBottom: 60
      }}
    >
      <View className="flex-row items-center justify-between">
        <View>
          <Txt
            weight="medium"
            className="text-xs tracking-[2px] text-brand"
          >
            YOUR SPACE
          </Txt>

          <Txt
            weight="extra"
            className="mt-1 text-[36px]"
          >
            PROFILE.
          </Txt>
        </View>

        <Pressable
          onPress={() => router.push("/settings")}
          className="h-12 w-12 items-center justify-center rounded-full border border-border bg-panel"
        >
          <MaterialCommunityIcons
            name="cog-outline"
            size={25}
            color={C.ink}
          />
        </Pressable>
      </View>

      {/* Profile card */}

      <View className="mt-7 rounded-[30px] border border-border bg-panel p-5">
        <View className="flex-row items-center">
          <View className="h-[76px] w-[76px] overflow-hidden rounded-3xl bg-brand">
            {user?.avatarUrl ? (
              <Image
                source={{ uri: user.avatarUrl }}
                className="h-full w-full"
                resizeMode="cover"
              />
            ) : (
              <View className="h-full w-full items-center justify-center">
                <Txt
                  weight="extra"
                  className="text-3xl text-bg"
                >
                  {(user?.name || "A")[0].toUpperCase()}
                </Txt>
              </View>
            )}
          </View>

          <View className="ml-4 flex-1">
            <Txt
              weight="extra"
              className="text-[23px]"
            >
              {user?.name || "Athlete"}
            </Txt>

            <Txt
              className="mt-1 text-xs text-muted"
              numberOfLines={1}
            >
              {user?.email}
            </Txt>

            <Txt
              weight="bold"
              className="mt-2 text-[11px] tracking-[1px] text-brand"
            >
              FITSYNC ATHLETE
            </Txt>
          </View>
        </View>

        {user?.bio ? (
          <Txt className="mt-5 text-sm leading-6 text-muted">
            {user.bio}
          </Txt>
        ) : null}

        <Pressable
          onPress={() => router.push("/edit-profile")}
          className="mt-5 flex-row items-center justify-center rounded-xl border border-brand py-3"
        >
          <MaterialCommunityIcons
            name="pencil-outline"
            size={18}
            color={C.brand}
          />

          <Txt
            weight="bold"
            className="ml-2 text-sm text-brand"
          >
            EDIT PROFILE
          </Txt>
        </Pressable>
      </View>

      {/* Measurements */}

      <Txt
        weight="extra"
        className="mb-4 mt-8 text-xl"
      >
        YOUR BASELINE
      </Txt>

      <View className="flex-row gap-3">
        {[
          [
            profile?.weightKg?.toString() || "–",
            "WEIGHT (KG)"
          ],
          [
            profile?.heightCm?.toString() || "–",
            "HEIGHT (CM)"
          ],
          [
            profile?.trainingDays?.toString() || "–",
            "DAYS/WEEK"
          ]
        ].map(([value, label]) => (
          <View
            key={label}
            className="flex-1 rounded-2xl border border-border bg-panel p-3"
          >
            <Txt
              weight="extra"
              className="text-[24px]"
            >
              {value}
            </Txt>

            <Txt className="mt-2 text-[10px] text-muted">
              {label}
            </Txt>
          </View>
        ))}
      </View>

      {/* Goal */}

      <View className="mt-4 flex-row items-center rounded-2xl bg-brand p-5">
        <MaterialCommunityIcons
          name="bullseye-arrow"
          color={C.bg}
          size={30}
        />

        <View className="ml-4 flex-1">
          <Txt
            weight="medium"
            className="text-xs text-bg"
          >
            CURRENT FITNESS GOAL
          </Txt>

          <Txt
            weight="extra"
            className="mt-1 text-xl text-bg"
          >
            {goalNames[profile?.goal || "muscle"]}
          </Txt>
        </View>
      </View>

      <Txt
        weight="extra"
        className="mb-4 mt-8 text-xl"
      >
        ACCOUNT
      </Txt>

      <SettingRow
        icon="account-edit-outline"
        title="Personal information"
        subtitle="Name, photo, body details, goals"
        onPress={() => router.push("/edit-profile")}
      />

      <SettingRow
        icon="cog-outline"
        title="Settings"
        subtitle="Training preferences and account management"
        onPress={() => router.push("/settings")}
      />

      <Pressable
        disabled={busy}
        onPress={logout}
        className="mt-3 flex-row items-center justify-center rounded-2xl border border-[#693C35] bg-[#291B1B] py-4"
      >
        <MaterialCommunityIcons
          name="logout"
          size={20}
          color="#FF9B89"
        />

        <Txt
          weight="bold"
          className="ml-3 text-[#FF9B89]"
        >
          SIGN OUT
        </Txt>
      </Pressable>
    </ScrollView>
  );
}
