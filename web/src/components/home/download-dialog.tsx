"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Smartphone, X } from "lucide-react";
import { toQR } from "toqr";

import type { MobileDownloadSetting } from "@/lib/types";

function DownloadCode({ url }: { url: string }) {
  const modules = toQR(url);
  const side = Math.sqrt(modules.length);
  const border = 4;
  const size = side + border * 2;
  const path = Array.from(modules, (filled, index) =>
    filled ? `M${index % side} ${Math.floor(index / side)}h1v1h-1z` : "",
  ).join("");
  return (
    <svg
      role="img"
      aria-label="QR code for the mobile download link"
      width={size * Math.max(2, Math.ceil(195 / size))}
      viewBox={`-${border} -${border} ${size} ${size}`}
      shapeRendering="crispEdges"
      className="mx-auto block h-auto max-w-full bg-white"
    >
      <path d={path} fill="black" />
    </svg>
  );
}

export function DownloadDialog({ onClose }: { onClose: () => void }) {
  const panel = useRef<HTMLDialogElement>(null);
  const [download, setDownload] = useState<MobileDownloadSetting | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const dialog = panel.current;
    if (!dialog) return;
    const trigger = document.activeElement;
    dialog.showModal();
    const alreadyLocked = document.body.classList.contains("overflow-hidden");
    document.body.classList.add("overflow-hidden");
    return () => {
      dialog.close();
      if (trigger instanceof HTMLElement && trigger.isConnected)
        trigger.focus({ preventScroll: true });
      if (!alreadyLocked) document.body.classList.remove("overflow-hidden");
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/backend/site/mobile-download", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error();
        const result: MobileDownloadSetting = await response.json();
        const url = new URL(result.url);
        if (!["http:", "https:"].includes(url.protocol) || url.href.length > 2000)
          throw new Error();
        if (active) setDownload({ ...result, url: url.href });
      } catch {
        if (active) setFailed(true);
      } finally {
        window.clearTimeout(timeout);
      }
    }
    void load();
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);

  return (
    <dialog
      ref={panel}
      aria-labelledby="download-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX >= bounds.right ||
          event.clientY < bounds.top ||
          event.clientY >= bounds.bottom
        )
          onClose();
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-3xl border border-white/10 bg-panel p-4 text-center min-[360px]:p-6 text-white shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-sm sm:p-8"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close download dialog"
        className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
      >
        <X size={19} />
      </button>
      <Smartphone
        aria-hidden="true"
        size={28}
        strokeWidth={1.4}
        className="mx-auto mb-4 text-brand"
      />
      <h2 id="download-title" className="text-3xl font-medium tracking-tight">
        FitSync for Android
      </h2>
      {download ? (
        <>
          <p className="my-5 text-sm leading-6 text-white/65">
            {download.isPlaceholder
              ? "Until FitSync launches, this button and QR code open the Health Connect listing on Google Play."
              : "Scan with your phone camera, or open the download link below."}
          </p>
          <div className="mx-auto w-fit max-w-full overflow-hidden rounded-xl bg-white p-1.5">
            <DownloadCode url={download.url} />
          </div>
          <a
            href={download.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mx-auto mt-3 block w-52 max-w-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <Image
              src="/brand/google-play-badge.png"
              alt="Get it on Google Play"
              width={646}
              height={250}
              unoptimized
              className="h-auto w-full"
            />
          </a>
        </>
      ) : (
        <div className="mt-6 text-sm leading-6 text-white/65">
          <p role="status">
            {failed ? "The download link couldn’t load." : "Loading download link…"}
          </p>
          {failed && (
            <button
              type="button"
              className="mt-3 min-h-11 rounded-full bg-white/10 px-5 text-white hover:bg-white/15"
              onClick={() => {
                setFailed(false);
                setAttempt(attempt + 1);
              }}
            >
              Try again
            </button>
          )}
        </div>
      )}
    </dialog>
  );
}
