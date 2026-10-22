import Link from "next/link";
import { PublicShell } from "@/components/shell";
export default function NotFound() { return <PublicShell><main id="main" className="empty-state"><p className="eyebrow">404</p><h1>A little off track.</h1><p>This page doesn’t exist. Let’s get you back to your next movement.</p><Link className="button" href="/">Back to FitSync</Link></main></PublicShell>; }
