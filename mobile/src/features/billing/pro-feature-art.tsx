import React from "react";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import type { ProArt } from "./pro-marketing-content";

const LIME = "#C5F460";
const WHITE = "#ECEEEC";
const GRAY = "#777D77";
function Label({
  x,
  y,
  children,
  size = 8,
  color = WHITE,
}: {
  x: number;
  y: number;
  children: React.ReactNode;
  size?: number;
  color?: string;
}) {
  return (
    <SvgText x={x} y={y} fill={color} fontSize={size} fontFamily="Poppins_500Medium">
      {children}
    </SvgText>
  );
}
function Check({ x, y, color = LIME }: { x: number; y: number; color?: string }) {
  return (
    <Path
      d={`M${x} ${y}l3 3 6-7`}
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

/** Small original product illustrations, kept vector-sharp at every screen size. */
export function ProFeatureArt({ kind, width = 112 }: { kind: ProArt; width?: number }) {
  return (
    <Svg width={width} height={width * 0.85} viewBox="0 0 160 136" accessible={false}>
      <Defs>
        <LinearGradient id="surface" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#353B35" />
          <Stop offset="1" stopColor="#141714" />
        </LinearGradient>
        <LinearGradient id="lime" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#E4FFAB" />
          <Stop offset="1" stopColor="#94C739" />
        </LinearGradient>
        <LinearGradient id="chart" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={LIME} stopOpacity="0.25" />
          <Stop offset="1" stopColor={LIME} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      {kind === "trainer" && (
        <>
          <G transform="rotate(-7 80 65)">
            <Rect x="15" y="19" width="128" height="88" rx="12" fill="#111511" stroke="#2C332C" />
            <Rect x="22" y="28" width="53" height="17" rx="8" fill="#2B312B" />
            <Label x={29} y={40} size={7}>
              Your goal
            </Label>
            <Rect x="81" y="28" width="54" height="17" rx="8" fill="#2B312B" />
            <Label x={88} y={40} size={7}>
              Equipment
            </Label>
            <Rect x="22" y="53" width="113" height="25" rx="12" fill="url(#lime)" />
            <Circle cx="36" cy="65.5" r="6" fill="none" stroke="#243716" strokeWidth="2" />
            <Path d="M33 65l2 2 4-4" fill="none" stroke="#243716" strokeWidth="1.5" />
            <Label x={47} y={69} size={8} color="#17220B">
              Made for you
            </Label>
            <Rect x="22" y="86" width="47" height="12" rx="6" fill="#2B312B" />
            <Rect x="76" y="86" width="59" height="12" rx="6" fill="#2B312B" />
          </G>
          <Circle cx="132" cy="108" r="15" fill="#202A17" stroke="#52742D" />
          <Path d="M132 98l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill={LIME} />
        </>
      )}
      {kind === "history" && (
        <>
          <Rect x="9" y="19" width="142" height="98" rx="14" fill="#131613" stroke="#2D322D" />
          <Label x={21} y={37} size={7} color={GRAY}>
            YOUR PROGRESS
          </Label>
          <Line x1="21" y1="58" x2="139" y2="58" stroke="#272D27" />
          <Line x1="21" y1="80" x2="139" y2="80" stroke="#272D27" />
          <Path d="M21 97l16-12 15 5 18-23 16 6 15-23 16 6 22-16v65H21z" fill="url(#chart)" />
          <Path
            d="M21 97l16-12 15 5 18-23 16 6 15-23 16 6 22-16"
            fill="none"
            stroke={LIME}
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {[
            [21, 97],
            [52, 90],
            [86, 73],
            [117, 56],
            [139, 40],
          ].map(([cx, cy]) => (
            <Circle key={cx} cx={cx} cy={cy} r="3" fill={LIME} />
          ))}
          <Rect x="44" y="102" width="73" height="23" rx="11" fill="#2C3423" stroke="#5A7336" />
          <Label x={55} y={117} size={8} color={LIME}>
            ALL-TIME
          </Label>
        </>
      )}
      {kind === "muscles" && (
        <>
          <Circle cx="80" cy="65" r="54" fill="#141714" />
          <Circle cx="80" cy="65" r="42" stroke="#283028" strokeWidth="1" fill="none" />
          <G transform="translate(45 13)">
            <Ellipse cx="35" cy="14" rx="10" ry="12" fill="#AEB5AE" />
            <Path
              d="M27 27l-17 9-8 34 9 3 10-25 4 30-7 33h15l2-28 2 28h15l-7-33 4-30 10 25 9-3-8-34-17-9z"
              fill="#666E66"
            />
            <Path d="M26 29l9 7-5 18-13-9 3-11zm18 0-9 7 5 18 13-9-3-11z" fill="url(#lime)" />
            <Path d="M27 57h16l-2 18H29z" fill="#A6B49A" />
            <Path d="M22 80l10 3-3 24H19zm26 0-10 3 3 24h10z" fill="#8DA375" />
            <Line x1="35" y1="56" x2="35" y2="74" stroke="#4B5546" />
            <Line x1="28" y1="65" x2="42" y2="65" stroke="#4B5546" />
          </G>
          <Circle cx="25" cy="43" r="12" fill="#25331B" stroke="#4B662D" />
          <Label x={19} y={47} color={LIME} size={10}>
            +
          </Label>
          <Rect x="105" y="90" width="48" height="24" rx="8" fill="#252C21" stroke="#414F34" />
          <Label x={113} y={105} size={7} color={LIME}>
            BALANCE
          </Label>
        </>
      )}
      {kind === "custom" && (
        <>
          <G transform="rotate(7 80 65)">
            <Rect x="28" y="16" width="110" height="92" rx="12" fill="#151915" stroke="#353D30" />
          </G>
          <G transform="rotate(-7 76 70)">
            <Rect
              x="14"
              y="27"
              width="118"
              height="91"
              rx="12"
              fill="url(#surface)"
              stroke="#414A39"
            />
            <Rect x="28" y="42" width="43" height="6" rx="3" fill="#AAB79B" />
            <Rect x="28" y="54" width="64" height="4" rx="2" fill="#526046" />
            <Line x1="36" y1="82" x2="97" y2="82" stroke="#7B8F68" strokeWidth="6" />
            <Rect x="32" y="70" width="10" height="24" rx="3" fill={LIME} />
            <Rect x="44" y="65" width="11" height="34" rx="3" fill="#A4CC75" />
            <Rect x="91" y="70" width="10" height="24" rx="3" fill={LIME} />
            <Rect x="78" y="65" width="11" height="34" rx="3" fill="#A4CC75" />
          </G>
          <Circle cx="130" cy="109" r="18" fill={LIME} />
          <Path d="M123 109h14m-7-7v14" stroke="#243416" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {kind === "progression" && (
        <>
          <G transform="rotate(-7 80 65)">
            <Rect
              x="15"
              y="23"
              width="130"
              height="91"
              rx="13"
              fill="url(#surface)"
              stroke="#3A4137"
            />
            <Label x={28} y={42} size={8}>
              YOUR NEXT SET
            </Label>
            <Rect x="27" y="52" width="107" height="24" rx="7" fill="#151A12" />
            <Label x={36} y={68} size={10} color={LIME}>
              8 reps
            </Label>
            <Path d="M79 63h16m-5-5 5 5-5 5" fill="none" stroke="#778569" strokeWidth="1.5" />
            <Label x={105} y={68} size={10} color={LIME}>
              9
            </Label>
            <Rect x="27" y="86" width="70" height="4" rx="2" fill="#596150" />
            <Rect x="27" y="96" width="49" height="4" rx="2" fill="#343C2C" />
            <Circle cx="124" cy="100" r="14" fill={LIME} />
            <Check x={119} y={100} color="#1C2A0C" />
          </G>
        </>
      )}
      {kind === "calculator" && (
        <>
          <G transform="rotate(-8 78 69)">
            <Rect
              x="49"
              y="12"
              width="65"
              height="112"
              rx="13"
              fill="url(#surface)"
              stroke="#464E41"
            />
            <Rect x="58" y="24" width="47" height="25" rx="5" fill="#121810" />
            <Label x={69} y={41} color={LIME} size={12}>
              80%
            </Label>
            {[0, 1, 2].map((row) =>
              [0, 1, 2].map((col) => (
                <Rect
                  key={`${row}${col}`}
                  x={59 + col * 16}
                  y={59 + row * 17}
                  width="11"
                  height="12"
                  rx="3"
                  fill={row === 2 && col === 2 ? LIME : "#525A4B"}
                />
              )),
            )}
          </G>
          <G transform="translate(4 65)">
            <Rect x="0" y="9" width="145" height="6" rx="3" fill="#545D4D" />
            <Rect x="15" y="-2" width="12" height="28" rx="4" fill="#769845" />
            <Rect x="29" y="-9" width="14" height="42" rx="4" fill={LIME} />
            <Rect x="118" y="-2" width="12" height="28" rx="4" fill="#769845" />
            <Rect x="102" y="-9" width="14" height="42" rx="4" fill={LIME} />
          </G>
        </>
      )}
      {kind === "meals" && (
        <>
          <Circle cx="66" cy="70" r="48" fill="url(#surface)" stroke="#3D4539" />
          <Circle cx="66" cy="70" r="35" fill="#11170F" stroke="#2C3526" />
          <Path d="M44 48c-18 8-14 32 1 37 20-4 24-25 7-37z" fill="#95BE5F" />
          <Path d="M42 51l7 29m-13-15 11 4" stroke="#547D29" strokeWidth="2" />
          <Path d="M65 44c24-5 29 12 20 23-13 3-24-8-20-23z" fill="#D1BC91" />
          <Path d="M63 74c17-11 31 0 26 14-15 12-32 2-26-14z" fill="#E6C578" />
          <G transform="rotate(9 125 90)">
            <Rect x="100" y="52" width="48" height="67" rx="7" fill="#272F21" stroke="#576748" />
            <Rect x="111" y="48" width="25" height="10" rx="4" fill={LIME} />
            {[69, 86, 103].map((y) => (
              <G key={y}>
                <Check x={107} y={y} />
                <Line
                  x1="121"
                  y1={y}
                  x2="139"
                  y2={y}
                  stroke="#829374"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </G>
            ))}
          </G>
        </>
      )}
      {kind === "review" && (
        <>
          <G transform="rotate(-6 78 67)">
            <Rect
              x="28"
              y="14"
              width="101"
              height="110"
              rx="12"
              fill="url(#surface)"
              stroke="#3E4738"
            />
            <Label x={41} y={33} size={8}>
              YOUR WEEK
            </Label>
            {[0, 1, 2, 3, 4].map((n) => (
              <Rect
                key={n}
                x={41 + n * 15}
                y={72 - [18, 29, 24, 37, 47][n]}
                width="9"
                height={[18, 29, 24, 37, 47][n]}
                rx="3"
                fill={n === 4 ? LIME : "#536244"}
              />
            ))}
            <Line x1="41" y1="83" x2="115" y2="83" stroke="#3B4634" />
            <Rect x="41" y="94" width="49" height="4" rx="2" fill="#7D8B6E" />
            <Rect x="41" y="104" width="64" height="4" rx="2" fill="#49553C" />
          </G>
          <Circle cx="124" cy="105" r="18" fill={LIME} />
          <Check x={119} y={106} color="#1C2A0C" />
        </>
      )}
    </Svg>
  );
}
