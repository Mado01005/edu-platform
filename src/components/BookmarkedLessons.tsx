'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function BookmarkedLessons() {
  const [bookmarks, setBookmarks] = useState<any[]>([]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('edu_bookmarks') || '[]');
    setBookmarks(saved.sort((a: any, b: any) => b.savedAt - a.savedAt));
  }, []);

  if (bookmarks.length === 0) return null;

  return (
    <div className="mb-10 fade-in" style={{ animationDelay: '0.12s' }}>
      <h3 className="text-sm font-bold text-yellow-400/80 uppercase tracking-widest mb-4 flex items-center gap-2">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
        My Saved Lessons
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {bookmarks.map((b, i) => (
          <Link
            key={i}
            href={`/subjects/${encodeURIComponent(b.subjectSlug)}/${encodeURIComponent(b.lessonSlug)}`}
            className="shrink-0 bg-yellow-500/5 border border-yellow-500/10 rounded-xl px-4 py-3 hover:bg-yellow-500/10 hover:border-yellow-500/20 transition-all group min-w-[180px]"
          >
            <p className="text-sm font-bold text-white truncate group-hover:text-yellow-300 transition">{b.lessonTitle}</p>
            <p className="text-[11px] text-gray-500 mt-0.5 truncate">{b.subjectTitle}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
