import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Txt, PrimaryButton } from "@/src/components/ui";
import { useAppAlert } from "@/src/components/app-dialog";
import { useSession, type Goal, type Equipment, type Experience } from "@/src/context/session";
import { GOAL_LABELS, EQUIPMENT_LABELS, localDate, localTimezone } from "./model";
import { Choice, CoachHeader } from "./components";
import { useCoaching } from "./use-coaching";

export function CoachSetupScreen() {
  const { profile, updateFitness } = useSession();
  const { alert } = useAppAlert();
  const resource = useCoaching();
  const [goal, setGoal] = useState<Goal>(profile?.goal ?? "fitness");
  const [equipment, setEquipment] = useState<Equipment>(profile?.equipment ?? "bodyweight");
  const [experience, setExperience] = useState<Experience>(profile?.experience ?? "beginner");
  const [days, setDays] = useState(profile?.trainingDays ?? 3);
  const [minutes, setMinutes] = useState<30 | 45 | 60>(profile?.minutesPerWorkout ?? 30);
  const save = async () => {
    try {
      if (!profile) { router.push("/onboarding"); return; }
      const result = await resource.mutate(`create:${resource.data?.plan?.id ?? "new"}:${goal}:${equipment}:${experience}:${days}:${minutes}`, async requestId => {
        await updateFitness({ goal, equipment, experience, trainingDays: days, minutesPerWorkout: minutes });
        return resource.api.create({ requestId, startDate: localDate(), timezone: localTimezone(), ...(resource.data?.plan ? { replacePlanId: resource.data.plan.id } : {}) });
      });
      if (result) router.replace("/coach");
    } catch (failure) { alert("Could not build your plan", failure instanceof Error ? failure.message : "Please try again.", undefined, "error"); }
  };
  const disabled = resource.busy || resource.loading;
  return <View className="flex-1 bg-bg"><CoachHeader title="Make it yours" subtitle="A starting plan is included with Free" /><ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 80 }}>
    <Txt weight="extra" className="text-[34px] leading-[39px] tracking-[-0.8px]">One plan. Your pace.</Txt><Txt className="mb-7 mt-3 text-base leading-6 text-muted">Choose what matters to you. We will build four weeks of movement with a clear starting point.</Txt>
    {!profile && <View className="mb-5 rounded-2xl bg-panel p-4"><Txt className="text-sm leading-6">Complete your fitness profile first so your plan has the basics it needs.</Txt><View className="mt-3"><PrimaryButton title="Complete setup" onPress={() => router.push("/onboarding")} /></View></View>}
    <Txt weight="semibold" className="mb-3 text-lg">Your main goal</Txt><View className="mb-7 gap-2">{(Object.keys(GOAL_LABELS) as Goal[]).map(value => <Choice key={value} value={value} label={GOAL_LABELS[value]} selected={goal === value} onSelect={setGoal} disabled={disabled} />)}</View>
    <Txt weight="semibold" className="mb-3 text-lg">What can you train with?</Txt><View className="mb-7 flex-row flex-wrap gap-2">{(Object.keys(EQUIPMENT_LABELS) as Equipment[]).map(value => <Choice key={value} value={value} label={EQUIPMENT_LABELS[value]} selected={equipment === value} onSelect={setEquipment} disabled={disabled} />)}</View>
    <Txt weight="semibold" className="mb-3 text-lg">Your experience</Txt><View className="mb-7 flex-row flex-wrap gap-2">{(["beginner", "intermediate", "advanced"] as Experience[]).map(value => <Choice key={value} value={value} label={value.charAt(0).toUpperCase() + value.slice(1)} selected={experience === value} onSelect={setExperience} disabled={disabled} />)}</View>
    <Txt weight="semibold" className="mb-3 text-lg">Days you can make time</Txt><View className="mb-2 flex-row flex-wrap gap-2">{[1, 2, 3, 4, 5, 6, 7].map(value => <Choice key={value} value={value} label={String(value)} selected={days === value} onSelect={setDays} disabled={disabled} />)}</View><Txt className="mb-7 text-xs leading-5 text-muted">Your plan includes recovery space. The schedule will explain how training days fit your experience.</Txt>
    <Txt weight="semibold" className="mb-3 text-lg">Time per session</Txt><View className="mb-7 flex-row flex-wrap gap-2">{([30, 45, 60] as const).map(value => <Choice key={value} value={value} label={`${value} min`} selected={minutes === value} onSelect={setMinutes} disabled={disabled} />)}</View>
    {resource.data?.plan && <Txt className="mb-4 text-sm leading-6 text-muted">This replaces your current plan. Your completed workout history stays in Progress.</Txt>}
    {resource.error && <Txt className="mb-4 text-sm leading-6" style={{ color: "#FF9A94" }}>{resource.error}</Txt>}
    <PrimaryButton title={resource.data?.plan ? "Build my new plan" : "Build my starting plan"} onPress={() => void save()} loading={resource.busy} disabled={!profile || resource.loading || !!resource.error && !resource.data} />
  </ScrollView></View>;
}
