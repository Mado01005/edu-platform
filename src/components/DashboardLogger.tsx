'use client';

import { useEffect } from 'react';

export default function DashboardLogger() {
  useEffect(() => {
    // We only want to log this once per "session" in the browser tab to avoid flooding the DB
    const hasLogged = sessionStorage.getItem('dashboard_session_logged');
    
    if (!hasLogged) {
      fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'USER_LOGIN' })
      }).then(() => {
        sessionStorage.setItem('dashboard_session_logged', 'true');
      }).catch(err => console.error('Silent Logger Error:', err));
    }
  }, []);

  return null; // Headless component
}
