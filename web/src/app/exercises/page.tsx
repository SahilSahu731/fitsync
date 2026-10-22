import { PublicShell } from "@/components/shell";
import { AccessGate } from "@/components/session";
import { ExerciseLibrary } from "@/components/exercise-library";
export default function Page() { return <PublicShell><main id="main" className="page-background"><div className="container page-container"><AccessGate><ExerciseLibrary /></AccessGate></div></main></PublicShell>; }
