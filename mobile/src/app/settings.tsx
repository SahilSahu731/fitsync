import { useProgram } from "@/src/features/program-follow/program-context";
import { ProgramSetup } from "@/src/features/program-follow/program-setup";
import { useAppAlert } from "@/src/components/app-dialog";
import React, { useState } from "react";

import { Pressable, ScrollView, Switch, View } from "react-native";

import { Redirect, useRouter } from "expo-router";

import { MaterialCommunityIcons } from "@expo/vector-icons";

import { C } from "@/src/constants/theme";
import { Pill, Txt } from "@/src/components/ui";

import { useSession } from "@/src/context/session";

function SettingsHeader({ title }: { title: string }) {
  return (
    <Txt weight="extra" className="mb-4 mt-8 text-[20px]">
      {title}
    </Txt>
  );
}

export default function SettingsScreen() {
  const Alert = useAppAlert();
  const router = useRouter();

  const { user, settings, updateSettings, redoOnboarding, signOut } =
    useSession();

  const { active: program } = useProgram();
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!settings) return null;

  const saveSettings = async (data: Parameters<typeof updateSettings>[0]) => {
    setBusy(true);

    try {
      await updateSettings(data);
    } catch (error) {
      Alert.alert(
        "Couldn't save settings",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const restartOnboarding = () => {
    Alert.alert(
      "Redo fitness setup?",
      "This will clear your current fitness setup and take you through onboarding again.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Redo setup",
          onPress: async () => {
            try {
              await redoOnboarding();
              router.replace("/onboarding");
            } catch (error) {
              Alert.alert("Could not restart setup", String(error));
            }
          },
        },
      ],
    );
  };

  const logout = () => {
    Alert.alert("Sign out of FitSync?", "", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/sign-in");
        },
      },
    ]);
  };

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingTop: 25,
        paddingBottom: 55,
      }}
    >
      <View className="flex-row items-center gap-4">
        <Pressable
          onPress={() => router.back()}
          className="inline-flex"
        >
          <MaterialCommunityIcons name="arrow-left" color={C.ink} size={23} />
        </Pressable>
        <Txt weight="medium" className="text-[22px]">
          Settings
        </Txt>
      </View>

       <SettingsHeader title="Training" />

      <View className="rounded-2xl bg-panel p-5">
        <Txt weight="bold" className="">
          Preferred weight unit
        </Txt>

        <Txt className="mb-4 mt-1 text-sm text-muted">
          Your preferred unit for future workout logging. Body measurements are
          currently entered in kg.
        </Txt>

        <View className="flex-row gap-2">
          <Pill
            label="Kilograms"
            active={settings.weightUnit === "kg"}
            onPress={() => saveSettings({ weightUnit: "kg" })}
          />

          <Pill
            label="Pounds"
            active={settings.weightUnit === "lb"}
            onPress={() => saveSettings({ weightUnit: "lb" })}
          />
        </View>
      </View>

      <View className="mt-3 rounded-2xl bg-panel p-5">
        <Txt weight="bold" className="text-base">
          Default rest timer
        </Txt>

        <Txt className="mb-4 mt-1 text-xs text-muted">
          Choose the preferred rest duration.
        </Txt>

        <View className="flex-row flex-wrap gap-2">
          {([30, 60, 90, 120, 180] as const).map((value) => (
            <Pill
              key={value}
              label={value < 60 ? `${value}s` : `${value / 60} min`}
              active={settings.restSeconds === value}
              onPress={() =>
                saveSettings({
                  restSeconds: value,
                })
              }
            />
          ))}
        </View>
      </View>

      {/* Notification preference */}

      <SettingsHeader title="Notifications" />

      <View className="flex-row items-center rounded-2xl bg-panel p-5">
        <View className="mr-4 h-12 w-12 items-center justify-center ">
          <MaterialCommunityIcons
            name="bell-outline"
            size={23}
            color={"white"}
          />
        </View>

        <View className="flex-1">
          <Txt weight="bold" className="text-sm">
            Workout reminders
          </Txt>

          <Txt className="mt-1 text-xs leading-4 text-muted">
            Daily nudges for the program you follow.
          </Txt>
        </View>

        <Switch
          disabled={busy}
          value={settings.workoutReminders && !!program?.enrollment.reminder_enabled}
          onValueChange={(value) => {
            if (!value) void saveSettings({ workoutReminders: false });
            else if (program) setRemindersOpen(true);
            else router.push("/explore/programs");
          }}
          trackColor={{
            false: C.border,
            true: C.brand,
          }}
          thumbColor="#FFFFFF"
        />
      </View>

      <Txt className="mt-2 text-xs leading-5 text-muted">
        Choose the time in your program reminder settings. Turning this off
        silences daily program reminders on all your devices.
      </Txt>

      {program && <Pressable onPress={() => setRemindersOpen(true)} className="self-start py-3"><Txt className="text-sm text-brand">Change reminder time</Txt></Pressable>}
      {remindersOpen && program && <ProgramSetup enrollment={program.enrollment} onClose={() => setRemindersOpen(false)} onSaved={() => setRemindersOpen(false)} />}

      {/* Personal setup */}

      <SettingsHeader title="Personal Setup" />

      <Pressable
        onPress={() => router.push("/edit-profile")}
        className="mb-3 flex-row items-center rounded-2xl bg-panel p-5"
      >
        <MaterialCommunityIcons name="account-edit" color={C.brand} size={23} />

        <View className="ml-4 flex-1">
          <Txt weight="bold">Edit personal information</Txt>

          <Txt className="mt-1 text-xs text-muted">
            Profile, weight, height, fitness goals
          </Txt>
        </View>

        <MaterialCommunityIcons
          name="chevron-right"
          color={C.muted}
          size={23}
        />
      </Pressable>

      <Pressable
        onPress={restartOnboarding}
        className="flex-row items-center rounded-2xl bg-panel p-5"
      >
        <MaterialCommunityIcons name="refresh" color={C.brand} size={23} />

        <View className="ml-4 flex-1">
          <Txt weight="bold">Redo onboarding</Txt>

          <Txt className="mt-1 text-xs text-muted">
            Start fitness setup again
          </Txt>
        </View>

        <MaterialCommunityIcons
          name="chevron-right"
          color={C.muted}
          size={23}
        />
      </Pressable>

      {/* Account */}

      <SettingsHeader title="Account & Privacy" />

      <View className="rounded-2xl bg-panel">
        <Pressable
          onPress={logout}
          className="flex-row items-center border-b border-border p-5"
        >
          <MaterialCommunityIcons name="logout" color={C.ink} size={23} />

          <Txt weight="bold" className="ml-4 flex-1">
            Sign out
          </Txt>

          <MaterialCommunityIcons
            name="chevron-right"
            color={C.muted}
            size={23}
          />
        </Pressable>

        <Pressable
          onPress={() => router.push("/delete-account")}
          className="flex-row items-center p-5"
        >
          <MaterialCommunityIcons
            name="delete-outline"
            color="#FF8278"
            size={23}
          />

          <Txt weight="bold" className="ml-4 flex-1 text-[#FF8278]">
            Delete account
          </Txt>

          <MaterialCommunityIcons
            name="chevron-right"
            color="#FF8278"
            size={23}
          />
        </Pressable>
      </View>

      <Txt className="mt-8 text-center text-muted">
        FitSync · Made for your next rep.
      </Txt>
    </ScrollView>
  );
}
