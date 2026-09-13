import { Pressable, Text, View } from "react-native";
export function RoutineConflictCard({
  routineName,
  onUseLocal,
  onUseServer,
}: {
  routineName: string;
  onUseLocal: () => void;
  onUseServer: () => void;
}) {
  return (
    <View className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.07] p-4">
      <Text className="text-[14px] font-extrabold text-amber-200">
        Routine changed elsewhere
      </Text>
      <Text className="mt-2 text-[11px] leading-5 text-white/40">
        {routineName} was edited on another device while this device had
        unsynced changes.
      </Text>
      <View className="mt-4 flex-row gap-2">
        <Pressable
          onPress={onUseServer}
          className="min-h-[43px] flex-1 items-center justify-center rounded-xl bg-white/[0.06]"
        >
          <Text className="font-bold text-white/55">Use Server</Text>
        </Pressable>
        <Pressable
          onPress={onUseLocal}
          className="min-h-[43px] flex-1 items-center justify-center rounded-xl bg-amber-500"
        >
          <Text className="font-extrabold text-black">Use This Device</Text>
        </Pressable>
      </View>
    </View>
  );
}
