import type { Metadata } from "next";
import { Login } from "@/components/login";
export const metadata: Metadata = {
  title: "Log in",
  description: "Sign in to FitSync to manage your account, fitness profile and preferences.",
};
export default async function Page({ searchParams }: PageProps<"/login">) {
  return <Login returnTo={(await searchParams).next} />;
}
