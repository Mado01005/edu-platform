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
      <div className="flex cursor-default items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5" title={`${count} day streak - Top-Tier Prestige`}>
        <span className="text-lg">👑</span>
        <span className="text-xs font-semibold text-amber-800">
          {count} DAY STREAK
        </span>
      </div>
    );
  }

  // Tier 2: Plasma (10-29)
  if (count >= 10) {
    return (
      <div className="flex cursor-default items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5" title={`${count} day streak - Plasma Prestige`}>
        <span className="text-base">☄️</span>
        <span className="text-xs font-semibold text-sky-800">
          {count} DAY STREAK
        </span>
      </div>
    );
  }

  // Tier 1: Spark (1-9)
  return (
    <div className="flex cursor-default items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5" title={`${count} day streak`}>
      <span className="text-base">🔥</span>
      <span className="text-xs font-semibold text-amber-800">
        {count} DAY STREAK
      </span>
    </div>
  );
}
