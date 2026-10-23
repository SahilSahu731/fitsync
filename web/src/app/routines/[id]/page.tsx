import { PublicShell } from "@/components/shell";
import { TrainingDetail } from "@/components/training-detail";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PublicShell><main id="main" className="container training-page"><TrainingDetail key={id} kind="routines" id={id} /></main></PublicShell>;
}
