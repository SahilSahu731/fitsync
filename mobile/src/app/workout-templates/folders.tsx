import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSQLiteContext } from "expo-sqlite";
import { useAuthStore } from "@/features/auth/store";
import { TextPromptModal } from "@/features/workout-templates/components/text-prompt-modal";
import {
  archiveRoutineFolder,
  createRoutineFolder,
  moveRoutineFolder,
  renameRoutineFolder,
} from "@/features/workout-templates/folder-services";
import { useRoutineFolders } from "@/features/workout-templates/hooks/use-routine-folders";
import { requestRoutineSync } from "@/features/workout-templates/sync-manager";
export default function FoldersScreen() {
  const database = useSQLiteContext(),
    user = useAuthStore((state) => state.user),
    folders = useRoutineFolders();
  const [prompt, setPrompt] = useState<{
    id: string | null;
    name: string;
  } | null>(null);
  const sync = async () => {
    if (user) requestRoutineSync(database, user.id, 0);
    await folders.reload();
  };
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-5 py-3">
        <Pressable
          onPress={router.back}
          className="h-10 w-10 items-center justify-center"
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>
        <Text className="ml-3 flex-1 text-[22px] font-extrabold text-white">
          Routine folders
        </Text>
        <Pressable
          onPress={() => setPrompt({ id: null, name: "" })}
          className="h-10 w-10 items-center justify-center rounded-xl bg-brand"
        >
          <Ionicons name="add" size={20} color="#fff" />
        </Pressable>
      </View>
      <ScrollView className="px-5 pt-4">
        {folders.items.map((folder, index) => (
          <View
            key={folder.localId}
            className="mb-2 flex-row items-center rounded-2xl bg-white/[0.035] p-4"
          >
            <Ionicons name="folder-outline" size={20} color="#60A5FA" />
            <Text className="ml-3 flex-1 font-bold text-white/70">
              {folder.name}
            </Text>
            <Pressable
              disabled={index === 0}
              onPress={() =>
                user &&
                void moveRoutineFolder(
                  database,
                  user.id,
                  folder.localId,
                  -1,
                ).then(sync)
              }
              className="p-2"
            >
              <Ionicons name="arrow-up" size={16} color="#fff" />
            </Pressable>
            <Pressable
              disabled={index === folders.items.length - 1}
              onPress={() =>
                user &&
                void moveRoutineFolder(
                  database,
                  user.id,
                  folder.localId,
                  1,
                ).then(sync)
              }
              className="p-2"
            >
              <Ionicons name="arrow-down" size={16} color="#fff" />
            </Pressable>
            <Pressable
              onPress={() =>
                setPrompt({ id: folder.localId, name: folder.name })
              }
              className="p-2"
            >
              <Ionicons name="pencil-outline" size={16} color="#fff" />
            </Pressable>
            <Pressable
              onPress={() =>
                Alert.alert(
                  "Delete folder?",
                  "Routines inside move to No folder.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () =>
                        user &&
                        void archiveRoutineFolder(
                          database,
                          user.id,
                          folder.localId,
                        ).then(sync),
                    },
                  ],
                )
              }
              className="p-2"
            >
              <Ionicons name="trash-outline" size={16} color="#F87171" />
            </Pressable>
          </View>
        ))}
      </ScrollView>
      <TextPromptModal
        key={`${prompt?.id ?? "new"}:${prompt?.name ?? ""}`}
        visible={prompt !== null}
        title={prompt?.id ? "Rename folder" : "New folder"}
        initialValue={prompt?.name}
        onClose={() => setPrompt(null)}
        onSubmit={(name) => {
          if (!user || !prompt) return;
          const action = prompt.id
            ? renameRoutineFolder(database, user.id, prompt.id, name)
            : createRoutineFolder(database, user.id, name);
          setPrompt(null);
          void action.then(sync);
        }}
      />
    </SafeAreaView>
  );
}
