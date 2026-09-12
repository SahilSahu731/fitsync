import { Text, TextInput } from "react-native";

interface Props {
  instructionsText: string;

  tipsText: string;

  onInstructionsChange: (value: string) => void;

  onTipsChange: (value: string) => void;
}

export function GuidanceSection({
  instructionsText,
  tipsText,
  onInstructionsChange,
  onTipsChange,
}: Props) {
  return (
    <>
      <Text className="mt-8 text-[12px] font-bold uppercase tracking-[1.8px] text-white/35">
        Instructions
      </Text>

      <TextInput
        value={instructionsText}
        onChangeText={onInstructionsChange}
        placeholder="One instruction per line"
        placeholderTextColor="rgba(255,255,255,.25)"
        multiline
        selectionColor="#3B82F6"
        className="mt-3 min-h-[130px] rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-[14px] leading-6 text-white"
      />

      <Text className="mt-8 text-[12px] font-bold uppercase tracking-[1.8px] text-white/35">
        Tips
      </Text>

      <TextInput
        value={tipsText}
        onChangeText={onTipsChange}
        placeholder="One tip per line"
        placeholderTextColor="rgba(255,255,255,.25)"
        multiline
        selectionColor="#3B82F6"
        className="mt-3 min-h-[100px] rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-[14px] leading-6 text-white"
      />
    </>
  );
}
