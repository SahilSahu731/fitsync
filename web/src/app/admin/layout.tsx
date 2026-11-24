import type { Metadata } from "next";
import { Workspace } from "@/components/shell";
export const metadata: Metadata = { robots: { index: false, follow: false, noarchive: true } };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <Workspace admin>{children}</Workspace>;
}
