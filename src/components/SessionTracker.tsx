'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function SessionTracker() {
  const pathname = usePathname();

  useEffect(() => {
    let lastActivityTime = Date.now();
    let isIdle = false;
    let heartbeatInterval: NodeJS.Timeout;

    // Reset idle timer on user activity
    const updateActivity = () => {
      lastActivityTime = Date.now();
      if (isIdle) {
        isIdle = false;
        // Instantly ping if they came back from being idle
        sendHeartbeat();
      }
    };

    const sendHeartbeat = () => {
      const now = Date.now();
      // If no activity for 5 minutes (300,000 ms), mark as idle
      if (now - lastActivityTime > 300000) {
        isIdle = true;
      }

      fetch('/api/analytics/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPage: pathname,
          isIdle: isIdle,
        })
      }).catch(() => {}); // Silent ignore
    };

    // Attach listeners
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('scroll', updateActivity);
    window.addEventListener('click', updateActivity);

    // Run heartbeat every 60 seconds
    heartbeatInterval = setInterval(sendHeartbeat, 60000);
    
    // Initial ping on load
    sendHeartbeat();

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      window.removeEventListener('click', updateActivity);
      clearInterval(heartbeatInterval);
    };
  }, [pathname]);

  return null; // Headless component
}
