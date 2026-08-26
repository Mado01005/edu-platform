'use client';

import { useEffect, useRef, useState } from 'react';

export function JoinLiveClassButton({ startTime, zoomSessionId }: { startTime: string; zoomSessionId: string }) {
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [now, setNow] = useState(0);
  const heartbeatRef = useRef<number | null>(null);
  const opensAt = new Date(startTime).getTime() - 10 * 60_000;
  const enabled = now >= opensAt;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!tracking) return;
    const update = (action: 'heartbeat' | 'leave') => {
      const body = JSON.stringify({ action, zoomSessionId });
      if (action === 'leave' && navigator.sendBeacon) {
        navigator.sendBeacon('/api/lms/attendance/live', new Blob([body], { type: 'application/json' }));
        return;
      }
      void fetch('/api/lms/attendance/live', {
        body,
        headers: { 'Content-Type': 'application/json' },
        keepalive: action === 'leave',
        method: 'POST',
      });
    };
    heartbeatRef.current = window.setInterval(() => update('heartbeat'), 60_000);
    const leave = () => update('leave');
    window.addEventListener('pagehide', leave);
    return () => {
      if (heartbeatRef.current) window.clearInterval(heartbeatRef.current);
      window.removeEventListener('pagehide', leave);
      update('leave');
    };
  }, [tracking, zoomSessionId]);

  async function join() {
    if (joining || !enabled) return;
    const meetingWindow = window.open('', '_blank');
    if (meetingWindow) meetingWindow.opener = null;
    setJoining(true);
    setError('');
    try {
      const response = await fetch('/api/lms/attendance/live', {
        body: JSON.stringify({ action: 'join', zoomSessionId }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; meetingUrl?: string };
      if (!response.ok || !result.meetingUrl) throw new Error(result.error ?? 'Unable to join class.');
      setTracking(true);
      if (meetingWindow) meetingWindow.location.href = result.meetingUrl;
      else window.location.href = result.meetingUrl;
    } catch (caught) {
      meetingWindow?.close();
      setError(caught instanceof Error ? caught.message : 'Unable to join class.');
    } finally {
      setJoining(false);
    }
  }

  const countdown = Math.max(0, Math.ceil((opensAt - now) / 60_000));
  return (
    <div className="shrink-0">
      <button className="w-full rounded-xl bg-[#084B2B] px-4 py-3 text-center text-sm font-black text-white transition hover:bg-[#0F6E41] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600" disabled={joining || !enabled} onClick={() => void join()} type="button">
        {joining ? 'Recording attendance…' : tracking ? '🔴 Live attendance active' : enabled ? 'Join Live Lecture' : `Opens in ${countdown} min`}
      </button>
      {error ? <p aria-live="polite" className="mt-2 max-w-56 text-xs font-bold text-red-700">{error}</p> : null}
    </div>
  );
}
