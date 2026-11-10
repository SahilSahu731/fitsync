export function OrbitArtwork({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 650 720" fill="none" className={className} aria-hidden="true">
      <ellipse cx="325" cy="350" rx="270" ry="270" stroke="currentColor" strokeOpacity=".15" />
      <ellipse
        cx="325"
        cy="350"
        rx="295"
        ry="142"
        transform="rotate(-42 325 350)"
        stroke="currentColor"
        strokeOpacity=".45"
        strokeWidth="1.2"
      />
      <ellipse
        cx="325"
        cy="350"
        rx="300"
        ry="172"
        transform="rotate(40 325 350)"
        stroke="currentColor"
        strokeOpacity=".12"
        strokeDasharray="3 8"
      />
      <path
        d="M325 57V35m0 630v-22M32 350H10m630 0h-22M112 137l-16-16m458 458-16-16"
        stroke="currentColor"
        strokeOpacity=".4"
      />
      <circle cx="136" cy="150" r="5" fill="currentColor" />
      <circle cx="529" cy="570" r="3" fill="currentColor" fillOpacity=".6" />
      <path d="m521 123 16 2-7 15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function GestureArrow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 85" fill="none" className={className} aria-hidden="true">
      <path
        d="M8 52C20 8 72 6 85 38c12 29-20 43-32 23-11-18 11-38 35-33 17 4 33 19 43 37m-22-7 24 11-2-24"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TrackArtwork({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 1100 600" fill="none" className={className} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((lane) => (
        <rect
          key={lane}
          x={160 + lane * 32}
          y={-180 + lane * 32}
          width={900 - lane * 64}
          height={960 - lane * 64}
          rx={450 - lane * 32}
          transform="rotate(-32 610 300)"
          stroke="currentColor"
          strokeWidth="1"
        />
      ))}
      <path d="m742 95 36 12-8 36m-65 348 36 12-8 36" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
