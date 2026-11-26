import type { Metadata } from "next";
import { Login } from "@/components/login";
export const metadata: Metadata = {
  title: "Create an account",
  description:
    "Create a free FitSync account for the Android app and manage your profile on the web.",
};
export default async function Page({ searchParams }: PageProps<"/register">) {
  return <Login register returnTo={(await searchParams).next} />;
}
