import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSQLiteContext } from "expo-sqlite";
import { useAuthStore } from "@/features/auth/store";
import { RoutineCard } from "@/features/workout-templates/components/routine-card";
import { FolderPicker } from "@/features/workout-templates/components/folder-picker";
import { RoutineConflictCard } from "@/features/workout-templates/components/routine-conflict-card";
import { RoutineMenu } from "@/features/workout-templates/components/routine-menu";
import { useLocalRoutines } from "@/features/workout-templates/hooks/use-local-routines";
import { useRoutineFolders } from "@/features/workout-templates/hooks/use-routine-folders";
import {
  duplicateLocalTemplate,
  patchLocalTemplate,
} from "@/features/workout-templates/local-services";
import { requestRoutineSync } from "@/features/workout-templates/sync-manager";
import {
  useLocalRoutineVersion as resolveWithLocalRoutine,
  useServerRoutineVersion as resolveWithServerRoutine,
} from "@/features/workout-templates/conflict-resolver";
import { startLocalWorkout } from "@/features/workout-session/local/start-local-workout";

export default function RoutinesScreen() {
  const database = useSQLiteContext(),
    user = useAuthStore((state) => state.user),
    routines = useLocalRoutines(),
    folders = useRoutineFolders();
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("ALL"),
    [menuId, setMenuId] = useState<string | null>(null),
    [moveId, setMoveId] = useState<string | null>(null);
  const reloadRoutines = routines.reload;
  const reloadFolders = folders.reload;
  useFocusEffect(
    useCallback(() => {
      void reloadRoutines();
      void reloadFolders();
      if (user?.id) requestRoutineSync(database, user.id);
      return undefined;
    }, [database, reloadFolders, reloadRoutines, user]),
  );
  const records = useMemo(() => {
    const q = search.trim().toLowerCase();
    return routines.items.filter(
      ({ template }) =>
        (filter === "ALL" ||
          (filter === "FAVORITES"
            ? template.is_favorite
            : template.folder_client_id === filter)) &&
        (!q ||
          template.name.toLowerCase().includes(q) ||
          template.exercises.some((item) =>
            item.exercise_name.toLowerCase().includes(q),
          )),
    );
  }, [filter, routines.items, search]);
  const selected =
    routines.items.find((item) => item.localId === menuId) ?? null;
  const mutate = async (
    id: string,
    patch: Parameters<typeof patchLocalTemplate>[3],
  ) => {
    if (!user) return;
    await patchLocalTemplate(database, user.id, id, patch);
    requestRoutineSync(database, user.id, 0);
    await routines.reload();
  };
  if (routines.loading)
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#3B82F6" />
      </SafeAreaView>
    );
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-5 pt-3">
        <Pressable
          onPress={router.back}
          className="h-11 w-11 items-center justify-center"
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>
        <View className="ml-4 flex-1">
          <Text className="text-[27px] font-extrabold text-white">
            Routines
          </Text>
        </View>
        <Pressable
          onPress={() => router.push("/workout-templates/create")}
          className="h-11 w-11 items-center justify-center rounded-2xl bg-brand"
        >
          <Ionicons name="add" size={24} color="#fff" />
        </Pressable>
      </View>
      <View className="mx-5 mt-5 flex-row items-center rounded-2xl bg-white/[0.04] px-4">
        <Ionicons name="search" size={18} color="rgba(255,255,255,.3)" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search routines"
          placeholderTextColor="rgba(255,255,255,.2)"
          className="ml-3 flex-1 py-4 text-white"
        />
      </View>
      <FlatList
        horizontal
        data={[
          { id: "ALL", name: "All" },
          { id: "FAVORITES", name: "Favorites" },
          ...folders.items.map((item) => ({
            id: item.clientFolderId,
            name: item.name,
          })),
        ]}
        keyExtractor={(item) => item.id}
        className="mt-4 max-h-12"
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setFilter(item.id)}
            className="rounded-full px-4 py-2.5"
            style={{
              backgroundColor:
                filter === item.id ? "#2563EB" : "rgba(255,255,255,.045)",
            }}
          >
            <Text className="font-bold text-white/60">{item.name}</Text>
          </Pressable>
        )}
      />
      <FlatList
        data={records}
        keyExtractor={(item) => item.localId}
        contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <View>
            {item.syncStatus === "CONFLICT" ? (
              <RoutineConflictCard
                routineName={item.template.name}
                onUseLocal={() => {
                  if (user)
                    void resolveWithLocalRoutine(
                      database,
                      user.id,
                      item.localId,
                    ).then(routines.reload);
                }}
                onUseServer={() => {
                  if (user)
                    void resolveWithServerRoutine(
                      database,
                      user.id,
                      item.localId,
                    ).then(routines.reload);
                }}
              />
            ) : (
              <RoutineCard
                routine={item.template}
                onOpen={() => router.push(`/workout-templates/${item.localId}`)}
                onStart={() => {
                  if (user)
                    void startLocalWorkout(database, user, {
                      template: item.template,
                    }).then((id) => router.push(`/workouts/active/${id}`));
                }}
                onMenu={() => setMenuId(item.localId)}
              />
            )}
          </View>
        )}
        ListEmptyComponent={
          <Text className="pt-20 text-center text-white/30">
            No routines here.
          </Text>
        }
      />
      {selected ? (
        <RoutineMenu
          visible
          favorite={selected.template.is_favorite}
          onEdit={() =>
            router.push(`/workout-templates/${selected.localId}/edit`)
          }
          onDuplicate={() => {
            if (user)
              void duplicateLocalTemplate(
                database,
                user.id,
                selected.localId,
              ).then(async (id) => {
                requestRoutineSync(database, user.id, 0);
                await routines.reload();
                router.push(`/workout-templates/${id}/edit`);
              });
          }}
          onFavorite={() =>
            void mutate(selected.localId, {
              is_favorite: !selected.template.is_favorite,
            })
          }
          onMove={() => setMoveId(selected.localId)}
          onArchive={() =>
            Alert.alert("Archive routine?", selected.template.name, [
              { text: "Cancel", style: "cancel" },
              {
                text: "Archive",
                style: "destructive",
                onPress: () =>
                  void mutate(selected.localId, { archived: true }),
              },
            ])
          }
          onClose={() => setMenuId(null)}
        />
      ) : null}
      <FolderPicker
        visible={moveId !== null}
        folders={folders.items}
        selectedId={
          routines.items.find((item) => item.localId === moveId)?.template
            .folder_client_id ?? null
        }
        onSelect={(folderId) => {
          if (moveId) void mutate(moveId, { folder_client_id: folderId });
        }}
        onCreate={() => router.push("/workout-templates/folders")}
        onClose={() => setMoveId(null)}
      />
    </SafeAreaView>
  );
}
