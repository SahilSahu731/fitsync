import React from "react";
import { View } from "react-native";
import Svg, { G, Path, Rect } from "react-native-svg";

// Native equivalents of assets/tabs/*.svg. Pixel tests keep the artwork in sync.
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
    <>
      <Path d="M12 6.3C9.4 4.7 6.4 4.4 3.5 5.2v13c2.9-.8 5.9-.5 8.5 1.1 2.6-1.6 5.6-1.9 8.5-1.1v-13C17.6 4.4 14.6 4.7 12 6.3Z" />
      <Path d="M12 6.3v13M6.75 9l2.25.4M15 9.4l2.25-.4M6.75 12l2.25.4M15 12.4l2.25-.4" />
    </>
  ),
  pro: (
    <>
      <Path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" />
      <Path d="m18 3 .8 2.2L21 6l-2.2.8L18 9l-.8-2.2L15 6l2.2-.8Z" />
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
        viewBox="0 0 24 24"
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
