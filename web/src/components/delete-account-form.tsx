"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useSession } from "./session";

export function DeleteAccountForm() {
  const router = useRouter();
  const { account, reload } = useSession();
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <section className="mt-10 max-w-4xl rounded-3xl border border-red-400/25 p-6 sm:p-8">
      <h2 className="text-2xl font-medium">Delete your account</h2>
      <p className="mt-4 text-base leading-7 text-white/70">
        This permanently removes your FitSync account and associated data. Cancel any subscription
        through your app store separately before deleting. This cannot be undone.
      </p>
      <form
        className="mt-6 flex flex-col items-start gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (confirmation !== "DELETE" || busy || !account) return;
          setBusy(true);
          setError("");
          try {
            await api("/me", {
              method: "DELETE",
              headers: { "X-FitSync-Owner": account.user.id },
              json: { confirmation },
            });
            // Clear browser session cookies even though the upstream session is now revoked.
            await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
            await reload();
            router.replace("/login");
            router.refresh();
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Deletion failed. Please retry.");
            setBusy(false);
          }
        }}
      >
        <label className="flex flex-col gap-2 text-base">
          Type DELETE to confirm
          <input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
          />
        </label>
        <button
          type="submit"
          disabled={confirmation !== "DELETE" || busy}
          className="min-h-12 rounded-full bg-red-300 px-6 py-3 text-base font-medium text-black disabled:opacity-40"
        >
          {busy ? "Deleting…" : "Delete permanently"}
        </button>
        {error && (
          <p role="alert" className="text-base text-red-200">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
