import type { Metadata } from "next";
import { Login } from "@/components/login";
export const metadata: Metadata = {
  title: "Create an account",
  description:
    "Make your first move with a free FitSync account. Your training, your profile, and your pace.",
};
export default function Page() {
  return <Login register />;
}
