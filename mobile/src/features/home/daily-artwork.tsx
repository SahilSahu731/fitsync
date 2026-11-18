import React from "react";
import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";

const bounded = (ratio: number) => (Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : 0);

/** Decorative only; the adjacent card supplies the value and goal. */
export function HydrationMark({ ratio = 0 }: { ratio?: number }) {
  const fill = bounded(ratio) * 43;
  return (
    <Svg width={60} height={66} viewBox="0 0 76 84" accessible={false}>
      <Ellipse cx="38" cy="77" rx="22" ry="3" fill="#FFFFFF" fillOpacity={0.04} />
      <Path
        d="M29 20V15h18v5q0 5 6 10v36q0 8-8 8H31q-8 0-8-8V30q6-5 6-10Z"
        fill="#FFFFFF"
        fillOpacity={0.04}
        stroke="#FFFFFF"
        strokeOpacity={0.5}
        strokeWidth={1.5}
      />
      {fill > 0 && (
        <Rect
          x="26"
          y={71 - fill}
          width="24"
          height={fill}
          rx="5"
          fill="#FFFFFF"
          fillOpacity={0.7}
        />
      )}
      <Rect x="28" y="8" width="20" height="9" rx="3" fill="#E5E5E5" />
      <Path d="M31 11h14M31 14h14" stroke="#111111" strokeOpacity={0.4} />
      <Path
        d="M29 36v25q0 7 4 7M45 37h4m-4 10h4m-4 10h4"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity={0.45}
        strokeLinecap="round"
        strokeWidth={1.5}
      />
    </Svg>
  );
}

export function MovementMark({ ratio = 0 }: { ratio?: number }) {
  const circumference = 2 * Math.PI * 32;
  const completion = bounded(ratio);
  return (
    <Svg width={66} height={66} viewBox="0 0 84 84" accessible={false}>
      <Circle
        cx="42"
        cy="42"
        r="32"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity={0.08}
        strokeWidth={3}
      />
      {completion > 0 && (
        <Circle
          cx="42"
          cy="42"
          r="32"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - completion)}
          rotation={-90}
          origin="42, 42"
        />
      )}
      <Path
        d="m23 42 3-14 9 8 6-5 9 13q3 4 11 4l3 7q-1 4-7 4H28q-7 0-7-6Z"
        fill="#FFFFFF"
        fillOpacity={0.12}
        stroke="#FFFFFF"
        strokeOpacity={0.75}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Path
        d="m36 38 6-2m-3 6 6-2m-21 12h38"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}
