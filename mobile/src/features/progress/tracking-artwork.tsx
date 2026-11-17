import React, { useId } from "react";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

type ArtworkProps = { size?: number; progress?: number };

function boundedProgress(progress: number) {
  return Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
}

/** Decorative artwork: the surrounding card supplies its label and progress. */
export function StepsArtwork({ size = 144, progress = 0 }: ArtworkProps) {
  const id = `steps-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const circumference = 2 * Math.PI * 66;
  const completion = boundedProgress(progress);

  return (
    <Svg width={size} height={size} viewBox="0 0 180 180" accessible={false}>
      <Defs>
        <LinearGradient id={`${id}-upper`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#E5FCB5" />
          <Stop offset="0.55" stopColor="#C5F460" />
          <Stop offset="1" stopColor="#82AD36" />
        </LinearGradient>
        <LinearGradient id={`${id}-sole`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F8F9EE" />
          <Stop offset="1" stopColor="#B5C39C" />
        </LinearGradient>
      </Defs>
      <Circle cx="91" cy="86" r="67" fill="#C5F460" fillOpacity={0.035} />
      <Circle
        cx="91"
        cy="86"
        r="66"
        fill="none"
        stroke="#C5F460"
        strokeOpacity={0.1}
        strokeWidth="2"
      />
      {completion > 0 ? (
        <Circle
          cx="91"
          cy="86"
          r="66"
          fill="none"
          stroke="#C5F460"
          strokeOpacity={0.7}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - completion)}
          rotation="-100"
          origin="91, 86"
        />
      ) : null}
      <Ellipse cx="97" cy="143" rx="57" ry="8" fill="#000000" fillOpacity={0.22} />
      <G rotation="-13" origin="94, 101">
        <Path
          d="M38 108 44 62Q46 55 53 59L74 72 83 62Q86 59 90 64L105 87Q110 94 126 96L139 98Q153 102 154 114L147 125 55 129 36 119Z"
          fill={`url(#${id}-upper)`}
        />
        <Path d="m44 65 17 15 13-8-5 19-24 1Z" fill="#293926" />
        <Path d="m81 66 9 16 14 9-17 13-15-18Z" fill="#E1F9BC" />
        <Path d="M41 94 61 96 66 114 38 115Z" fill="#83B33B" />
        <Path d="m80 105 14-13 13 8 20 4-5 8-19-5-16 9Z" fill="#293926" />
        <Path
          d="M37 111Q65 121 92 116L153 110 155 121Q153 129 141 131L52 135Q36 135 34 126Z"
          fill={`url(#${id}-sole)`}
        />
        <Path d="M35 126Q65 134 98 127L153 120" fill="none" stroke="#52613D" strokeWidth="2" />
        <Path
          d="m70 85 15-2m-11 9 16-3m-11 10 15-4"
          fill="none"
          stroke="#F5FFE4"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <Path
          d="m126 103 13 2"
          fill="none"
          stroke="#E5FCB5"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <Path
          d="m56 130 1 4m14-4 1 4m14-5 1 4m14-6 1 4m14-6 1 4m14-6 1 4"
          stroke="#52613D"
          strokeWidth="2"
        />
      </G>
      <Path
        d="M15 88h16M10 99h16M18 110h9"
        fill="none"
        stroke="#C5F460"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity={0.65}
      />
      <Circle cx="144" cy="40" r="5" fill="#C5F460" />
      <Circle cx="153" cy="53" r="2" fill="#C5F460" fillOpacity={0.4} />
    </Svg>
  );
}

export function WaterArtwork({ size = 144, progress = 0 }: ArtworkProps) {
  const id = `water-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const completion = boundedProgress(progress);
  const waterTop = 145 - completion * 89;
  const bottle =
    "M70 41H108V51Q108 57 116 65Q120 70 120 79V138Q120 148 109 148H69Q58 148 58 138V79Q58 70 62 65Q70 57 70 51Z";

  return (
    <Svg width={size} height={size} viewBox="0 0 180 180" accessible={false}>
      <Defs>
        <LinearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#B9E2FC" stopOpacity={0.2} />
          <Stop offset="0.5" stopColor="#8FC8F5" stopOpacity={0.04} />
          <Stop offset="1" stopColor="#8FC8F5" stopOpacity={0.13} />
        </LinearGradient>
        <LinearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#8FC8F5" />
          <Stop offset="1" stopColor="#3B81B4" />
        </LinearGradient>
        <ClipPath id={`${id}-bottle`}>
          <Path d={bottle} />
        </ClipPath>
      </Defs>
      <Circle cx="91" cy="88" r="67" fill="#8FC8F5" fillOpacity={0.045} />
      <Circle
        cx="91"
        cy="88"
        r="57"
        fill="none"
        stroke="#8FC8F5"
        strokeOpacity={0.09}
        strokeDasharray="3 8"
      />
      <Ellipse cx="91" cy="154" rx="40" ry="7" fill="#000000" fillOpacity={0.22} />
      <G rotation="8" origin="89, 90">
        <Path d={bottle} fill={`url(#${id}-glass)`} />
        {completion > 0 ? (
          <G clipPath={`url(#${id}-bottle)`}>
            <Path
              d={`M53 ${waterTop + 2}Q69 ${waterTop - 5} 88 ${waterTop + 2}T125 ${waterTop + 2}V151H53Z`}
              fill={`url(#${id}-fill)`}
              fillOpacity={0.88}
            />
            <Path
              d={`M53 ${waterTop + 2}Q69 ${waterTop - 5} 88 ${waterTop + 2}T125 ${waterTop + 2}`}
              fill="none"
              stroke="#C1E9FF"
              strokeWidth="1.5"
            />
            <Circle cx="78" cy="132" r="3" fill="#D8F2FF" fillOpacity={0.35} />
            <Circle cx="100" cy="117" r="2" fill="#D8F2FF" fillOpacity={0.35} />
          </G>
        ) : null}
        <Path d={bottle} fill="none" stroke="#8FC8F5" strokeWidth="2" strokeOpacity={0.7} />
        <Path
          d="M66 86v44q0 9 8 10"
          fill="none"
          stroke="#DAF3FF"
          strokeOpacity={0.48}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <Rect x="68" y="29" width="42" height="16" rx="5" fill="#8FC8F5" />
        <Path
          d="M73 34h32M74 39h30"
          stroke="#40657A"
          strokeOpacity={0.5}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <Rect x="72" y="23" width="34" height="9" rx="4" fill="#C5E6FA" />
        <Path
          d="M107 74h6m-6 16h6m-6 16h6m-6 16h6"
          stroke="#D8F2FF"
          strokeOpacity={0.5}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </G>
      <Path d="M140 74q-9 11-9 16a9 9 0 0 0 18 0q0-5-9-16Z" fill="#8FC8F5" />
      <Path
        d="M135 89q0 5 4 6"
        stroke="#E0F3FF"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <Circle
        cx="36"
        cy="62"
        r="4"
        fill="none"
        stroke="#8FC8F5"
        strokeOpacity={0.6}
        strokeWidth="2"
      />
      <Circle cx="40" cy="47" r="2" fill="#8FC8F5" fillOpacity={0.35} />
    </Svg>
  );
}

export function NutritionArtwork({ size = 144 }: { size?: number }) {
  const id = `nutrition-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <Svg width={size} height={size} viewBox="0 0 180 180" accessible={false}>
      <Defs>
        <LinearGradient id={`${id}-plate`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F5EBCE" />
          <Stop offset="1" stopColor="#B9A579" />
        </LinearGradient>
        <LinearGradient id={`${id}-protein`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#E9B98A" />
          <Stop offset="1" stopColor="#AE6E43" />
        </LinearGradient>
      </Defs>
      <Circle cx="91" cy="87" r="67" fill="#EBC887" fillOpacity={0.045} />
      <Ellipse cx="91" cy="140" rx="57" ry="8" fill="#000000" fillOpacity={0.22} />
      <Path d="M31 92q0 51 59 51t59-51Z" fill="#9A8967" />
      <Ellipse cx="90" cy="92" rx="60" ry="47" fill={`url(#${id}-plate)`} />
      <Ellipse cx="90" cy="91" rx="50" ry="38" fill="#292D24" />
      <Ellipse cx="90" cy="92" rx="47" ry="35" fill="#373B2D" />
      <G fill="#83AB57" stroke="#5B7B3C" strokeWidth="1.4">
        <Path d="M45 83q-5-14 8-17-1-13 13-11 10-12 18 0 13-2 14 11-4 18-28 27Z" />
        <Path d="M47 94q-10-11 0-17 0-12 12-9 9-10 16 0 12 1 10 13-8 15-24 21Z" fill="#A4C973" />
      </G>
      <Path
        d="m53 87 22-19m-13 10-2-9m7 4 9 1M51 92l13-3"
        stroke="#C4E596"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <Path d="M64 104q-3-15 12-21 14-8 30 0 16 7 13 21-4 17-25 17-21 3-30-17Z" fill="#DEDAC0" />
      <Path
        d="m75 94 4-2m7-2 4 2m8-1 4 2m-34 9 4 2m8-5 4 1m10-3 4 2m8 0 3 2m-35 5 3 1m8-5 4 2m9 0 4 1m-15 7 4 1"
        stroke="#FFFFEC"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <G rotation="-27" origin="112, 81">
        <Rect x="94" y="57" width="34" height="51" rx="12" fill="#7B4D30" />
        <Rect x="92" y="54" width="34" height="49" rx="12" fill={`url(#${id}-protein)`} />
        <Path
          d="M98 65h21m-22 10h22m-22 10h21m-18 9h13"
          stroke="#925E37"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <Path d="m98 59 2-1" stroke="#F5D7AB" strokeWidth="3" strokeLinecap="round" />
      </G>
      <Circle cx="55" cy="101" r="8" fill="#D9785C" />
      <Circle cx="54" cy="99" r="5" fill="#E99C7C" />
      <Path d="m52 96 2 6m-5-3 8-1" stroke="#F5C5A0" strokeWidth="1" />
      <Circle cx="122" cy="112" r="7" fill="#D9785C" />
      <Path d="m119 110 5 4m-5 0 5-4" stroke="#F5B58B" strokeWidth="1.3" />
      <G
        stroke="#C7B68F"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
        rotation="11"
        origin="157, 93"
      >
        <Path d="M157 65v61M152 59v12q0 6 5 6t5-6V59M157 59v13" />
      </G>
      <Circle cx="45" cy="39" r="5" fill="#EBC887" />
      <Circle cx="34" cy="48" r="2" fill="#EBC887" fillOpacity={0.45} />
      <Line
        x1="137"
        y1="42"
        x2="137"
        y2="50"
        stroke="#EBC887"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Line
        x1="133"
        y1="46"
        x2="141"
        y2="46"
        stroke="#EBC887"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}
