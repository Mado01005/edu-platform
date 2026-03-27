'use client';

import React from 'react';

interface StreakBadgeProps {
  count: number;
}

export default function StreakBadge({ count }: StreakBadgeProps) {
  if (count <= 0) return null;

  // Tier 3: Top-Tier (30+)
  if (count >= 30) {
    return (
      <div className="flex items-center gap-2 group cursor-default" title={`${count} day streak - Top-Tier Prestige`}>
        <div className="relative">
          <span className="text-2xl drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] group-hover:scale-110 transition-transform duration-300 block">👑</span>
          <div className="absolute inset-0 bg-amber-400 blur-xl opacity-20 animate-pulse"></div>
        </div>
        <span className="text-xl bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(168,85,247,0.9)] font-black tracking-wide">
          {count} DAY STREAK
        </span>
      </div>
    );
  }

  // Tier 2: Plasma (10-29)
  if (count >= 10) {
    return (
      <div className="flex items-center gap-2 group cursor-default" title={`${count} day streak - Plasma Prestige`}>
        <span className="text-lg animate-bounce group-hover:scale-110 transition-transform">☄️</span>
        <span className="flex items-center gap-1 text-lg bg-gradient-to-t from-blue-600 via-cyan-400 to-blue-300 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse font-extrabold">
          {count} DAY STREAK
        </span>
      </div>
    );
  }

  // Tier 1: Spark (1-9)
  return (
    <div className="flex items-center gap-2 group cursor-default" title={`${count} day streak`}>
      <span className="text-lg group-hover:rotate-12 transition-transform">🔥</span>
      <span className="flex items-center gap-1 text-lg bg-gradient-to-t from-orange-600 to-yellow-400 bg-clip-text text-transparent drop-shadow-sm font-bold">
        {count} DAY STREAK
      </span>
    </div>
  );
}
