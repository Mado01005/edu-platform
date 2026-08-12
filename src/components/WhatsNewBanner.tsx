'use client';

import { useState, useEffect } from 'react';

interface NewContent {
  fileName: string;
  subjectId: string;
  lessonId: string;
  fileType: string;
  created_at: string;
}

export default function WhatsNewBanner() {
  const [newItems, setNewItems] = useState<NewContent[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user dismissed recently (stored in localStorage with timestamp)
    const dismissedAt = localStorage.getItem('whats-new-dismissed');
    if (dismissedAt) {
      const diff = Date.now() - parseInt(dismissedAt);
      // If dismissed less than 6 hours ago, don't show
      if (diff < 6 * 60 * 60 * 1000) {
        const dismiss = window.setTimeout(() => setDismissed(true), 0);
        return () => window.clearTimeout(dismiss);
      }
    }

    fetch('/api/whats-new')
      .then(r => r.json())
      .then(data => setNewItems(data.items || []))
      .catch(() => {});
  }, []);

  if (dismissed || newItems.length === 0) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('whats-new-dismissed', Date.now().toString());
  };

  // Group by subject
  const grouped: Record<string, string[]> = {};
  newItems.forEach(item => {
    const key = item.lessonId || item.subjectId || 'Unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item.fileName);
  });

  return (
    <div className="relative mb-6 flex items-start gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm fade-in">
      <div className="mt-0.5 shrink-0 rounded-xl bg-emerald-100 p-2">
        <svg className="h-5 w-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </div>
      <div className="flex-1">
        <p className="mb-1 text-sm font-semibold text-emerald-800">📚 New Material Added!</p>
        <p className="text-sm text-slate-600">
          {newItems.length} new file{newItems.length !== 1 ? 's' : ''} added in the last 24 hours — check your courses for fresh content!
        </p>
      </div>
      <button onClick={handleDismiss} className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-emerald-100 hover:text-slate-700">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
}
