import { useProgramResource } from "@/src/features/program-follow/use-program-resource";
import React, { useCallback } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { programFollowApi, shortDate } from "@/src/features/program-follow/api";

export default function ProgramHistoryScreen() {
  const { data, loading, error, refresh } = useProgramResource(useCallback(() => programFollowApi.history(), []));
  const items = data ?? [];
  return <View className="flex-1 bg-bg"><View className="flex-row items-center gap-4 px-5 py-3"><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/train")} className="h-11 w-11 items-center justify-center rounded-full bg-panel"><MaterialCommunityIcons name="arrow-left" size={23} color={C.ink} /></Pressable><Txt weight="bold" className="text-xl">Program history</Txt></View><ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 150 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={C.brand} />}>
    <Txt className="mb-6 text-sm leading-6 text-muted">Every program is a chapter. Switching keeps your workouts and progress right here.</Txt>
    {error ? <Pressable accessibilityRole="button" onPress={() => void refresh()} className="mb-4 rounded-2xl bg-panel p-4"><Txt className="text-sm">{error}</Txt><Txt className="mt-2 text-brand">Retry</Txt></Pressable> : null}
    {loading && !items.length ? <ActivityIndicator color={C.brand} /> : !error && !items.length ? <Txt className="py-6 text-center text-muted">Follow your first program to start your story.</Txt> : null}
    {items.map(item => <Pressable accessibilityRole="button" key={item.id} onPress={() => router.push({ pathname: "/programs/[id]", params: { id: item.id } })} className="mb-3 flex-row items-center gap-3 rounded-[22px] bg-panel p-4"><View className="h-14 w-14 overflow-hidden rounded-2xl bg-brand/10">{item.cover_url ? <Image source={{ uri: item.cover_url }} style={{ width: 56, height: 56 }} contentFit="cover" /> : <View className="flex-1 items-center justify-center"><MaterialCommunityIcons name="calendar-check-outline" size={25} color={C.brand} /></View>}</View><View className="flex-1"><Txt weight="bold">{item.program_name}</Txt><Txt className="mt-1 text-xs text-muted">{shortDate(item.start_date)} · {item.duration_weeks} weeks</Txt><Txt className="mt-1 text-xs capitalize text-brand">{item.status === "active" ? "Following" : item.status}</Txt></View><MaterialCommunityIcons name="chevron-right" size={22} color={C.muted} /></Pressable>)}
    <Pressable accessibilityRole="button" onPress={() => router.push("/explore/programs")} className="mt-4 items-center rounded-full bg-brand py-4"><Txt weight="bold" className="text-bg">Explore programs</Txt></Pressable>
  </ScrollView></View>;
}
