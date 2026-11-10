export type TrainingStyle = "strength" | "mobility" | "bodyweight";

const studyNames: Record<TrainingStyle, string> = {
  strength: "01 / THE BACK SQUAT",
  mobility: "02 / THE LONG LUNGE",
  bodyweight: "03 / THE PUSH-UP",
};

function StrengthStudy() {
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      {/* A second contour records the movement before the bottom position. */}
      <g className="stroke-brand/15" strokeWidth="1" strokeDasharray="3 6">
        <path d="M257 130c-5-36 3-63 25-71 30-11 58 16 47 43l-14 35m-72 23-19 78 27 29m63-103 28 59-17 33" />
        <path d="m247 255-35 55 10 73m98-130 43 52 21 78" />
      </g>
      {/* The bar, collars, and layered plates sit behind the shoulders. */}
      <g transform="rotate(-6 310 155)" className="stroke-ink" strokeWidth="1.5">
        <path d="M101 153h424v8H101z" className="fill-panel-raised" />
        <path
          d="M124 119h13v76h-13zm15-13h20v103h-20zm22 8h16v87h-16zM451 114h16v87h-16zm18-8h20v103h-20zm22 13h13v76h-13z"
          className="fill-panel"
        />
        <path
          d="M144 115v85m6-88v90m16-80v71m308-78v85m7-88v90m15-75v59"
          className="stroke-ink/25"
        />
        <path d="M179 148h8v19h-8zm262 0h8v19h-8z" className="fill-brand stroke-brand" />
        <path d="M103 156h18m386 0h16" className="stroke-ink/40" />
      </g>
      {/* Calves turn into grounded, deliberately oversized training shoes. */}
      <g className="fill-ink stroke-panel" strokeWidth="2">
        <path d="M218 293c-7 15-8 33-2 47l13 40 21-2-2-37 4-35-34-13Z" />
        <path d="m337 283 31 36 13 58 23-3-6-62c-1-13-10-29-21-39l-40 10Z" />
      </g>
      <g className="fill-panel-raised stroke-ink" strokeWidth="1.5">
        <path d="m228 374-8 13-30 11c-8 2-11 10-10 15h73l3-18-8-20-20-1Z" />
        <path d="m380 370-5 18 4 24h67c3-7-4-14-14-17l-26-9-4-16h-22Z" />
        <path
          d="m183 407 69 1m128-1h63m-220-13 17 2m-22 3 20 2m148-10 17 7m-22-2 17 6"
          className="stroke-ink/50"
        />
        <path d="m232 376 13 1m140-4 14-1" className="stroke-brand" strokeWidth="4" />
      </g>
      <g className="stroke-panel" strokeWidth="1.4">
        <path d="m219 305 13 18 5 35m131-57 17 23 8 37m-171-45 9-4m-7 11 10-5m-6 13 9-5m141-20 11-6m-6 13 10-6m-6 13 10-6" />
      </g>
      {/* The pelvis and thighs carry the bright garment, with visible seams. */}
      <path
        d="M271 229c-27 9-56 30-69 48-6 10 0 26 12 35l38 14 40-46 38 26 51-20c-13-25-43-47-64-59l-46 2Z"
        className="fill-brand stroke-panel"
        strokeWidth="2"
      />
      <path
        d="m276 239-49 44 24 34m38-51 10-22m-12 26 45 25 37-15m-115-23 22 4m-18-12 24 4m-15-12 19 5m39 10 20 10m-15-17 22 11"
        className="stroke-panel/55"
        strokeWidth="1.3"
      />
      <path d="m268 231 48-3 4 9-48 7-4-13Z" className="fill-panel stroke-panel" />
      {/* Torso, deltoids, and folded arms have separate anatomical planes. */}
      <path
        d="M269 144c-14-3-29 4-36 19-6 14-7 33-2 48 4 13 20 23 39 28l49-7c0-21 2-40 13-57-7-16-21-27-40-31h-23Z"
        className="fill-ink stroke-panel"
        strokeWidth="2"
      />
      <path
        d="M244 151c-15-3-28 4-36 18l-17 31c-3 7 0 15 7 17 8 3 16-2 20-10l19-32 10-9m72-9c15 1 29 12 33 24l12 32c3 7-1 14-8 15-8 1-14-5-16-11l-13-27-13-7"
        className="fill-ink stroke-panel"
        strokeWidth="2"
      />
      <path
        d="m196 204 17-57c2-8 4-12 10-13 8-2 13 5 11 12l-13 62c-1 9-8 14-16 11-8-2-11-8-9-15Zm146 12-19-65c-3-9-1-15 6-17 7-2 13 2 15 10l20 65c2 8-2 15-8 17-6 2-12-3-14-10Z"
        className="fill-ink stroke-panel"
        strokeWidth="2"
      />
      <path
        d="m215 140 7-13 9-1 7 7-3 10-8 5m97-9-4-9 3-8 8-2 10 11 1 11"
        className="fill-ink stroke-panel"
        strokeWidth="2"
      />
      <g className="stroke-panel/70" strokeWidth="1.3">
        <path d="m247 157 23 16 32-15m-39 14-6 28 21 26m-15-52 21 14 29-13m-35 13-3 32m-39-48 7 30 16 12m-51-34 9-16m-2 30 9-17m108 22 9 19m-7-42 8 18m-128 17 4 3m-2-11 4 2m-2-11 5 2m-2-11 4 1m-1-9 4 1m120 21 5-2m-7-5 5-2m-8-5 5-2m-8-5 5-2" />
        <path d="m242 190 9 5m-10 2 11 5m-9 2 13 6m-9 2 13 6m32-13 12-7m-14 15 12-7m-15 14 13-6" />
      </g>
      {/* Profile: cropped hair, ear, jaw, and a steady forward gaze. */}
      <path
        d="m276 144 2-19 25-6 8 30-17 13-18-18Z"
        className="fill-ink stroke-panel"
        strokeWidth="2"
      />
      <path
        d="M274 101c-1-20 11-33 29-32 19 1 28 15 26 34l6 14-9 3-5 16c-9 7-25 1-33-9-8-5-13-14-14-26Z"
        className="fill-ink stroke-panel"
        strokeWidth="2"
      />
      <path
        d="M274 105c-9-18-4-33 11-40 17-9 39-2 44 15l-3 13-19-5-11 9-4 16-8-12-10 4Z"
        className="fill-panel-raised stroke-panel"
        strokeWidth="2"
      />
      <path
        d="m282 77 10-4m-13 11 15-5m-13 12 13-4m18-12 8 5m-23 31c-8-9-17 0-9 6l4-3m24-13 7 2m-9 15 9 1m-18 13-10-7m-9 7 10 9m-12-2 9 9"
        className="stroke-panel/75"
        strokeWidth="1.3"
      />
      <g className="stroke-brand" strokeWidth="1.2">
        <path d="M127 293c-13-45-10-82 12-111m-1 16 2-18-17 7m310 92c15-27 17-51 9-75m-8 16 8-18 9 15" />
        <circle cx="220" cy="286" r="6" className="fill-panel" />
        <circle cx="370" cy="281" r="6" className="fill-panel" />
      </g>
      <path d="m126 315 37 0 48-26m169-8 50 0 21 25" className="stroke-brand/45" strokeWidth="1" />
    </g>
  );
}

function MobilityStudy() {
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <g className="stroke-brand/20" strokeWidth="1" strokeDasharray="3 6">
        <path d="M165 219c-20-86 50-157 137-153 89 5 148 84 128 158M172 218l-13-14m13 14 9-18M429 220l-11-17m11 17 13-13" />
      </g>
      {/* The long back leg and bent front leg open across the composition. */}
      <path
        d="M292 255c-24-2-47 14-64 32l-63 60-52 24 6 18 73-18 70-50 55-31-25-35Z"
        className="fill-ink stroke-panel"
        strokeWidth="2"
      />
      <path
        d="m313 251 55 18c18 5 28 16 27 31l-4 71 24 12-4 14-45-6-6-38-9-42-67-16 29-44Z"
        className="fill-ink stroke-panel"
        strokeWidth="2"
      />
      <g className="stroke-panel/65" strokeWidth="1.4">
        <path d="m284 277-55 36-47 42-47 24m46-29 16 7m-9-14 17 7m-10-15 17 7m-10-14 17 7m-10-14 17 7m100-44 35 20 7 26-2 38m-21-62 12-3m-9 10 12-3m-9 10 12-3m-9 10 12-3" />
      </g>
      <g className="fill-panel-raised stroke-ink" strokeWidth="1.5">
        <path d="m114 369 13 17-6 15-48 5-11-7c7-11 22-11 29-17l23-13Z" />
        <path d="m369 382 22-10 21 9 30 14c7 4 12 10 10 15h-82l-1-28Z" />
        <path d="m66 401 55-4m251 7h76m-55-16 18 8m-23-1 13 5" className="stroke-ink/40" />
        <path d="m107 374 8 12m267-9 15 1" className="stroke-brand" strokeWidth="4" />
      </g>
      {/* The garment traces the rotation through the pelvis. */}
      <path
        d="M276 228c-16 9-30 29-38 45l42 35 22-24 44 22 27-31c-14-19-33-36-55-43l-42-4Z"
        className="fill-brand stroke-panel"
        strokeWidth="2"
      />
      <path
        d="m282 239-25 32 24 25m24-26 10-27m-6 31 35 21 19-19m-99-14 16 7m-12-14 17 8m42-3 22 8m-19-15 24 8"
        className="stroke-panel/60"
        strokeWidth="1.3"
      />
      <path d="m276 229 42 4 4 9-49-4 3-9Z" className="fill-panel" />
      {/* A twisting chest and opposing arms form one sweeping gesture. */}
      <path
        d="M278 153c-18 4-28 17-24 34l9 27 11 22 47 5 15-55c2-15-7-30-22-35l-36 2Z"
        className="fill-ink stroke-panel"
        strokeWidth="2"
      />
      <path
        d="M265 158c-8-9-20-7-32 1l-44 30-45-2-3 19 48 5c8 0 16-2 23-6l51-25 2-22Z"
        className="fill-ink stroke-panel"
        strokeWidth="2"
      />
      <path
        d="M324 155c5-12 12-20 20-28l38-37 23-37 16 9-20 43-48 55c-7 9-20 11-29 5v-10Z"
        className="fill-ink stroke-panel"
        strokeWidth="2"
      />
      <path
        d="m144 188-19-8-15 5-17-1-2 5 18 7-12 7 3 5 19-7 23 4m263-151 2-15 7-18 5 1-2 17 9-10 4 3-7 15-7 15"
        className="fill-ink stroke-panel"
        strokeWidth="1.7"
      />
      <g className="stroke-panel/65" strokeWidth="1.3">
        <path d="m274 162 13 20 35-6m-36 7-10 28 24 18m6-43 5 19-7 23m-39-52 2 20 12 9m-36-39-42 30-45-1m42 2 1 7m7-12 2 7m5-12 2 7m5-13 2 7m5-13 2 7m98-19 26-37 20-15m-28 18 7 6m-1-13 7 6m0-13 7 6m-24 26 7 3m-11 3 7 3m-11 3 7 3m-75 35 11 5m-10 2 12 6m-8 2 12 6" />
      </g>
      <path
        d="m282 157 3-19 24-9 12 28-18 16-21-16Z"
        className="fill-ink stroke-panel"
        strokeWidth="2"
      />
      <path
        d="M284 98c12-10 31-9 41 3l8 17-6 16c-7 12-23 15-36 7l-12-22 5-21Z"
        className="fill-ink stroke-panel"
        strokeWidth="2"
      />
      <path
        d="M281 118c-11-7-13-20-5-29 10-12 32-15 45-5 8 5 12 14 9 24l-13-3-10-9-8 13-6 15-7-9-5 3Z"
        className="fill-panel-raised stroke-panel"
        strokeWidth="2"
      />
      <path
        d="M277 93c-12 2-23-5-24-15-2-13 12-22 22-17 12 6 14 20 2 32Z"
        className="fill-panel-raised stroke-panel"
        strokeWidth="1.7"
      />
      <path
        d="m266 67-5 13m13-12-5 16m10-8-6 10m9 9 17-8m-15 15 10-6m9 21c-4-8-12-6-11 1l5 3m25-5 5 1m-16 19 10-3m-28 7 10 5m-10 2 8 5"
        className="stroke-panel/70"
        strokeWidth="1.3"
      />
      <g className="stroke-brand" strokeWidth="1.2">
        <path d="M455 135c22 43 20 85-6 120m4-19-5 21 18-9M190 123c-23 18-37 39-41 60m-6-16 5 18 14-12" />
        <circle cx="307" cy="261" r="6" className="fill-panel" />
        <circle cx="378" cy="299" r="6" className="fill-panel" />
      </g>
      <path d="m312 263 57-42h45m-30 81 45 24h32" className="stroke-brand/45" strokeWidth="1" />
    </g>
  );
}

function BodyweightStudy() {
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <g className="stroke-brand/20" strokeWidth="1" strokeDasharray="3 6">
        <path d="m153 212 110-78 101 36 106 147m-280-73-17 80m106-119 20 132" />
        <path d="M124 259c44-55 95-84 153-89 68-6 122 34 160 100" />
      </g>
      {/* A far arm gives the low push-up a strong three-quarter perspective. */}
      <path
        d="M263 227c13 5 20 16 20 30l-1 42 25 80 22 7-1 11-36-1-35-82c-5-6-8-14-8-23l-4-43 18-21Z"
        className="fill-ink stroke-panel"
        strokeWidth="2"
      />
      <path
        d="m263 251 6 45 27 84m-3-34 8-2m-6 9 8-2m-6 9 8-2m-6 9 8-2"
        className="stroke-panel/60"
        strokeWidth="1.3"
      />
      {/* Long legs converge into grippy training shoes on the ground plane. */}
      <path
        d="m330 238 48 7 35 40 59 61-13 16-66-49-53-37-10-38Z"
        className="fill-ink stroke-panel"
        strokeWidth="2"
      />
      <path
        d="m337 262 29 17 31 50 60 48 16-13-52-62-34-61-50 21Z"
        className="fill-ink stroke-panel"
        strokeWidth="2"
      />
      <path
        d="m372 264 24 33 59 52m-85-66 23 42 58 44m-63-68 8-4m-5 10 8-4m-5 10 8-4m-5 10 8-4m-5 10 8-4m-4 16 7-5m-2 10 7-5m-2 10 7-5"
        className="stroke-panel/60"
        strokeWidth="1.3"
      />
      <g className="fill-panel-raised stroke-ink" strokeWidth="1.5">
        <path d="m458 345 13-9 13 8 17 31-3 9-27-9-13-30Z" />
        <path d="m456 366 17-10 13 11 18 34-4 10-29-13-15-32Z" />
        <path
          d="m476 345 10 18m-8 8 15 7m-20-13 14 7m-14 0 12 18m-7 5 17 9"
          className="stroke-ink/45"
        />
        <path d="m461 350 12-7m-13 28 14-9" className="stroke-brand" strokeWidth="4" />
      </g>
      {/* Angled shorts pick out the hip, the centre of the long body line. */}
      <path
        d="m295 212 45 6c17 3 35 15 47 27l-25 42-32-19-31 11-32-27 28-40Z"
        className="fill-brand stroke-panel"
        strokeWidth="2"
      />
      <path
        d="m301 222-17 29 17 17m13-6 20-30m-2 27 26 17 18-29m-81-10 12 7m-15 0 12 7m40-11 19 11m-14-18 20 12"
        className="stroke-panel/60"
        strokeWidth="1.3"
      />
      <path d="m291 215 9-5 8 10-28 38-8-7 19-36Z" className="fill-panel" />
      {/* The rib cage is foreshortened, shoulder blades crossing its surface. */}
      <path
        d="M210 180c-18 3-28 18-23 34l12 30c7 19 23 28 42 27l35-16 23-38-52-25c-13-10-24-14-37-12Z"
        className="fill-ink stroke-panel"
        strokeWidth="2"
      />
      <path
        d="m205 193 29 4 28 21 23 3m-60-20-8 20 20 29m-18-28 26 4 22 21m-61-37-5 18 10 22m40-26 10 6m-7 1 11 7m-5 1 10 6m-29-33 12 5m-8 2 13 6m-9 1 12 6"
        className="stroke-panel/65"
        strokeWidth="1.3"
      />
      {/* The near arm folds under the shoulder, ending in a splayed palm. */}
      <path
        d="M218 211c-10-7-24-3-32 9l-27 45c-6 11-5 22 1 31l32 76-5 14-25 10 2 10 37-2 16-22-25-97 39-46c7-11 0-23-13-28Z"
        className="fill-ink stroke-panel"
        strokeWidth="2"
      />
      <path
        d="m197 228-26 48 4 16 27 83-2 15m-24-114 11 8m-8-16 12 8m-8-16 13 8m-9-16 14 8m-14 37 10-5m-7 12 10-5m-6 12 10-5m-6 12 10-5M170 398l23-2m-14 7 17-2m-9-7 16-3"
        className="stroke-panel/65"
        strokeWidth="1.3"
      />
      <path
        d="m196 199-23-6-7 22 28 22 16-17-14-21Z"
        className="fill-ink stroke-panel"
        strokeWidth="2"
      />
      <path
        d="M172 184c-13-14-32-12-44 0-11 10-12 25-3 37l13 13 11-4 11-1c11-6 17-21 12-33v-12Z"
        className="fill-ink stroke-panel"
        strokeWidth="2"
      />
      <path
        d="M124 218c-12-3-16-18-10-30 5-13 20-22 35-18 15 3 27 16 24 30l-14-7-12 3-7 15-10-2-6 9Z"
        className="fill-panel-raised stroke-panel"
        strokeWidth="2"
      />
      <path
        d="m122 188 14-9m-15 17 17-10m7-9 12 5m-17 22c-3-7-11-5-10 2l6 4m17 8 5-6m-15 14 7-3m17-16 11 5m-13 1 10 6"
        className="stroke-panel/70"
        strokeWidth="1.3"
      />
      <g className="stroke-brand" strokeWidth="1.2">
        <path d="M78 281c-7 26-3 51 10 72m-1-19 3 21-17-10m330-145c25 15 44 38 53 67m-13-12 14 14 3-20" />
        <circle cx="172" cy="285" r="6" className="fill-panel" />
        <circle cx="321" cy="244" r="6" className="fill-panel" />
      </g>
      <path d="m166 286-39 24H93m234-68 49-44h31" className="stroke-brand/45" strokeWidth="1" />
    </g>
  );
}

export function TrainingSketch({
  kind = "strength",
  className = "",
}: {
  kind?: TrainingStyle;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 640 470" fill="none" className={className} aria-hidden="true">
      <g className="stroke-ink/7" strokeWidth="1">
        <circle cx="315" cy="236" r="174" />
        <circle cx="315" cy="236" r="137" />
        <path d="M315 32v401M71 236h489" strokeDasharray="2 7" />
        <path d="M65 65h23m-23 0v23m510-23h-23m23 0v23M65 406v-23m0 23h23m487 0h-23m23 0v-23" />
      </g>
      <ellipse cx="318" cy="411" rx="225" ry="10" className="fill-black/25" />
      <path d="M66 413h507m-496-5-8 10m494-10-8 10" className="stroke-ink/25" strokeWidth="1" />
      {kind === "strength" ? (
        <StrengthStudy />
      ) : kind === "mobility" ? (
        <MobilityStudy />
      ) : (
        <BodyweightStudy />
      )}
      <g className="stroke-ink/25" strokeWidth="1">
        <path d="M72 127h10m-5-5v10m464 210h10m-5-5v10M494 94h10m-5-5v10" />
        <circle cx="109" cy="356" r="2" />
      </g>
      <text x="67" y="447" className="fill-muted font-mono text-[9px] tracking-[0.15em]">
        {studyNames[kind]}
      </text>
      <text
        x="574"
        y="447"
        textAnchor="end"
        className="fill-muted font-mono text-[9px] tracking-[0.15em]"
      >
        FITSYNC MOVEMENT LAB
      </text>
    </svg>
  );
}
