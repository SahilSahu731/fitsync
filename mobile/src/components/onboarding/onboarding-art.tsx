
import React from "react";
import Svg, {
  Circle,
  Ellipse,
  G,
  Line,
  Path,
  Rect,
  Text as SvgText
} from "react-native-svg";

import { C } from "@/src/constants/theme";

export type ArtVariant =
  | "welcome"
  | "gender"
  | "height"
  | "weight"
  | "build"
  | "goal"
  | "experience"
  | "days"
  | "equipment"
  | "complete";

type Frame = "slim" | "medium" | "broad";

export function BodyFigure({
  frame = "medium",
  size = 95,
  color = C.ink
}: {
  frame?: Frame;
  size?: number;
  color?: string;
}) {
  const shoulder = frame === "slim" ? 17 : frame === "medium" ? 22 : 28;
  const waist = frame === "slim" ? 11 : frame === "medium" ? 16 : 22;
  const cx = 50;

  return (
    <Svg width={size} height={size * 1.42} viewBox="0 0 100 142">
      <Circle cx={cx} cy="18" r="13" fill={color} />
      <Path
        d={`M${cx - shoulder} 39
          Q${cx} 32 ${cx + shoulder} 39
          L${cx + waist} 87
          L${cx - waist} 87 Z`}
        fill={color}
      />
      <Line x1={cx - shoulder + 1} y1="46" x2={cx - shoulder - 5} y2="89" stroke={color} strokeWidth={frame === "broad" ? 11 : 8} strokeLinecap="round"/>
      <Line x1={cx + shoulder - 1} y1="46" x2={cx + shoulder + 5} y2="89" stroke={color} strokeWidth={frame === "broad" ? 11 : 8} strokeLinecap="round"/>
      <Line x1="41" y1="91" x2="38" y2="133" stroke={color} strokeWidth={frame === "broad" ? 14 : 11} strokeLinecap="round"/>
      <Line x1="59" y1="91" x2="62" y2="133" stroke={color} strokeWidth={frame === "broad" ? 14 : 11} strokeLinecap="round"/>
      <Path d="M34 62H66" stroke={C.bg} strokeWidth="2" opacity=".22"/>
      <Path d="M50 43V81" stroke={C.bg} strokeWidth="2" opacity=".2"/>
    </Svg>
  );
}

export function OnboardingArt({
  variant,
  height = 232
}: {
  variant: ArtVariant;
  height?: number;
}) {
  const isMultiple = variant === "gender" || variant === "build";
  const isRuler = variant === "height";
  const isScale = variant === "weight";

  return (
    <Svg width="100%" height={height} viewBox="0 0 360 235">
      <Rect width="360" height="235" rx="26" fill="#1B1B1D"/>
      <Circle cx="180" cy="117" r="88" fill="#FF7838" opacity=".12"/>
      <Circle cx="180" cy="117" r="67" fill="none" stroke="#FF7838" strokeWidth="1.5" opacity=".38"/>
      <Circle cx="180" cy="117" r="108" fill="none" stroke="#343436" strokeDasharray="5 7"/>
      <Path d="M21 24H64M296 209H338" stroke={C.brand} strokeWidth="3" strokeLinecap="round"/>
      <Circle cx="306" cy="32" r="5" fill={C.brand}/>
      <Circle cx="48" cy="198" r="3" fill={C.brand}/>

      {isMultiple ? (
        <>
          <G transform="translate(40 42)">
            <BodyFigure frame="slim" color="#BDB9B5" size={84}/>
          </G>
          <G transform="translate(131 18)">
            <BodyFigure frame="medium" color={C.brand} size={96}/>
          </G>
          <G transform="translate(241 41)">
            <BodyFigure frame="broad" color="#EEEAE6" size={84}/>
          </G>
        </>
      ) : isRuler ? (
        <>
          <G transform="translate(90 23)">
            <BodyFigure frame="medium" size={118} color="#F1EDE7"/>
          </G>
          <Rect x="273" y="23" width="10" height="181" rx="4" fill="#555257"/>
          {Array.from({ length: 16 }, (_, i) => (
            <Line
              key={i}
              x1={i % 5 === 0 ? 258 : 267}
              y1={32 + i * 11}
              x2="283"
              y2={32 + i * 11}
              stroke={i % 5 === 0 ? C.brand : "#D8D5D2"}
              strokeWidth={i % 5 === 0 ? 2 : 1}
            />
          ))}
          <Path d="M249 91L264 83V99Z" fill={C.brand}/>
        </>
      ) : isScale ? (
        <>
          <G transform="translate(112 4)">
            <BodyFigure frame="medium" size={140} color="#F4F0EA"/>
          </G>
          <Ellipse cx="180" cy="210" rx="66" ry="13" fill={C.brand} opacity=".5"/>
          <Rect x="127" y="196" width="106" height="17" rx="8" fill="#FAF5EF"/>
          <Rect x="164" y="198" width="32" height="11" rx="3" fill={C.bg}/>
        </>
      ) : (
        <>
          <G transform="translate(113 0)">
            <BodyFigure frame={variant === "goal" ? "broad" : "medium"} size={140} color="#F1EDE7"/>
          </G>
          <Path d="M68 160L91 129M274 74L298 51" stroke={C.brand} strokeWidth="6" strokeLinecap="round"/>
          <Path d="M280 160L308 160M53 75L82 75" stroke={C.brand} strokeWidth="3" strokeLinecap="round"/>
        </>
      )}

      <SvgText x="23" y="220" fontSize="9" fontWeight="bold" letterSpacing="3" fill={C.brand}>
        FITSYNC / ATHLETE SYSTEM
      </SvgText>
    </Svg>
  );
}
