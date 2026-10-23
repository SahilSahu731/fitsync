import React, { useState } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { C } from "@/src/constants/theme";

export function ExerciseImage({ uri, name, size = 52 }: { uri?: string | null; name: string; size?: number }) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  return <View style={{ width: size, height: size, borderRadius: 12, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: C.elevated }}>
    {uri && uri !== failedUri ? <Image source={{ uri }} style={{ width: size, height: size }} contentFit="contain" cachePolicy="memory-disk" recyclingKey={uri} accessibilityLabel={`${name} demonstration`} onError={() => setFailedUri(uri)} /> : <MaterialCommunityIcons name="dumbbell" size={size / 2} color={C.brand} />}
  </View>;
}
