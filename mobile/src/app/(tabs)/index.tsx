import { Text, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthStore } from "@/features/auth/store";

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-6">
        <Text className="text-[13px] font-semibold uppercase tracking-[2px] text-white/40">
          FitSync
        </Text>

        <Text className="mt-4 text-[38px] font-extrabold leading-[42px] tracking-[-1.5px] text-white">
          You&apos;re in.
        </Text>

        <Text className="mt-4 max-w-[340px] text-[15px] leading-6 text-white/55">
          Your FitSync account is ready. We&apos;ll build your training experience
          from here.
        </Text>

        <View className="mt-10 rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
          <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-white/35">
            Signed in as
          </Text>

          <Text className="mt-2 text-[16px] font-bold text-white">
            {user?.email}
          </Text>

          {!user?.onboarding_complete ? (
            <Text className="mt-3 text-[13px] leading-5 text-white/40">
              Profile setup comes next.
            </Text>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}
