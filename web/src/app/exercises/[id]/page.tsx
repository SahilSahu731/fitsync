import { PublicShell } from "@/components/shell";
import { AccessGate } from "@/components/session";
import { ExerciseDetail } from "@/components/exercise-detail";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <PublicShell><main id="main" className="page-background"><div className="container page-container"><AccessGate><ExerciseDetail id={id} /></AccessGate></div></main></PublicShell>; }
