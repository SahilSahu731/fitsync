import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/session";
export const metadata: Metadata = { title: { default: "FitSync — Training, tracking & progress", template: "%s | FitSync" }, description: "Learn exercises, build your fitness profile, and keep your training in sync." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><a href="#main" className="skip-link">Skip to content</a><SessionProvider>{children}</SessionProvider></body></html>;
}
