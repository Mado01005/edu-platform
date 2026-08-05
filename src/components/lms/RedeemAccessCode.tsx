'use client';

import { KeyRound, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function RedeemAccessCode() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function redeem() {
    setSaving(true);
    setError('');
    const response = await fetch('/api/codes/redeem', {
      body: JSON.stringify({ code }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
      launchUrl?: string;
    };
    setSaving(false);
    if (!response.ok || !result.launchUrl) {
      setError(result.error ?? 'Unable to redeem this code.');
      return;
    }
    setOpen(false);
    router.push(result.launchUrl);
    router.refresh();
  }

  return (
    <>
      <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-black text-white hover:bg-white/5" onClick={() => setOpen(true)} type="button">
        <KeyRound className="size-4" /> Redeem digital code
      </button>
      {open ? (
        <div aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-5">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-300">Instant access</p>
                <h2 className="mt-1 text-xl font-black">Redeem digital access code</h2>
              </div>
              <button aria-label="Close" className="rounded-xl border border-white/10 p-2" onClick={() => setOpen(false)} type="button"><X className="size-4" /></button>
            </div>
            <label className="mt-5 block text-xs font-bold text-zinc-400">12-digit code
              <input autoComplete="one-time-code" className="mt-1 w-full rounded-xl border border-white/10 bg-black px-4 py-3 font-mono text-lg tracking-[0.2em]" inputMode="numeric" maxLength={14} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 12))} placeholder="123456789012" value={code} />
            </label>
            {error ? <p aria-live="polite" className="mt-3 text-xs text-red-300">{error}</p> : null}
            <button className="mt-4 w-full rounded-xl bg-violet-300 px-4 py-3 text-sm font-black text-black disabled:opacity-50" disabled={saving || code.length !== 12} onClick={() => void redeem()} type="button">
              {saving ? 'Activating…' : 'Activate and launch course'}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
