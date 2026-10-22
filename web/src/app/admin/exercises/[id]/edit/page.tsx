import { ExerciseEditor } from "@/components/exercise-editor";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <ExerciseEditor id={id} />; }
