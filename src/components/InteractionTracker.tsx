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
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize the Web Worker on mount
    workerRef.current = new Worker('/telemetry-worker.js');
    
    return () => {
      // Terminate on unmount
      if (workerRef.current) workerRef.current.terminate();
    };
  }, []);

  const dispatchEvent = useCallback((action: string, details: Record<string, string>) => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'EVENT',
        payload: {
          action,
          details: { ...details, path: pathname },
          timestamp: Date.now()
        }
      });
    }
  }, [pathname]);

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
        dispatchEvent('USER_CLICK', { tag, text, id });
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
      dispatchEvent('USER_SCROLL', { percent: String(scrollPercent) });
    };

    window.addEventListener('click', handleClick);
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Force flush on tab hide or page unload
    const handleVisibilityChange = () => {
      if (document.hidden && workerRef.current) {
        workerRef.current.postMessage({ type: 'FLUSH' });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (workerRef.current) workerRef.current.postMessage({ type: 'FLUSH' });
    };
  }, [dispatchEvent]);

  return null;
}
