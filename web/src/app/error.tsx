"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main
      id="main"
      className="flex min-h-[50vh] flex-col items-center justify-center gap-5 px-5 py-20 text-center [&>p]:max-w-lg [&>p]:leading-7 [&>p]:text-muted [&>h2]:text-3xl"
    >
      <h1>Something interrupted your session.</h1>
      <p>Please try loading this page again.</p>
      <button
        className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-white/85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        onClick={reset}
      >
        Try again
      </button>
    </main>
  );
}
