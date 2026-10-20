
import React from "react";
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Rect,
  Text as SvgText
} from "react-native-svg";

import { C } from "@/src/constants/theme";

export function AthleteArt({
  width = 340,
  height = 290
}: {
  width?: number;
  height?: number;
}) {
  return (
    <Svg width={width} height={height} viewBox="0 0 350 300">
      <Circle
        cx="175"
        cy="145"
        r="119"
        fill="#171719"
        stroke="#363638"
        strokeWidth="1"
      />

      <Circle
        cx="175"
        cy="145"
        r="93"
        fill="none"
        stroke="#252528"
        strokeWidth="20"
      />

      <Path
        d="M36 264L90 22"
        stroke="#FF7838"
        strokeWidth="2"
        opacity="0.7"
      />

      <Path
        d="M248 272L332 36"
        stroke="#FF7838"
        strokeWidth="2"
        opacity="0.5"
      />

      <Path
        d="M47 47H103M246 240h53"
        stroke="#FF7838"
        strokeWidth="4"
        strokeLinecap="round"
      />

      <G transform="translate(20 11)">
        <Line
          x1="42"
          y1="58"
          x2="270"
          y2="58"
          stroke="#F8F7F4"
          strokeWidth="7"
          strokeLinecap="round"
        />

        <Rect x="29" y="23" width="20" height="70" rx="5" fill="#FF7838"/>
        <Rect x="17" y="35" width="11" height="46" rx="3" fill="#F8F7F4"/>
        <Rect x="269" y="23" width="20" height="70" rx="5" fill="#FF7838"/>
        <Rect x="291" y="35" width="11" height="46" rx="3" fill="#F8F7F4"/>

        <Circle cx="163" cy="99" r="28" fill="#F8F7F4"/>

        <Path
          d="M146 93C148 69 180 74 184 95"
          fill="none"
          stroke="#FF7838"
          strokeWidth="7"
          strokeLinecap="round"
        />

        <Path
          d="M137 138Q163 114 188 138L209 186 195 209 181 191 168 152 158 194 139 209 127 188Z"
          fill="#FF7838"
        />

        <Path
          d="M137 145L95 109 77 64M185 146L224 109 244 65"
          fill="none"
          stroke="#F8F7F4"
          strokeWidth="18"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <Path
          d="M150 208L130 261M185 207L207 263"
          fill="none"
          stroke="#F8F7F4"
          strokeWidth="20"
          strokeLinecap="round"
        />

        <Path
          d="M117 269H146M195 269H226"
          stroke="#FF7838"
          strokeWidth="14"
          strokeLinecap="round"
        />
      </G>

      <SvgText
        x="17"
        y="286"
        fill={C.brand}
        fontSize="12"
        fontWeight="bold"
        letterSpacing="4"
      >
        PUSH YOUR LIMITS.
      </SvgText>
    </Svg>
  );
}
