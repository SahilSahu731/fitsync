import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, Text } from "react-native";

import type { LocalFolderRecord } from "../types";

export function FolderPicker({
  visible,
  folders,
  selectedId,
  onSelect,
  onCreate,
  onClose,
}: {
  visible: boolean;
  folders: LocalFolderRecord[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: () => void;
  onClose: () => void;
}) {
  const choose = (id: string | null) => {
    onSelect(id);
    onClose();
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 justify-end bg-black/65" onPress={onClose}>
        <Pressable
          className="max-h-[70%] rounded-t-[28px] bg-[#101113] px-5 pb-9 pt-5"
          onPress={(event) => event.stopPropagation()}
        >
          <Text className="text-[20px] font-extrabold text-white">Folder</Text>
          <ScrollView className="mt-4">
            {[
              { localId: null, clientFolderId: null, name: "No folder" },
              ...folders,
            ].map((folder) => {
              const id = folder.clientFolderId;
              const selected = selectedId === id;
              return (
                <Pressable
                  key={id ?? "none"}
                  onPress={() => choose(id)}
                  className="min-h-[52px] flex-row items-center rounded-xl px-3"
                >
                  <Ionicons
                    name="folder-outline"
                    size={18}
                    color={selected ? "#60A5FA" : "rgba(255,255,255,.4)"}
                  />
                  <Text className="ml-3 flex-1 text-[14px] font-semibold text-white/60">
                    {folder.name}
                  </Text>
                  {selected ? (
                    <Ionicons name="checkmark" size={18} color="#60A5FA" />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable
            onPress={onCreate}
            className="mt-4 min-h-[48px] flex-row items-center justify-center rounded-xl bg-brand-muted"
          >
            <Ionicons name="add" size={17} color="#60A5FA" />
            <Text className="ml-2 text-[13px] font-bold text-brand-bright">
              New folder
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
