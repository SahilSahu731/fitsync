import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/session";
export const metadata: Metadata = { title: { default: "FitSync — Training, tracking & progress", template: "%s | FitSync" }, description: "Learn exercises, build your fitness profile, and keep your training in sync." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" data-scroll-behavior="smooth"><body><a href="#main" className="fixed -top-24 left-5 z-100 rounded-md bg-brand px-5 py-3 font-semibold text-ink focus:top-3">Skip to content</a><SessionProvider>{children}</SessionProvider></body></html>;
}
