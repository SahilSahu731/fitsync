import React, { useState } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { C } from "@/src/constants/theme";

export function ExerciseImage({
  uri,
  name,
  size = 52,
  round = false,
}: {
  uri?: string | null;
  name: string;
  size?: number;
  round?: boolean;
}) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const imageStyle = {
    width: size,
    height: size,
    borderRadius: round ? size / 2 : 12,
    overflow: "hidden" as const,
    backgroundColor: C.elevated,
  };
  if (uri && uri !== failedUri) {
    return (
      <Image
        source={{ uri }}
        style={imageStyle}
        contentFit={round ? "cover" : "contain"}
        contentPosition="center"
        cachePolicy="memory-disk"
        recyclingKey={uri}
        accessibilityLabel={`${name} demonstration`}
        onError={() => setFailedUri(uri)}
      />
    );
  }
  return (
    <View style={[imageStyle, { alignItems: "center", justifyContent: "center" }]}>
      <MaterialCommunityIcons name="dumbbell" size={size / 2} color={C.ink} />
    </View>
  );
}
