
import React, { useState } from "react";

import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View
} from "react-native";

import {
  Redirect,
  useRouter
} from "expo-router";

import { MaterialCommunityIcons } from "@expo/vector-icons";

import { C } from "@/src/constants/theme";
import { Txt } from "@/src/components/ui";
import { useSession } from "@/src/context/session";

export default function DeleteAccountScreen() {
  const router = useRouter();

  const { user, deleteAccount } = useSession();

  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  const removeAccount = () => {
    if (confirmation !== "DELETE") return;

    Alert.alert(
      "Permanently delete your FitSync account?",
      "Your FitSync profile, fitness settings, uploaded avatar, and backend sessions will be removed. This cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete permanently",
          style: "destructive",
          onPress: async () => {
            setBusy(true);

            try {
              await deleteAccount();

              router.replace("/(auth)/sign-in");
            } catch (error) {
              Alert.alert(
                "Deletion failed",
                error instanceof Error
                  ? error.message
                  : "Please try again."
              );
            } finally {
              setBusy(false);
            }
          }
        }
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg"
      behavior={
        Platform.OS === "ios" ? "padding" : undefined
      }
    >
      <ScrollView
        contentContainerStyle={{
          padding: 24,
          flexGrow: 1
        }}
      >
        <Pressable
          onPress={() => router.back()}
          className="mb-10 h-11 w-11 items-center justify-center rounded-full border border-border"
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={23}
            color={C.ink}
          />
        </Pressable>

        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-[#321C1D]">
          <MaterialCommunityIcons
            name="alert-outline"
            color="#FF8278"
            size={44}
          />
        </View>

        <Txt
          weight="extra"
          className="mt-8 text-[37px] leading-[41px]"
        >
          DELETE YOUR{"\n"}
          <Txt
            weight="extra"
            className="text-[37px] text-[#FF8278]"
          >
            ACCOUNT.
          </Txt>
        </Txt>

        <Txt className="mt-5 text-sm leading-6 text-muted">
          We&apos;re sorry to see you go. If you permanently
          delete your account, your FitSync information
          will be removed from our database.
        </Txt>

        <View className="mt-8 rounded-2xl border border-[#5D3435] bg-[#25191A] p-5">
          <Txt
            weight="bold"
            className="text-sm text-[#FF9B89]"
          >
            WHAT WILL BE DELETED?
          </Txt>

          {[
            "Your FitSync account and profile",
            "Saved fitness measurements and goals",
            "Your training preferences and settings",
            "Your uploaded profile image",
            "All active FitSync sessions"
          ].map(item => (
            <View
              key={item}
              className="mt-4 flex-row items-start"
            >
              <MaterialCommunityIcons
                name="close-circle-outline"
                size={18}
                color="#FF8278"
              />

              <Txt className="ml-3 flex-1 text-sm text-ink">
                {item}
              </Txt>
            </View>
          ))}
        </View>

        <Txt
          weight="bold"
          className="mb-3 mt-8 text-xs tracking-[1px] text-muted"
        >
          TYPE DELETE TO CONFIRM
        </Txt>

        <TextInput
          value={confirmation}
          onChangeText={setConfirmation}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="DELETE"
          placeholderTextColor={C.muted}
          className="h-14 rounded-2xl border border-border bg-panel px-4 text-base text-ink"
          style={{
            fontFamily: "Outfit_700Bold"
          }}
        />

        <Pressable
          disabled={confirmation !== "DELETE" || busy}
          onPress={removeAccount}
          className={`mt-6 h-14 items-center justify-center rounded-2xl ${confirmation === "DELETE" ? "bg-[#F0665E]" : "bg-elevated"}`}
        >
          <Txt
            weight="extra"
            className="text-sm"
            style={{
              color:
                confirmation === "DELETE"
                  ? C.bg
                  : C.muted
            }}
          >
            {busy
              ? "DELETING ACCOUNT..."
              : "DELETE ACCOUNT PERMANENTLY"}
          </Txt>
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          className="mt-5 items-center py-3"
        >
          <Txt
            weight="bold"
            className="text-sm text-muted"
          >
            KEEP MY ACCOUNT
          </Txt>
        </Pressable>

        <Txt className="mt-6 text-center text-xs leading-5 text-muted">
          This deletes your FitSync data, not your Google
          account. The operation requires internet access.
        </Txt>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
