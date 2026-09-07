import { Ionicons } from "@expo/vector-icons";

import { Pressable, Text, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

interface BootstrapErrorProps {
  onRetry: () => void;
}

export function BootstrapError({ onRetry }: BootstrapErrorProps) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-end px-6 pb-10">
        <View className="rounded-[28px] border border-white/10 bg-neutral-950 p-6">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <Ionicons name="cloud-offline-outline" size={23} color="#FFFFFF" />
          </View>

          <Text className="mt-6 text-[28px] font-extrabold tracking-[-1px] text-white">
            Can&apos;t reach FitSync.
          </Text>

          <Text className="mt-3 text-[15px] leading-6 text-white/55">
            Your session is still safely stored. Check your connection and try
            again.
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            className="mt-7 min-h-[56px] items-center justify-center rounded-2xl bg-white active:bg-neutral-200"
          >
            <Text className="text-[15px] font-bold text-black">Try again</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
