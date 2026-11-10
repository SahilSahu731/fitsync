export function ProgressIllustration() {
  return (
    <svg
      viewBox="0 0 380 150"
      fill="none"
      className="h-auto w-full"
      role="img"
      aria-label="An illustrative upward training trend across four example weeks"
    >
      <defs>
        <pattern
          id="home-progress-hatch"
          patternUnits="userSpaceOnUse"
          width="7"
          height="7"
          patternTransform="rotate(30)"
        >
          <path d="M0 0V7" stroke="#c5f460" strokeOpacity=".15" />
        </pattern>
      </defs>
      <path
        d="M10 30H370M10 65H370M10 100H370"
        stroke="currentColor"
        className="text-line"
        strokeDasharray="2 6"
      />
      <path
        d="M12 108C47 109 54 82 90 87S142 102 177 66 227 77 270 40 320 49 367 20V119H12Z"
        fill="url(#home-progress-hatch)"
      />
      <path
        d="M12 108C47 109 54 82 90 87S142 102 177 66 227 77 270 40 320 49 367 20"
        stroke="currentColor"
        className="animate-home-draw text-brand motion-reduce:animate-none"
        strokeWidth="2"
        strokeLinecap="round"
        pathLength="1"
        strokeDasharray="1"
      />
      <circle cx="367" cy="20" r="4" fill="currentColor" className="text-brand" />
      <circle cx="367" cy="20" r="9" stroke="currentColor" className="text-brand/20" />
      {["WEEK 01", "02", "03", "04"].map((week, index) => (
        <text
          key={week}
          x={10 + index * 111}
          y="143"
          fill="currentColor"
          className="text-muted"
          fontFamily="Inter,Arial,sans-serif"
          fontSize="9"
          letterSpacing="1"
        >
          {week}
        </text>
      ))}
    </svg>
  );
}

export function DevicesIllustration() {
  return (
    <svg
      viewBox="0 0 380 145"
      fill="none"
      className="h-auto w-full"
      role="img"
      aria-label="A laptop and a phone connected by the same FitSync account"
    >
      <ellipse
        cx="190"
        cy="75"
        rx="145"
        ry="50"
        stroke="currentColor"
        className="text-brand/20"
        strokeDasharray="3 6"
      />
      <rect x="45" y="31" width="136" height="82" rx="7" fill="#0b0e0b" stroke="#67745b" />
      <rect x="51" y="37" width="124" height="69" rx="3" stroke="#2b3428" />
      <path d="m37 113-12 9h176l-12-9H37Z" fill="#1d241c" stroke="#67745b" />
      <path d="m106 77 12-17h15l-12 17h-15Zm15 13 12-17h15l-12 17h-15Z" fill="#c5f460" />
      <rect x="258" y="15" width="58" height="115" rx="11" fill="#0b0e0b" stroke="#839172" />
      <rect x="263" y="20" width="48" height="104" rx="7" stroke="#2b3428" />
      <path d="M280 24h14M279 119h16" stroke="#67745b" strokeWidth="2" strokeLinecap="round" />
      <path d="m273 75 8-11h10l-8 11h-10Zm10 9 8-11h10l-8 11h-10Z" fill="#c5f460" />
      <path
        d="M193 75h52m-7-5 7 5-7 5M196 69l-7 6 7 5"
        stroke="#c5f460"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
