"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api";
import type { MobileDownloadSetting } from "@/lib/types";
import { useAccountApi } from "./session";

export function MobileDownloadAdmin() {
  const api = useAccountApi();
  const [setting, setSetting] = useState<MobileDownloadSetting | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);
  const [conflict, setConflict] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api<MobileDownloadSetting>("/site/mobile-download", { signal: controller.signal })
      .then((current) => {
        if (controller.signal.aborted) return;
        setSetting(current);
        setUrl(current.url);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      });
    return () => controller.abort();
  }, [api, reload]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!setting || saving || conflict) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const updated = await api<MobileDownloadSetting>("/site/mobile-download", {
        method: "PUT",
        json: { url: url.trim(), revision: setting.revision },
      });
      setSetting(updated);
      setUrl(updated.url);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the download link.");
      setConflict(err instanceof ApiError && err.status === 409);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      aria-labelledby="mobile-download-title"
      className="mb-7 rounded-3xl bg-panel p-7 sm:p-9"
    >
      <h2 id="mobile-download-title" className="text-2xl font-medium">
        Mobile app download
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
        The download button and QR code on the website both open this link.
        {setting?.isPlaceholder && " The current link is the example Health Connect listing."}
      </p>
      {setting ? (
        <form onSubmit={save} className="mt-5 max-w-2xl">
          <label htmlFor="mobile-download-url" className="block text-sm font-medium">
            Download URL
          </label>
          <input
            id="mobile-download-url"
            type="url"
            required
            maxLength={2000}
            disabled={saving}
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              setSaved(false);
            }}
            className="mt-2 w-full"
          />
          <button
            type="submit"
            disabled={saving || conflict || url.trim() === setting.url}
            className="mt-4 rounded-full bg-white px-5 py-3 text-sm font-medium text-black disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save download link"}
          </button>
        </form>
      ) : (
        !error && (
          <p role="status" className="mt-4 text-sm text-muted">
            Loading download link…
          </p>
        )
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm">
          {error}
        </p>
      )}
      {error && (!setting || conflict) && (
        <button
          type="button"
          className="mt-3 text-sm font-medium underline"
          onClick={() => {
            setSetting(null);
            setConflict(false);
            setError("");
            setReload((value) => value + 1);
          }}
        >
          Reload current link
        </button>
      )}
      {saved && (
        <p role="status" className="mt-4 text-sm">
          Download link updated.
        </p>
      )}
    </section>
  );
}
