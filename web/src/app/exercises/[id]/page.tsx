import { PublicShell } from "@/components/shell";
import { AccessGate } from "@/components/session";
import { ExerciseDetail } from "@/components/exercise-detail";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <PublicShell><main id="main" className="min-h-[70vh] bg-surface"><div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12 py-10 sm:py-14"><AccessGate><ExerciseDetail id={id} /></AccessGate></div></main></PublicShell>; }
