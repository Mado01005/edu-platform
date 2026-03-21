'use client';

import { useState } from 'react';

type CompleteButtonProps = {
  subjectSlug: string;
  lessonSlug: string;
  initialCompleted: boolean;
};

export default function CompleteButton({ subjectSlug, lessonSlug, initialCompleted }: CompleteButtonProps) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [loading, setLoading] = useState(false);

  const toggleComplete = async () => {
    if (completed) return; // Cannot undo completion via this button currently
    setLoading(true);
    
    try {
      // We quietly ping the same analytics engine to log the progression natively
      await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'Completed Lesson',
          url: window.location.href,
          details: { subjectSlug, lessonSlug }
        })
      });
      setCompleted(true);
    } catch (error) {
      console.error('Failed to log completion:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-12 pt-8 border-t border-white/10 flex justify-center fade-in">
      <button 
        onClick={toggleComplete}
        disabled={completed || loading}
        className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-xl ${
          completed 
            ? 'bg-green-500/10 text-green-400 border border-green-500/20 cursor-default ring-2 ring-green-500/20' 
            : 'bg-white text-black hover:bg-gray-200 hover:scale-105 active:scale-95'
        }`}
      >
        {completed ? (
          <>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
            Lesson Completed
          </>
        ) : (
          <>
            {loading ? 'Marking...' : 'Mark as Complete'}
          </>
        )}
      </button>
    </div>
  );
}
