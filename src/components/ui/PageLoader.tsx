interface PageLoaderProps {
  label?: string;
}

export function PageLoader({ label = "Loading…" }: PageLoaderProps) {
  return (
    <main className="flex h-full min-h-0 w-full items-center justify-center px-4 py-8">
      <p className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-500 shadow-sm">
        {label}
      </p>
    </main>
  );
}
