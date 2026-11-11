import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

export type TabArtworkName = "home" | "train" | "library" | "progress" | "profile";

/** Original FitSync navigation marks: shelter, linked weights, folio, trajectory, person. */
export function TabArtwork({
  name,
  color,
  selected = false,
}: {
  name: TabArtworkName;
  color: string;
  selected?: boolean;
}) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={false}
    >
      {name === "home" && (
        <>
          <Path d="M3.5 10.2 10 4.5a3 3 0 0 1 4 0l6.5 5.7M5.5 9v9.5A2 2 0 0 0 7.5 20h9a2 2 0 0 0 2-1.5V9" />
          <Path d="M9 20v-5a3 3 0 0 1 6 0v5" />
          <Circle cx={17.8} cy={4.8} r={1.1} fill={selected ? color : "none"} strokeWidth={1.3} />
        </>
      )}
      {name === "train" && (
        <>
          <Path d="m8.6 15.4 6.8-6.8m-4.7 8.9 6.8-6.8M3.3 15.2l5.5 5.5m6.4-17.4 5.5 5.5" />
          <Path
            d="M4.7 12.8 7 10.5l6.5 6.5-2.3 2.3a1.5 1.5 0 0 1-2.1 0l-4.4-4.4a1.5 1.5 0 0 1 0-2.1ZM12.8 4.7l2.1-2.1a1.5 1.5 0 0 1 2.1 0l4.4 4.4a1.5 1.5 0 0 1 0 2.1l-2.1 2.1Z"
            fill={selected ? color : "none"}
            fillOpacity={0.12}
          />
        </>
      )}
      {name === "library" && (
        <>
          <Path d="m6 5 10.8-1.9a1.5 1.5 0 0 1 1.7 1.2l2.1 11.4M3.5 9 5 7.5" />
          <Rect
            x={5.5}
            y={7}
            width={12}
            height={14}
            rx={2.5}
            fill={selected ? color : "none"}
            fillOpacity={0.1}
          />
          <Path d="M9 11h5M9 14h3M9 18h5" />
          <Path d="m15 3.5.6 3.5" />
        </>
      )}
      {name === "progress" && (
        <>
          <Path d="M4 18.5c3.5 0 3.2-6 6.5-6s3 3 5.5.2C18.5 10 18.5 5.5 21 4" />
          <Path d="m16.8 4.7 4.2-.8-.5 4.3M4 8v13h16" />
          <Circle cx={10.5} cy={12.5} r={1.6} fill={selected ? color : "none"} strokeWidth={1.4} />
        </>
      )}
      {name === "profile" && (
        <>
          <Path
            d="M15.8 6.5a3.8 3.8 0 1 1-7.6 0 3.8 3.8 0 0 1 7.6 0Z"
            fill={selected ? color : "none"}
            fillOpacity={0.12}
          />
          <Path d="M4.5 20c.4-4.1 3-6.5 7.5-6.5s7.1 2.4 7.5 6.5M8 20h8" />
          <Circle cx={20} cy={11.5} r={1.1} fill={color} stroke="none" />
        </>
      )}
    </Svg>
  );
}
