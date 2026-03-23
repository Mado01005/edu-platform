'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function InteractionTracker() {
  const pathname = usePathname();
  const lastScrollLog = useRef<number>(0);

  useEffect(() => {
    // CLICK TRACKER
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // Extract useful metadata about the click target
      const tag = target.tagName.toLowerCase();
      const text = target.innerText?.slice(0, 50).trim() || target.getAttribute('aria-label') || '';
      const id = target.id || '';
      const classes = target.className.toString().slice(0, 50);

      // We only care about interactive elements or significant clicks
      if (['button', 'a', 'input', 'select', 'label'].includes(tag) || target.onclick || target.closest('button') || target.closest('a')) {
        fetch('/api/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'USER_CLICK',
            details: { tag, text, id, classes, path: pathname }
          })
        }).catch(() => {});
      }
    };

    // SCROLL TRACKER (Throttle to every 5 seconds or major changes)
    const handleScroll = () => {
      const now = Date.now();
      if (now - lastScrollLog.current < 5000) return; // 5s throttle

      const winHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const scrollPercent = Math.round((scrollTop / (docHeight - winHeight)) * 100);

      if (isNaN(scrollPercent)) return;

      lastScrollLog.current = now;
      fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'USER_SCROLL',
          details: { percent: scrollPercent, path: pathname }
        })
      }).catch(() => {});
    };

    window.addEventListener('click', handleClick);
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [pathname]);

  return null; // Headless
}
