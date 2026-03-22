'use client';

import { useState, useEffect } from 'react';

interface DailyStreakProps {
  userEmail: string;
}

export default function DailyStreak({ userEmail }: DailyStreakProps) {
  const [streak, setStreak] = useState(0);
  const [todayLogged, setTodayLogged] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const streakData = JSON.parse(localStorage.getItem('edu_streak') || '{"count":0,"lastDate":""}');
    
    if (streakData.lastDate === today) {
      // Already logged today
      setStreak(streakData.count);
      setTodayLogged(true);
    } else {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (streakData.lastDate === yesterday) {
        // Consecutive day — increment streak
        const newCount = streakData.count + 1;
        setStreak(newCount);
        localStorage.setItem('edu_streak', JSON.stringify({ count: newCount, lastDate: today }));
      } else {
        // Streak broken — reset to 1
        setStreak(1);
        localStorage.setItem('edu_streak', JSON.stringify({ count: 1, lastDate: today }));
      }
      setTodayLogged(true);
    }
  }, []);

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
