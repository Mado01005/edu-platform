'use client';

import { Loader2, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ParentLoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    const response = await fetch('/api/mps/login', {
      body: JSON.stringify({ phone, pin }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    setPending(false);
    if (!response.ok) {
      setError(result.error ?? 'Unable to sign in.');
      return;
    }
    router.replace('/mps');
    router.refresh();
  }

  return (
    <form className="flex min-w-0 flex-col gap-3" onSubmit={submit}>
      <label className="text-xs font-bold text-zinc-400">Parent phone number
        <input autoComplete="tel" className="mt-2 w-full min-w-0 rounded-xl border border-white/10 bg-black px-4 py-3 text-base" onChange={(event) => setPhone(event.target.value)} placeholder="010 1234 5678" required type="tel" value={phone} />
      </label>
      <label className="text-xs font-bold text-zinc-400">4-digit PIN
        <input autoComplete="current-password" className="mt-2 w-full min-w-0 rounded-xl border border-white/10 bg-black px-4 py-3 text-center text-2xl tracking-[0.45em]" inputMode="numeric" maxLength={4} onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))} pattern="\d{4}" required type="password" value={pin} />
      </label>
      {error ? <p aria-live="polite" className="text-xs text-red-300">{error}</p> : null}
      <button className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-3 text-sm font-black text-black disabled:opacity-50" disabled={pending || pin.length !== 4} type="submit">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
        {pending ? 'Signing in…' : 'Open parent radar'}
      </button>
    </form>
  );
}
