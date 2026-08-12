'use client';

import { useMemo, useSyncExternalStore } from 'react';
import Link from 'next/link';

type Bookmark = {
  subjectSlug: string;
  lessonSlug: string;
  lessonTitle: string;
  subjectTitle: string;
  savedAt: number;
};

const subscribe = (notify: () => void) => {
  window.addEventListener('storage', notify);
  window.addEventListener('edu-bookmarks-changed', notify);
  return () => {
    window.removeEventListener('storage', notify);
    window.removeEventListener('edu-bookmarks-changed', notify);
  };
};
const getSnapshot = () => localStorage.getItem('edu_bookmarks') ?? '[]';
const getServerSnapshot = () => '[]';

export default function BookmarkedLessons() {
  const storedBookmarks = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const bookmarks = useMemo(() => {
    try {
      const value: unknown = JSON.parse(storedBookmarks);
      if (!Array.isArray(value)) return [];
      return (value as Bookmark[]).sort((a, b) => b.savedAt - a.savedAt);
    } catch {
      return [];
    }
  }, [storedBookmarks]);

  if (bookmarks.length === 0) return null;

  return (
    <div className="mb-10 fade-in" style={{ animationDelay: '0.12s' }}>
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-amber-700">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
        My Saved Lessons
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {bookmarks.map((b, i) => (
          <Link
            key={i}
            href={`/subjects/${encodeURIComponent(b.subjectSlug)}/${encodeURIComponent(b.lessonSlug)}`}
            className="group min-w-[180px] shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 transition hover:border-amber-300 hover:bg-amber-100"
          >
            <p className="truncate text-sm font-semibold text-slate-900 transition group-hover:text-amber-800">{b.lessonTitle}</p>
            <p className="mt-0.5 truncate text-[11px] text-slate-500">{b.subjectTitle}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
