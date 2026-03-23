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
        setDismissed(true);
        return;
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
    <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-4 shadow-lg shadow-emerald-500/5 fade-in relative">
      <div className="p-2 bg-emerald-500/20 rounded-xl shrink-0 mt-0.5 animate-pulse">
        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-emerald-300 mb-1">📚 New Material Added!</p>
        <p className="text-sm text-gray-300">
          {newItems.length} new file{newItems.length !== 1 ? 's' : ''} added in the last 24 hours — check your courses for fresh content!
        </p>
      </div>
      <button onClick={handleDismiss} className="shrink-0 text-gray-500 hover:text-white transition p-1 rounded-lg hover:bg-white/10">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
}
