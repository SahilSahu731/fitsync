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
      className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-lg rounded-3xl bg-panel p-7 text-ink shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-xs [&_h2]:text-2xl [&_p]:my-5 [&_p]:text-base [&_p]:leading-7 [&_p]:text-muted"
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
          className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-white/85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 bg-panel! text-ink!  hover:bg-surface! "
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-white/85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 bg-brand! text-background! hover:bg-white/85!"
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? "Removing…" : confirm}
        </button>
      </div>
    </dialog>
  );
}
