import { PublicShell } from "@/components/shell";
import { AccessGate } from "@/components/session";
import { ExerciseLibrary } from "@/components/exercise-library";
export default function Page() { return <PublicShell><main id="main" className="min-h-[70vh] bg-surface"><div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12 py-10 sm:py-14"><AccessGate><ExerciseLibrary /></AccessGate></div></main></PublicShell>; }
