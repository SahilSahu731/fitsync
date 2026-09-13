import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSQLiteContext } from "expo-sqlite";
import { useAuthStore } from "@/features/auth/store";
import { useLocalRoutines } from "@/features/workout-templates/hooks/use-local-routines";
import { patchLocalTemplate } from "@/features/workout-templates/local-services";
import { requestRoutineSync } from "@/features/workout-templates/sync-manager";
export default function ArchivedRoutinesScreen() {
  const database = useSQLiteContext(),
    user = useAuthStore((state) => state.user),
    routines = useLocalRoutines(true);
  const archived = routines.items.filter((item) => item.template.archived);
  return (
    <SafeAreaView className="flex-1 bg-background px-5">
      <Pressable onPress={router.back} className="py-4">
        <Text className="text-brand-bright">Back</Text>
      </Pressable>
      <Text className="text-[26px] font-extrabold text-white">
        Archived routines
      </Text>
      {archived.map((item) => (
        <View
          key={item.localId}
          className="mt-4 flex-row items-center rounded-2xl bg-white/[0.04] p-4"
        >
          <View className="flex-1">
            <Text className="font-bold text-white">{item.template.name}</Text>
            <Text className="mt-1 text-white/30">Archived</Text>
          </View>
          <Pressable
            onPress={() => {
              if (!user) return;
              void patchLocalTemplate(database, user.id, item.localId, {
                archived: false,
              }).then(async () => {
                requestRoutineSync(database, user.id, 0);
                await routines.reload();
              });
            }}
            className="rounded-xl bg-brand px-4 py-3"
          >
            <Text className="font-bold text-white">Restore</Text>
          </Pressable>
        </View>
      ))}
    </SafeAreaView>
  );
}
