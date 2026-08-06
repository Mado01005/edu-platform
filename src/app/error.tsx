'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled Server Component Error:', {
      digest: error.digest,
      error,
      message: error.message,
      stack: error.stack,
    });
  }, [error]);

  return (
    <main className="flex min-h-screen w-full items-center justify-center overflow-x-hidden bg-black px-4 text-white">
      <section className="flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border border-red-500/20 bg-zinc-950 p-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-200">
          <AlertTriangle className="size-6" />
        </span>
        <h1 className="text-2xl font-black">This page could not be loaded</h1>
        <p className="text-sm leading-6 text-zinc-400">
          {error.message ||
            'An unexpected error occurred while rendering this view.'}
        </p>
        {error.digest ? (
          <p className="break-all text-xs font-medium text-zinc-600">
            Reference: {error.digest}
          </p>
        ) : null}
        <button
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-black"
          onClick={reset}
          type="button"
        >
          <RotateCcw className="size-4" /> Try again
        </button>
      </section>
    </main>
  );
}
