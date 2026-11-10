import { PublicShell } from "@/components/shell";
import { TrainingDetail } from "@/components/training-detail";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PublicShell><main id="main" className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12 pt-12 pb-18"><TrainingDetail key={id} kind="programs" id={id} /></main></PublicShell>;
}
