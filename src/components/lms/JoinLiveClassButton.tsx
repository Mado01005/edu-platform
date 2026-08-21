'use client';

import { useState } from 'react';

export function JoinLiveClassButton({ zoomSessionId }: { zoomSessionId: string }) {
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  async function join() {
    const meetingWindow = window.open('about:blank', '_blank', 'noopener,noreferrer');
    setJoining(true);
    setError('');
    try {
      const response = await fetch('/api/lms/attendance/live', {
        body: JSON.stringify({ zoomSessionId }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        meetingUrl?: string;
      };
      if (!response.ok || !result.meetingUrl) throw new Error(result.error ?? 'Unable to join class.');
      if (meetingWindow) meetingWindow.location.href = result.meetingUrl;
      else window.location.href = result.meetingUrl;
    } catch (caught) {
      meetingWindow?.close();
      setError(caught instanceof Error ? caught.message : 'Unable to join class.');
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="shrink-0">
      <button className="w-full rounded-xl bg-[#084B2B] px-4 py-3 text-center text-sm font-black text-white transition hover:bg-[#063B22] disabled:opacity-60" disabled={joining} onClick={() => void join()} type="button">
        {joining ? 'Recording attendance…' : '🔴 Join live class'}
      </button>
      {error ? <p aria-live="polite" className="mt-2 max-w-48 text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
