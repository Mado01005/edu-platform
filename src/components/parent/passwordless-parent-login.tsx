'use client';

import { KeyRound, Loader2, Send, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PhoneInput } from '@/components/UI/phone-input';
import { createSupabaseBrowserClient } from '@/lib/supabase/ssr-client';

export function PasswordlessParentLogin({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function sendCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError('');
    setNotice('');
    try {
      if (!enabled) throw new Error('Phone OTP is not enabled in this deployment yet.');
      const preflight = await fetch('/api/parent/otp', {
        body: JSON.stringify({ phone }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const preflightBody = await preflight.json() as { error?: string; phone?: string };
      if (!preflight.ok || !preflightBody.phone) throw new Error(preflightBody.error ?? 'This parent number is not linked.');
      const supabase = createSupabaseBrowserClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: preflightBody.phone,
        options: { channel: 'sms', shouldCreateUser: true },
      });
      if (otpError) throw otpError;
      setVerifiedPhone(preflightBody.phone);
      setNotice('A 6-digit passwordless sign-in code was sent by SMS.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to send a sign-in code.');
    } finally {
      setPending(false);
    }
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !/^\d{6}$/.test(code)) return;
    setPending(true);
    setError('');
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: verificationError } = await supabase.auth.verifyOtp({
        phone: verifiedPhone,
        token: code,
        type: 'sms',
      });
      if (verificationError) throw verificationError;
      const response = await fetch('/api/parent/session', { method: 'POST' });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Unable to open the parent portal.');
      await supabase.auth.signOut({ scope: 'local' });
      router.replace('/parent/dashboard');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to verify this code.');
    } finally {
      setPending(false);
    }
  }

  if (verifiedPhone) {
    return <form className="flex min-w-0 flex-col gap-3" onSubmit={verifyCode}><label className="text-xs font-bold text-slate-600">6-digit SMS code<input autoComplete="one-time-code" autoFocus className="mt-2 h-14 w-full rounded-xl border border-emerald-950/10 bg-white text-center text-2xl font-black tracking-[0.35em] outline-none focus:border-[#084B2B] focus:ring-4 focus:ring-emerald-100" inputMode="numeric" maxLength={6} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} value={code} /></label>{notice ? <p className="text-xs text-emerald-700">{notice}</p> : null}{error ? <p aria-live="assertive" className="text-xs font-bold text-red-700">{error}</p> : null}<button className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#084B2B] px-4 font-black text-white disabled:opacity-50" disabled={pending || code.length !== 6} type="submit">{pending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />} Verify and open dashboard</button><button className="text-xs font-bold text-slate-500" disabled={pending} onClick={() => { setVerifiedPhone(''); setCode(''); setError(''); }} type="button">Use a different number</button></form>;
  }

  return <form className="flex min-w-0 flex-col gap-3" onSubmit={sendCode}><label className="text-xs font-bold text-slate-600">Parent mobile number<PhoneInput className="mt-2" disabled={pending} onChange={setPhone} required value={phone} /></label><p className="flex items-start gap-2 rounded-xl border border-[#D4AF37]/40 bg-[#FBF6E2] p-3 text-xs leading-5 text-[#8C6B1B]"><KeyRound className="mt-0.5 size-4 shrink-0" /> Use the exact number saved in the student&apos;s onboarding profile.</p>{error ? <p aria-live="assertive" className="text-xs font-bold text-red-700">{error}</p> : null}<button className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#084B2B] px-4 font-black text-white disabled:opacity-50" disabled={pending || !phone} type="submit">{pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send passwordless code</button></form>;
}
