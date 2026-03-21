'use client';

import { useEffect, useRef } from 'react';

interface ViewTrackerProps {
  action: string;
  details?: Record<string, any>;
}

export default function ViewTracker({ action, details }: ViewTrackerProps) {
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current) return;
    logged.current = true;

    // Send the activity log silently
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, details }),
    }).catch(console.error); // Ignore fire-and-forget network errors
    
  }, [action, details]);

  return null; // Invisible tracker
}
