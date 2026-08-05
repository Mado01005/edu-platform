'use client';

import { LogOut, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function ParentRadarClient() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 30_000);
    return () => window.clearInterval(timer);
  }, [router]);

  async function logout() {
    await fetch('/api/mps/logout', { method: 'POST' });
    router.replace('/mps/login');
    router.refresh();
  }

  return (
    <div className="grid min-w-0 grid-cols-2 gap-2">
      <button className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-black" onClick={() => { setRefreshing(true); router.refresh(); window.setTimeout(() => setRefreshing(false), 500); }} type="button"><RefreshCw className={`size-3 ${refreshing ? 'animate-spin' : ''}`} /> Refresh</button>
      <button className="flex items-center justify-center gap-2 rounded-xl border border-red-400/20 px-3 py-2 text-xs font-black text-red-300" onClick={() => void logout()} type="button"><LogOut className="size-3" /> Sign out</button>
    </div>
  );
}
