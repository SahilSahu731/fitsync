import type { Metadata } from "next";
import { Login } from "@/components/login";
export const metadata: Metadata = {
  title: "Log in",
  description:
    "Welcome back to FitSync. Sign in to reconnect with your training and fitness profile.",
};
export default function Page() {
  return <Login />;
}
