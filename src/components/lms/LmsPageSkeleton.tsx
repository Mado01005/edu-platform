export function LmsPageSkeleton() {
  return (
    <div
      aria-label="Loading page"
      aria-live="polite"
      className="flex min-h-screen w-full flex-col items-center overflow-x-hidden bg-black px-4 py-6 text-white"
      role="status"
    >
      <div className="flex w-full max-w-md animate-pulse flex-col gap-4">
        <div className="h-16 rounded-2xl bg-white/10" />
        <div className="h-40 rounded-3xl bg-white/10" />
        <div className="h-24 rounded-2xl bg-white/10" />
        <div className="h-24 rounded-2xl bg-white/10" />
        <span className="sr-only">Loading…</span>
      </div>
    </div>
  );
}
