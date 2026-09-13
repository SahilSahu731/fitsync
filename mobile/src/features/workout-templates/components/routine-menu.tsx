import { Modal, Pressable, Text } from "react-native";
export function RoutineMenu({
  visible,
  favorite,
  onEdit,
  onDuplicate,
  onFavorite,
  onMove,
  onArchive,
  onClose,
}: {
  visible: boolean;
  favorite: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onFavorite: () => void;
  onMove: () => void;
  onArchive: () => void;
  onClose: () => void;
}) {
  const item = (label: string, action: () => void, danger = false) => (
    <Pressable
      key={label}
      onPress={() => {
        onClose();
        action();
      }}
      className="min-h-[52px] justify-center rounded-xl px-3"
    >
      <Text
        className={
          danger ? "font-semibold text-red-300" : "font-semibold text-white/70"
        }
      >
        {label}
      </Text>
    </Pressable>
  );
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 justify-end bg-black/65" onPress={onClose}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          className="rounded-t-[28px] bg-[#101113] px-5 pb-9 pt-5"
        >
          {item("Edit routine", onEdit)}
          {item("Duplicate", onDuplicate)}
          {item(favorite ? "Remove favorite" : "Add to favorites", onFavorite)}
          {item("Move to folder", onMove)}
          {item("Archive routine", onArchive, true)}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
