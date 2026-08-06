'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled Root Layout Error:', {
      digest: error.digest,
      error,
      message: error.message,
      stack: error.stack,
    });
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-zinc-950 text-white">
        <main className="flex min-h-screen w-full items-center justify-center overflow-x-hidden px-4 text-center">
          <section className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 backdrop-blur-sm">
            <h1 className="text-xl font-bold">Something went wrong</h1>
            <p className="text-sm leading-6 text-zinc-400">
              {error.message ||
                'An unexpected error occurred while loading the application.'}
            </p>
            {error.digest ? (
              <p className="break-all text-xs font-medium text-zinc-600">
                Reference: {error.digest}
              </p>
            ) : null}
            <button
              className="mt-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-500"
              onClick={reset}
              type="button"
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
