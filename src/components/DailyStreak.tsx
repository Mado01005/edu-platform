'use client';

import { useState, useEffect, useRef } from 'react';

interface DailyStreakProps {
  userEmail: string;
  /** Server-side streak count from Supabase, used as the source of truth on initial render */
  initialStreak?: number;
}

export default function DailyStreak({ userEmail, initialStreak = 0 }: DailyStreakProps) {
  const [streak, setStreak] = useState(initialStreak);
  const hasFired = useRef(false);

  useEffect(() => {
    // Prevent React Strict Mode double-fire in development
    if (hasFired.current) return;
    hasFired.current = true;

    async function syncStreak() {
      // Use local date string (user's browser timezone) to avoid UTC midnight drift
      const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local tz

      try {
        const response = await fetch('/api/user/sync-streak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ localDate: today })
        });

        if (response.ok) {
          const data = await response.json();
          setStreak(data.streak);
          // Sync localStorage for fast hydration on next visit
          localStorage.setItem('edu_streak', JSON.stringify({ count: data.streak, lastDate: today }));
        } else {
          // Fallback to localStorage if API fails
          const streakData = JSON.parse(localStorage.getItem('edu_streak') || '{"count":0,"lastDate":""}');
          if (streakData.lastDate === today) {
            setStreak(Math.max(streakData.count, initialStreak));
          }
        }
      } catch (err) {
        console.error('Failed to sync streak:', err);
      }
    }

    syncStreak();
  }, [initialStreak]);

  if (streak === 0) return null;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
      streak >= 7
        ? 'bg-orange-500/10 border border-orange-500/20 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)]'
        : streak >= 3
        ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400'
        : 'bg-white/5 border border-white/10 text-gray-300'
    }`}>
      <span className="text-base">{streak >= 7 ? '🔥' : streak >= 3 ? '⚡' : '📅'}</span>
      <span>{streak}-day streak</span>
    </div>
  );
}
