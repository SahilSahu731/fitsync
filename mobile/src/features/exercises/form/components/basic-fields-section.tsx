import { Text, TextInput } from "react-native";

interface Props {
  name: string;

  description: string;

  onNameChange: (value: string) => void;

  onDescriptionChange: (value: string) => void;
}

export function BasicFieldsSection({
  name,
  description,
  onNameChange,
  onDescriptionChange,
}: Props) {
  return (
    <>
      <Text className="text-[12px] font-bold uppercase tracking-[1.8px] text-white/35">
        Exercise
      </Text>

      <TextInput
        value={name}
        onChangeText={onNameChange}
        placeholder="Exercise name"
        placeholderTextColor="rgba(255,255,255,.25)"
        selectionColor="#3B82F6"
        className="mt-3 min-h-[58px] rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-[16px] font-semibold text-white"
      />

      <TextInput
        value={description}
        onChangeText={onDescriptionChange}
        placeholder="Short description (optional)"
        placeholderTextColor="rgba(255,255,255,.25)"
        selectionColor="#3B82F6"
        multiline
        className="mt-3 min-h-[100px] rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-[15px] leading-6 text-white"
      />
    </>
  );
}
