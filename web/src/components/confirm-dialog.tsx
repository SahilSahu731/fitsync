"use client";
import { useEffect, useRef } from "react";
export function ConfirmDialog({
  title,
  description,
  confirm,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirm: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-lg rounded-lg border border-line bg-panel p-7 text-ink shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-xs [&_h2]:text-2xl [&_p]:my-5 [&_p]:text-base [&_p]:leading-7 [&_p]:text-muted"
      aria-labelledby="confirmation-title"
      aria-describedby="confirmation-description"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <h2 id="confirmation-title">{title}</h2>
      <p id="confirmation-description">{description}</p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          autoFocus
          className="inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-brand px-5 py-3 text-base font-semibold text-background transition-colors hover:bg-brand-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 bg-panel! text-ink! ring-1 ring-inset ring-line hover:bg-surface! hover:ring-ink"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-brand px-5 py-3 text-base font-semibold text-background transition-colors hover:bg-brand-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 bg-brand! text-background! hover:bg-brand-hover!"
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? "Removing…" : confirm}
        </button>
      </div>
    </dialog>
  );
}
