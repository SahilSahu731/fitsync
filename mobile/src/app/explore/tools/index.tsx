import React from "react";

import { ScrollView, View } from "react-native";

import { useRouter } from "expo-router";

import { ExploreHeader, ToolTile } from "@/src/features/explore/components";
// eslint-disable-next-line import/no-unresolved
import { TOOLS } from "@/src/features/explore/tools";


export default function ExploreToolsScreen() {
  const router = useRouter();

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
