'use client';

import { useEffect, useMemo, useState } from 'react';

function remainingParts(startTime: string, now: number) {
  const remaining = Math.max(0, new Date(startTime).getTime() - now);
  const totalSeconds = Math.floor(remaining / 1_000);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return { hours, minutes, seconds };
}

export function LiveClassTicker({
  startTime,
  title,
}: {
  startTime: string | null;
  title: string | null;
}) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = useMemo(
    () => (startTime && now > 0 ? remainingParts(startTime, now) : null),
    [now, startTime],
  );
  const countdown = remaining
    ? `${String(remaining.hours).padStart(2, '0')}:${String(remaining.minutes).padStart(2, '0')}:${String(remaining.seconds).padStart(2, '0')}`
    : '--:--:--';

  return (
    <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#D4AF37]/50 bg-[#FBF6E2] px-3 py-2 text-xs font-extrabold text-[#1A2E22] sm:px-4">
      <span aria-hidden="true" className="size-2 shrink-0 animate-pulse rounded-full bg-red-600" />
      <span className="truncate">
        <span data-language-copy="en">Next Live Masterclass{title ? ` · ${title}` : ''} starting in </span>
        <span data-language-copy="ar">المحاضرة المباشرة القادمة{title ? ` · ${title}` : ''} تبدأ خلال </span>
      </span>
      <time className="shrink-0 font-mono tabular-nums text-[#084B2B]" dateTime={startTime ?? undefined}>
        {countdown}
      </time>
    </div>
  );
}
