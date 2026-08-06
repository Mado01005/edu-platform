'use client';

import { Eye } from 'lucide-react';

export function CourseHeader({ slug, title }: { slug: string; title: string }) {
  function openStudentPreview() {
    window.open(
      `/courses/${encodeURIComponent(slug)}?preview=true`,
      '_blank',
      'noopener,noreferrer',
    );
  }

  return (
    <header className="flex min-w-0 flex-col gap-3 px-4 pb-3 pt-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-300">
          Teacher Studio
        </p>
        <h1 className="mt-1 truncate text-2xl font-black">{title}</h1>
      </div>
      <button
        className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-black transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        onClick={openStudentPreview}
        type="button"
      >
        <Eye aria-hidden="true" className="size-4" />
        Preview as Student
      </button>
    </header>
  );
}
