import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import type { WorkoutTemplate } from "@/features/workouts/types";

export function RoutineCard({
  routine,
  onOpen,
  onStart,
  onMenu,
}: {
  routine: WorkoutTemplate;
  onOpen: () => void;
  onStart: () => void;
  onMenu: () => void;
}) {
  return (
    <Pressable
      onPress={onOpen}
      className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.03]"
    >
      <View className="flex-row p-4">
        <View className="h-16 w-16 items-center justify-center rounded-2xl bg-brand-muted">
          <Ionicons name="barbell-outline" size={23} color="#60A5FA" />
        </View>
        <View className="ml-4 flex-1">
          <View className="flex-row items-center">
            {routine.is_favorite ? (
              <Ionicons name="star" size={13} color="#FACC15" />
            ) : null}
            <Text
              numberOfLines={1}
              className="ml-1 flex-1 text-[16px] font-extrabold text-white"
            >
              {routine.name}
            </Text>
          </View>
          <Text className="mt-2 text-[11px] text-white/35">
            {routine.exercise_count} exercises · {routine.set_count} sets
          </Text>
          <Text numberOfLines={1} className="mt-2 text-[10px] text-white/25">
            {routine.exercises.map((item) => item.exercise_name).join(" · ")}
          </Text>
        </View>
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            onMenu();
          }}
          className="h-9 w-9 items-center justify-center"
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={18}
            color="rgba(255,255,255,.35)"
          />
        </Pressable>
      </View>
      <Pressable
        onPress={(event) => {
          event.stopPropagation();
          onStart();
        }}
        className="min-h-[46px] flex-row items-center justify-center border-t border-white/[0.06] bg-brand"
      >
        <Ionicons name="play" size={15} color="#fff" />
        <Text className="ml-2 font-extrabold text-white">Start</Text>
      </Pressable>
    </Pressable>
  );
}
