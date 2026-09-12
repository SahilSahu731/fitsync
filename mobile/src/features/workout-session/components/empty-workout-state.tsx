import { Ionicons } from "@expo/vector-icons";

import { Text, View } from "react-native";

export function EmptyWorkoutState() {
  return (
    <View className="items-center px-8 py-16">
      <View className="h-16 w-16 items-center justify-center rounded-3xl bg-brand-muted">
        <Ionicons name="barbell-outline" size={28} color="#60A5FA" />
      </View>

      <Text className="mt-5 text-[18px] font-extrabold text-white">
        Add your first exercise
      </Text>

      <Text className="mt-2 text-center text-[13px] leading-5 text-white/35">
        Build this workout as you train.
      </Text>
    </View>
  );
}
