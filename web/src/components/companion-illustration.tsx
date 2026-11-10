export function CompanionIllustration() {
  return (
    <svg
      viewBox="0 0 620 590"
      fill="none"
      className="h-auto w-full"
      role="img"
      aria-label="Illustrated FitSync mobile workout and progress preview"
    >
      <defs>
        <pattern
          id="companion-hatch"
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-35)"
        >
          <path d="M0 0V8" stroke="#c5f460" strokeOpacity=".18" strokeWidth="1" />
        </pattern>
      </defs>
      <ellipse cx="316" cy="510" rx="223" ry="49" stroke="#39432e" strokeWidth="1" />
      <ellipse
        cx="316"
        cy="510"
        rx="190"
        ry="30"
        stroke="#293422"
        strokeWidth="1"
        strokeDasharray="3 6"
      />
      <path
        d="M93 304c-17-122 70-239 200-254 120-15 234 70 247 194"
        stroke="#c5f460"
        strokeOpacity=".35"
        strokeWidth="1.5"
        strokeDasharray="5 9"
      />
      <path
        d="m531 228 10 19 5-23M99 316l-7-20-9 18"
        stroke="#c5f460"
        strokeOpacity=".6"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <g transform="rotate(-9 310 290)">
        <rect
          x="197"
          y="47"
          width="232"
          height="470"
          rx="37"
          fill="#0b0e0b"
          stroke="#839172"
          strokeWidth="1.7"
        />
        <rect x="203" y="53" width="220" height="458" rx="32" stroke="#39432e" />
        <path d="M282 65h62" stroke="#536047" strokeWidth="5" strokeLinecap="round" />
        <rect x="272" y="492" width="84" height="3" rx="1.5" fill="#67755b" />
        <path d="m221 104 7-10h8l-7 10h-8Zm9 8 7-10h8l-7 10h-8Z" fill="#c5f460" />
        <text
          x="254"
          y="110"
          fill="#edf3e5"
          fontFamily="Inter,Arial,sans-serif"
          fontSize="18"
          fontWeight="600"
          letterSpacing="-.6"
        >
          FitSync.
        </text>
        <circle cx="394" cy="103" r="11" stroke="#39432e" />
        <path d="M390 103h8m-4-4v8" stroke="#a0ad92" strokeLinecap="round" />
        <text
          x="221"
          y="147"
          fill="#8e9b80"
          fontFamily="Inter,Arial,sans-serif"
          fontSize="9"
          letterSpacing="1.3"
        >
          YOUR NEXT GOOD SESSION
        </text>
        <text
          x="221"
          y="174"
          fill="#edf3e5"
          fontFamily="Inter,Arial,sans-serif"
          fontSize="24"
          fontWeight="600"
          letterSpacing="-1"
        >
          Full body.
        </text>
        <text x="221" y="193" fill="#8e9b80" fontFamily="Inter,Arial,sans-serif" fontSize="10">
          An example session, at your pace.
        </text>
        <rect x="219" y="216" width="188" height="107" rx="13" fill="#192215" stroke="#39432e" />
        <path
          d="M231 300h164M231 281h164M231 262h164M231 243h164"
          stroke="#39432e"
          strokeOpacity=".7"
        />
        <path
          d="M235 296c15 0 18-27 34-24 18 4 20 15 35 5 12-8 13-28 29-25 12 2 23 6 31-11 6-12 12-13 25-15v74H235Z"
          fill="url(#companion-hatch)"
        />
        <path
          d="M235 296c15 0 18-27 34-24 18 4 20 15 35 5 12-8 13-28 29-25 12 2 23 6 31-11 6-12 12-13 25-15"
          stroke="#c5f460"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="389" cy="226" r="4" fill="#c5f460" stroke="#192215" strokeWidth="2" />
        <text
          x="232"
          y="237"
          fill="#8e9b80"
          fontFamily="Inter,Arial,sans-serif"
          fontSize="8"
          letterSpacing="1"
        >
          LITTLE BY LITTLE.
        </text>
        <g fontFamily="Inter,Arial,sans-serif" fontSize="11" fill="#edf3e5">
          <text x="247" y="356">
            Squat
          </text>
          <text x="383" y="356" fill="#8e9b80" fontSize="9">
            01
          </text>
          <text x="247" y="392">
            Press
          </text>
          <text x="383" y="392" fill="#8e9b80" fontSize="9">
            02
          </text>
          <text x="247" y="428">
            Row
          </text>
          <text x="383" y="428" fill="#8e9b80" fontSize="9">
            03
          </text>
        </g>
        {[350, 386, 422].map((y) => (
          <g key={y}>
            <circle cx="230" cy={y} r="8" stroke="#556647" />
            <path
              d={`m227 ${y} 2 2 4-4`}
              stroke="#c5f460"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <path d={`M220 ${y + 18}h185`} stroke="#293422" />
          </g>
        ))}
        <rect x="220" y="457" width="186" height="22" rx="11" fill="#c5f460" />
        <text
          x="313"
          y="472"
          fill="#0b0e0b"
          fontFamily="Inter,Arial,sans-serif"
          fontSize="9"
          fontWeight="600"
          textAnchor="middle"
        >
          ONE REP AT A TIME.
        </text>
      </g>
      <g transform="rotate(8 468 302)">
        <rect x="423" y="278" width="127" height="94" rx="13" fill="#172013" stroke="#65764e" />
        <circle cx="449" cy="303" r="10" fill="#c5f460" />
        <path d="m445 303 3 3 5-6" stroke="#0b0e0b" strokeWidth="1.5" strokeLinecap="round" />
        <text
          x="439"
          y="332"
          fill="#edf3e5"
          fontFamily="Inter,Arial,sans-serif"
          fontSize="12"
          fontWeight="500"
        >
          A little stronger.
        </text>
        <text x="439" y="351" fill="#8e9b80" fontFamily="Inter,Arial,sans-serif" fontSize="9">
          Every time you show up.
        </text>
      </g>
      <g transform="rotate(-12 143 382)">
        <path
          d="M89 384c2-40 26-65 66-63 35 2 52 35 39 66-14 32-55 39-82 16"
          stroke="#c5f460"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M96 392c4-23 17-33 32-36m14-3c21 2 30 17 27 34m-51 17c19 13 42 6 49-9"
          stroke="#c5f460"
          strokeWidth=".8"
          strokeOpacity=".5"
        />
        <path
          d="m106 387 19 19 40-45"
          stroke="#edf3e5"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <path
        d="M490 137c48 19 45 78 10 102m1-14-3 17 17-4"
        stroke="#7f8d70"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M107 154h14m-7-7v14M498 449h14m-7-7v14M141 493h9m-4.5-4.5v9"
        stroke="#7f8d70"
        strokeOpacity=".55"
      />
    </svg>
  );
}
