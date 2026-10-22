"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main id="main" className="empty-state"><h1>Something interrupted your session.</h1><p>Please try loading this page again.</p><button className="button" onClick={reset}>Try again</button></main>; }
