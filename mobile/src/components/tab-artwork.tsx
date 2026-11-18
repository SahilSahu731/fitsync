import React from "react";
import { View } from "react-native";
import Svg, { G, Path, Rect } from "react-native-svg";

// Native equivalents of assets/tabs/*.svg.
const ARTWORK = {
  home: (
    <>
      <Path d="m3.5 10 7.2-5.8a2.1 2.1 0 0 1 2.6 0l7.2 5.8" />
      <Path d="M5.5 8.4v10.1a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8.4" />
      <Path d="M9.5 20.5v-6a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v6" />
    </>
  ),

  train: (
    <G transform="rotate(-40 12 12)">
      <Path d="M8 12h8M3 10v4M21 10v4" />
      <Rect x={5} y={7} width={3} height={10} rx={1} />
      <Rect x={16} y={7} width={3} height={10} rx={1} />
    </G>
  ),

  progress: (
    <>
      <Path d="M4 19.5h16" />
      <Path d="m4 15.5 5.5-5.5 4 3.5L20 6" />
      <Path d="M15 6h5v5" />
    </>
  ),

  library: (
    <G fill="currentColor" stroke="none">
      {/* First book */}
      <Rect x={3} y={3} width={4} height={20} rx={2} />

      {/* Second book */}
      <Rect x={9} y={3} width={4} height={20} rx={2} />

      {/* Third book — tilted */}
      <Rect x={15} y={4.4} width={4} height={20} rx={2} transform="rotate(-20 15 4.4)" />
    </G>
  ),
  pro: (
    <>
      {/* Diamond silhouette */}
      <Path d="M7.2 6.5h9.6l3.7 4.3L12 21 3.5 10.8l3.7-4.3Z" />

      {/* Diamond facets */}
      <Path d="M3.8 10.8h16.4M9 6.5l-1 4.3L12 21l4-10.2-1-4.3" />

      {/* Small premium sparkle */}
      <Path d="M19.5 2v3.5M17.75 3.75h3.5" />
    </>
  ),
};

export type TabArtworkName = keyof typeof ARTWORK;

type TabArtworkProps = {
  name: TabArtworkName;
  color: string;
  size?: number;
};

export function TabArtwork({ name, color, size = 24 }: TabArtworkProps) {
  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      className="shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <Svg
        width={size}
        height={size}
        viewBox={name === "library" ? "0 0 30 30" : "0 0 24 24"}
        color={color}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        accessible={false}
      >
        {ARTWORK[name]}
      </Svg>
    </View>
  );
}
