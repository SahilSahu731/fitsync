import { router } from "expo-router";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSQLiteContext } from "expo-sqlite";
import { useAuthStore } from "@/features/auth/store";
import { RoutineEditor } from "@/features/workout-templates/editor/routine-editor";
import { useRoutineFolders } from "@/features/workout-templates/hooks/use-routine-folders";
import { createLocalTemplate } from "@/features/workout-templates/local-services";
import { requestRoutineSync } from "@/features/workout-templates/sync-manager";

export default function CreateRoutineScreen() {
  const database = useSQLiteContext();
  const user = useAuthStore((state) => state.user);
  const folders = useRoutineFolders();
  const [saving, setSaving] = useState(false);
  if (!user) return null;
  return (
    <SafeAreaView className="flex-1 bg-background">
      <RoutineEditor
        folders={folders.items}
        saving={saving}
        onCreateFolder={() => router.push("/workout-templates/folders")}
        onCancel={router.back}
        onSave={async (input, metadata) => {
          setSaving(true);
          try {
            const id = await createLocalTemplate(database, {
              userId: user.id,
              input,
              folderId: metadata.folderId,
              isFavorite: metadata.favorite,
            });
            requestRoutineSync(database, user.id, 0);
            router.replace(`/workout-templates/${id}`);
          } finally {
            setSaving(false);
          }
        }}
      />
    </SafeAreaView>
  );
}
