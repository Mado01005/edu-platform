'use client';

import { useState, useEffect } from 'react';

interface BookmarkButtonProps {
  subjectSlug: string;
  lessonSlug: string;
  lessonTitle: string;
  subjectTitle: string;
}

export default function BookmarkButton({ subjectSlug, lessonSlug, lessonTitle, subjectTitle }: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);

  const storageKey = `bookmark_${subjectSlug}_${lessonSlug}`;

  useEffect(() => {
    setIsBookmarked(localStorage.getItem(storageKey) === 'true');
  }, [storageKey]);

  const toggleBookmark = () => {
    const newState = !isBookmarked;
    setIsBookmarked(newState);

    if (newState) {
      localStorage.setItem(storageKey, 'true');
      // Save bookmark details for the dashboard "My Saved" section
      const bookmarks = JSON.parse(localStorage.getItem('edu_bookmarks') || '[]');
      if (!bookmarks.find((b: any) => b.subjectSlug === subjectSlug && b.lessonSlug === lessonSlug)) {
        bookmarks.push({ subjectSlug, lessonSlug, lessonTitle, subjectTitle, savedAt: Date.now() });
        localStorage.setItem('edu_bookmarks', JSON.stringify(bookmarks));
      }
    } else {
      localStorage.removeItem(storageKey);
      const bookmarks = JSON.parse(localStorage.getItem('edu_bookmarks') || '[]');
      localStorage.setItem('edu_bookmarks', JSON.stringify(
        bookmarks.filter((b: any) => !(b.subjectSlug === subjectSlug && b.lessonSlug === lessonSlug))
      ));
    }
  };

  return (
    <button
      onClick={toggleBookmark}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 border ${
        isBookmarked
          ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.15)]'
          : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'
      }`}
    >
      {isBookmarked ? (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
      )}
      {isBookmarked ? 'Saved' : 'Bookmark'}
    </button>
  );
}
