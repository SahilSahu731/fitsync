export type TrainingStyle = "strength" | "mobility" | "bodyweight";

export function TrainingSketch({ kind = "strength", className = "" }: { kind?: TrainingStyle; className?: string }) {
  return <svg viewBox="0 0 560 390" fill="none" className={className} aria-hidden="true">
    <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="290" cy="345" rx="195" ry="17" strokeWidth="1" opacity=".18" />
      <path d="M65 345h430M89 338l-8 15m395-15-8 15" strokeWidth="1" opacity=".3" />
      {kind === "strength" ? <>
        <path d="M225 134c17-16 51-17 70-1l20 67-16 43-74-3-22-39 22-67Z" fill="#c5f460" strokeWidth="2.3" />
        <path d="m237 137-8 53 55 11 7-66m-76 64 15 24 65 2 12-27M235 151l39 2m-43 5 45 2m-45 6 32 1" strokeWidth="1.2" />
        <path d="M246 129c-7-9-12-22-9-35 3-17 18-25 33-20 16 4 23 18 19 33-3 13-11 21-19 25m-30-39c9-1 17-6 22-13l19 15m-34 15 8 9 17-3m-20 10-2 13m20-12 2 12" strokeWidth="2.4" />
        <path d="M224 141c-13 2-22 10-30 22l-22 37-27-18-11 14 34 29c8 5 18 2 24-6l24-31m80-46c13 3 25 15 30 28l15 38 35-12 6 16-49 21c-10 3-17-3-20-13l-12-30" strokeWidth="2.5" />
        <path d="m148 184-5-12-12-5-8 7 3 17 13 10m235-2 4-14 11-4 8 8-6 19-11 3" strokeWidth="2.2" />
        <path d="m224 239-16 37 18 49h25l-9-44 22-27 19 31-5 41h25l14-48-18-38" fill="#171717" strokeWidth="2.5" />
        <path d="m248 254-25 27 16 37m49-63 14 24-12 38" stroke="#fff" strokeWidth="1.1" />
        <path d="m227 324-3 10-19 4-4 9 49-1 1-21m28 1-3 18 48 2-2-9-21-6 1-6m-76 10 16 1m39-1 14 4" strokeWidth="2.5" fill="#fff" />
        <path d="M102 173h69m-59-19v41m12-48v56m31-49v41m-37-42-2 43m-7-36-1 27M352 189h71m-59-22v44m12-52v60m31-51v42m-35-40-2 38m-8-31-1 23" strokeWidth="3" />
        <path d="m162 137-7-15m25 3-2-17m159 39 12-14m0 35 17-3" strokeWidth="1.3" />
        <path d="M391 99c-2 27 13 41 35 40m-11-12 12 12-13 10" strokeWidth="1.5" />
      </> : kind === "mobility" ? <>
        <path d="m117 333 61-19 31-49 57-50 43 7-41 64-46 43-65 17" fill="#171717" strokeWidth="2.5" />
        <path d="m288 226 40 38 17 57 43 6-1 17-67-5-25-55-34-14" fill="#171717" strokeWidth="2.5" />
        <path d="m243 217 12-61 42-29 42 34-28 66-68-10Z" fill="#c5f460" strokeWidth="2.5" />
        <path d="m264 157 20 24 36 4m-61-24-10 44 51 11" strokeWidth="1.3" />
        <path d="m294 134 4-24m14 31 8-16m-20-16c-9-11-4-30 9-37 15-8 35 0 38 14 4 15-8 37-22 39-9 0-16-5-20-11m2-28c9 5 21 3 28-1" strokeWidth="2.5" />
        <path d="m261 155-31-25-40-41-11 9 31 48 37 36m85-21 26-28 29-46-13-8-33 37-30 21" strokeWidth="2.5" />
        <path d="m181 92-8-9-3-13 7-4 10 12 4 11m184-9 2-12 9-12 8 5-1 12-9 13" strokeWidth="2.2" />
        <path d="m118 333-22 2-7 11 64-1 5-11m188-7 2 17 59 1-2-9-18-10" strokeWidth="2.5" fill="#fff" />
        <path d="M154 211c-31-32-34-64-13-97m-15 6 16-9 3 17M404 195c27-26 36-57 25-86m-8 11 6-13 14 4" strokeWidth="1.5" />
        <path d="m214 277-24 43-29 12m150-52 17 44" stroke="#fff" strokeWidth="1.2" />
      </> : <>
        <path d="m184 148 49-6 53 44-17 53-58-26-27-65Z" fill="#c5f460" strokeWidth="2.5" />
        <path d="m194 156 33 3 47 38m-70-30 53 40m-47 1 50 23" strokeWidth="1.2" />
        <path d="m209 148-8-22m-15 19-4-18m0 0c-15 1-29-11-29-25 0-16 11-28 26-27 20 1 28 21 23 35-4 10-10 16-20 17m-27-31 19-7 17 8m-21 14 12 3" strokeWidth="2.5" />
        <path d="m199 157-40 56-20 64-15 3-4 12 35-1 25-65 39-42m43 15 33 59 41 24 18 1 4 10-35 2-53-29-25-37" strokeWidth="2.5" />
        <path d="m269 235 48-7 48 43-8 42 24 14-4 12-43-14 5-46-35-22-51 20-37-29-5-35" fill="#171717" strokeWidth="2.5" />
        <path d="m232 248 23 17 50-20 47 29-7 41" stroke="#fff" strokeWidth="1.2" />
        <path d="m218 239-40 37-13 42-30 5 1 14 47 1 22-46 47-24" fill="#171717" strokeWidth="2.5" />
        <path d="m232 255-38 32-18 40" stroke="#fff" strokeWidth="1.2" />
        <path d="m136 324-12 6-9 15h64l4-9m153-11-2 18 53 2-2-11-8-6" fill="#fff" strokeWidth="2.5" />
        <path d="M86 185h49m-61 13h43m252-31h63m-49 14h37" strokeWidth="1.5" />
        <path d="m97 129 26-4m-23 15 21-4m289 84 10 10m-3-24 15 9" strokeWidth="1.1" />
      </>}
      <g strokeWidth="1" opacity=".3"><path d="M79 66h15m-7.5-7.5v15m365 207h15m-7.5-7.5v15M398 45h10m-5-5v10M83 258h10m-5-5v10" /><circle cx="467" cy="83" r="4" /><circle cx="119" cy="235" r="3" /></g>
    </g>
  </svg>;
}
