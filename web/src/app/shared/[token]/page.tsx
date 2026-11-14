import type { Metadata } from "next";
import { SharedTrainingView } from "@/components/shared-training-view";
export const metadata: Metadata = {
  title: "Shared training",
  robots: { index: false, follow: false, noarchive: true },
  referrer: "no-referrer",
};
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SharedTrainingView key={token} token={token} />;
}
