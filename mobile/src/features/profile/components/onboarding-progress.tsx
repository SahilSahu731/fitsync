import {
  Text,
  View,
} from "react-native";


interface Props {
  step: number;

  total: number;
}


export function OnboardingProgress({
  step,
  total,
}: Props) {
  return (
    <View>
      <View className="flex-row items-center justify-between">
        <Text className="text-[12px] font-semibold uppercase tracking-[2px] text-white/35">
          Setup
        </Text>

        <Text className="text-[12px] font-bold text-white/45">
          {step}/{total}
        </Text>
      </View>

      <View className="mt-3 h-[3px] overflow-hidden rounded-full bg-white/10">
        <View
          className="h-full rounded-full bg-brand"
          style={{
            width:
              `${(step / total) * 100}%`,
          }}
        />
      </View>
    </View>
  );
}