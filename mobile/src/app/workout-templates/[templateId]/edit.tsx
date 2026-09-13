import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSQLiteContext } from "expo-sqlite";
import { useAuthStore } from "@/features/auth/store";
import { RoutineEditor } from "@/features/workout-templates/editor/routine-editor";
import { useRoutineFolders } from "@/features/workout-templates/hooks/use-routine-folders";
import { getLocalRoutineByAnyId } from "@/features/workout-templates/local-routine-repository";
import { saveLocalTemplate } from "@/features/workout-templates/local-services";
import { requestRoutineSync } from "@/features/workout-templates/sync-manager";
import type { LocalRoutineRecord } from "@/features/workout-templates/types";

export default function EditRoutineScreen() {
  const params = useLocalSearchParams<{ templateId?: string }>();
  const templateId =
    typeof params.templateId === "string" ? params.templateId : "";
  const database = useSQLiteContext();
  const user = useAuthStore((state) => state.user);
  const folders = useRoutineFolders();
  const [record, setRecord] = useState<LocalRoutineRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    if (user?.id && templateId)
      void getLocalRoutineByAnyId(database, user.id, templateId).then(
        (value) => {
          if (active) {
            setRecord(value);
            setLoading(false);
          }
        },
      );
    return () => {
      active = false;
    };
  }, [database, templateId, user?.id]);
  if (loading)
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  if (!record || !user) return null;
  return (
    <SafeAreaView className="flex-1 bg-background">
      <RoutineEditor
        initial={record.template}
        folders={folders.items}
        saving={saving}
        onCreateFolder={() => router.push("/workout-templates/folders")}
        onCancel={router.back}
        onSave={async (input, metadata) => {
          setSaving(true);
          try {
            await saveLocalTemplate(database, {
              localId: record.localId,
              userId: user.id,
              input,
              folderId: metadata.folderId,
              isFavorite: metadata.favorite,
            });
            requestRoutineSync(database, user.id, 0);
            router.back();
          } finally {
            setSaving(false);
          }
        }}
      />
    </SafeAreaView>
  );
}
