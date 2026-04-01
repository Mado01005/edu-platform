'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function SessionTracker() {
  const pathname = usePathname();
  const lastActivityTime = useRef(Date.now());
  const isIdle = useRef(false);

  useEffect(() => {
    // Throttled activity tracker — fires max once per second
    let activityThrottled = false;
    const updateActivity = () => {
      if (activityThrottled) return;
      activityThrottled = true;
      setTimeout(() => { activityThrottled = false; }, 1000);

      lastActivityTime.current = Date.now();
      if (isIdle.current) {
        isIdle.current = false;
        sendHeartbeat(); // Instant ping on return from idle
      }
    };

    const sendHeartbeat = () => {
      // Skip heartbeat on login page or for hidden tabs
      if (document.hidden || pathname === '/login') return;

      const now = Date.now();
      // If no activity for 5 minutes, mark as idle
      if (now - lastActivityTime.current > 300000) {
        isIdle.current = true;
      }

      fetch('/api/analytics/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPage: pathname,
          isIdle: isIdle.current,
        })
      }).catch(() => {});
    };

    // Use passive listeners for scroll — avoids blocking the main thread
    window.addEventListener('mousemove', updateActivity, { passive: true });
    window.addEventListener('keydown', updateActivity, { passive: true });
    window.addEventListener('scroll', updateActivity, { passive: true });
    window.addEventListener('click', updateActivity, { passive: true });

    // Heartbeat every 60 seconds (was 30s — halves Vercel function invocations)
    const heartbeatInterval = setInterval(sendHeartbeat, 60000);
    
    // Initial ping
    sendHeartbeat();

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      window.removeEventListener('click', updateActivity);
      clearInterval(heartbeatInterval);
    };
  }, [pathname]);

  return null;
}
