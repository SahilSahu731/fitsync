import React from "react";

import { Pressable, ScrollView, View } from "react-native";

import { Txt } from "@/src/components/ui";
import { useRouter } from "expo-router";

import { ExploreHeader, ToolTile } from "@/src/features/explore/components";
import { usePublishedTools } from "@/src/features/explore/use-tools";


export default function ExploreToolsScreen() {
  const router = useRouter();
  const { tools: TOOLS, loading: toolsLoading, error: toolsError, reload: reloadTools } = usePublishedTools();

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{
        padding: 20,
        paddingBottom: 110,
      }}
    >
      <ExploreHeader
        title="Fitness tools"
        subtitle="Small practical helpers for every training day."
        onBack={() => router.back()}
      />

      {toolsError && <Pressable onPress={reloadTools}><Txt className="mb-4 text-brand">{toolsError} Tap to retry.</Txt></Pressable>}
      {!toolsError && !TOOLS.length && <Txt className="text-muted">{toolsLoading ? "Loading tools…" : "No published tools yet."}</Txt>}
      <View className="gap-3">
        {Array.from(
          {
            length: Math.ceil(TOOLS.length / 2),
          },
          (_, i) => {
            const row = TOOLS.slice(i * 2, i * 2 + 2);

            return (
              <View key={i} className="flex-row gap-3">
                {row.map((tool) => (
                  <ToolTile
                    key={tool.id}
                    tool={tool}
                    onPress={() =>
                      router.push({
                        pathname: "/explore/tools/[slug]",
                        params: {
                          slug: tool.id,
                        },
                      })
                    }
                  />
                ))}

                {row.length === 1 ? <View className="flex-1" /> : null}
              </View>
            );
          },
        )}
      </View>
    </ScrollView>
  );
}
