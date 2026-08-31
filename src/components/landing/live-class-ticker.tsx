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
    <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-brand-rim bg-brand-surface px-3.5 py-2 text-[11px] font-extrabold text-brand-white shadow-sm shadow-black/20 backdrop-blur-sm sm:flex-nowrap sm:px-4">
      <span aria-hidden="true" className="relative flex size-2.5 shrink-0">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-gold-hover opacity-50" />
        <span className="relative inline-flex size-2.5 rounded-full bg-brand-gold" />
      </span>
      <span className="min-w-0 flex-1 leading-5 sm:truncate">
        Next Live Masterclass starting soon
        <span className="mx-1.5 text-brand-gold">|</span>
        <span className="font-arabic" dir="rtl" lang="ar">بث مباشر قادم</span>
        {title ? <span className="hidden sm:inline"> · {title}</span> : null}
      </span>
      <time className="shrink-0 rounded-full bg-brand-gold px-2 py-1 font-mono tabular-nums text-brand-base" dateTime={startTime ?? undefined}>
        {startTime ? countdown : 'SOON'}
      </time>
    </div>
  );
}
