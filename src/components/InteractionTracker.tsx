'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';

interface TrackedEvent {
  action: string;
  details: Record<string, string>;
  timestamp: number;
}

export default function InteractionTracker() {
  const pathname = usePathname();
  const eventBuffer = useRef<TrackedEvent[]>([]);
  const flushTimer = useRef<NodeJS.Timeout | null>(null);

  const flush = useCallback(() => {
    if (eventBuffer.current.length === 0) return;

    const events = [...eventBuffer.current];
    eventBuffer.current = [];

    // Send all buffered events in a single request
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'USER_INTERACTIONS_BATCH',
        details: { events, count: events.length }
      })
    }).catch(() => {});
  }, []);

  useEffect(() => {
    // CLICK TRACKER — buffers events instead of firing per-click
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const tag = target.tagName.toLowerCase();
      const text = target.innerText?.slice(0, 50).trim() || target.getAttribute('aria-label') || '';
      const id = target.id || '';

      // Only track interactive elements
      if (['button', 'a', 'input', 'select', 'label'].includes(tag) || target.onclick || target.closest('button') || target.closest('a')) {
        eventBuffer.current.push({
          action: 'USER_CLICK',
          details: { tag, text, id, path: pathname },
          timestamp: Date.now()
        });
      }
    };

    // SCROLL TRACKER — throttled to 15s and batched
    let lastScrollLog = 0;
    const handleScroll = () => {
      const now = Date.now();
      if (now - lastScrollLog < 15000) return; // 15s throttle (was 5s)

      const winHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const scrollPercent = Math.round((scrollTop / (docHeight - winHeight)) * 100);

      if (isNaN(scrollPercent)) return;

      lastScrollLog = now;
      eventBuffer.current.push({
        action: 'USER_SCROLL',
        details: { percent: String(scrollPercent), path: pathname },
        timestamp: now
      });
    };

    window.addEventListener('click', handleClick);
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Flush every 10 seconds
    flushTimer.current = setInterval(flush, 10000);

    // Flush on tab hide or page unload
    const handleVisibilityChange = () => {
      if (document.hidden) flush();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (flushTimer.current) clearInterval(flushTimer.current);
      flush(); // Final flush on unmount
    };
  }, [pathname, flush]);

  return null;
}
