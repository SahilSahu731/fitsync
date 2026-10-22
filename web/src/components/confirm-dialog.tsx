"use client";
import { useEffect, useRef } from "react";
export function ConfirmDialog({ title, description, confirm, busy, onCancel, onConfirm }: { title: string; description: string; confirm: string; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className="confirm-dialog" aria-labelledby="confirmation-title" aria-describedby="confirmation-description" onCancel={e => { e.preventDefault(); if (!busy) onCancel(); }}><h2 id="confirmation-title">{title}</h2><p id="confirmation-description">{description}</p><div className="button-row"><button autoFocus className="button secondary" disabled={busy} onClick={onCancel}>Cancel</button><button className="button danger" disabled={busy} onClick={onConfirm}>{busy ? "Removing…" : confirm}</button></div></dialog>;
}
