"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/40">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-rose-600">Something went wrong</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">We couldn’t load this page.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Please try again. If the problem continues, return to the dashboard and retry later.</p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
