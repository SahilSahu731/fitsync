import React from "react";
import { View } from "react-native";
import { Txt } from "@/src/components/ui";
import { Segments } from "./segments";
import type { StepProps } from "./config";

export function AboutStep({ draft, update }: StepProps) {
  return <View className="gap-[28px]">
    <View>
      <Txt weight="semibold" className="text-[17px] mb-[14px]">Gender</Txt>
      <Segments label="Gender" value={draft.gender} options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "prefer_not_to_say", label: "Prefer not to say" }] as const} onChange={gender => update({ gender })} />
    </View>
    <View>
      <Txt weight="semibold" className="text-[17px] mb-[14px]">How would you describe your build?</Txt>
      <Segments label="Body build" value={draft.bodyType} options={[{ value: "slim", label: "Slim" }, { value: "medium", label: "Medium" }, { value: "broad", label: "Broad" }, { value: null, label: "Skip" }] as const} onChange={bodyType => update({ bodyType })} />
    </View>
    <Txt className="text-muted text-[14px] leading-[22px]">No labels to live up to. Just a little context for your profile.</Txt>
  </View>;
}
