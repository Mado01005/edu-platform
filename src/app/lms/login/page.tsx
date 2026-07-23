'use client';

import { FormEvent, useState } from 'react';
import { GraduationCap, Loader2, LockKeyhole, Mail } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/ssr-client';

function safeNext(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//')
    ? value
    : '/dashboard';
}

export default function LmsLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(searchParams.get('error') ?? '');
  const [pending, setPending] = useState(false);

  async function signInWithPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setPending(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  async function signInWithGoogle() {
    setPending(true);
    setError('');
    const supabase = createSupabaseBrowserClient();
    const callback = new URL('/auth/callback', window.location.origin);
    callback.searchParams.set('next', next);

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callback.toString() },
    });

    if (signInError) {
      setError(signInError.message);
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center overflow-x-hidden bg-black px-4 text-white">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl shadow-violet-950/20 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-violet-500 text-black">
            <GraduationCap className="size-7" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Learning workspace</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Sign in with the account assigned by your school.
          </p>
        </div>

        <form className="flex min-w-0 flex-col gap-4" onSubmit={signInWithPassword}>
          <label className="flex min-w-0 flex-col gap-2 text-sm font-medium">
            Email
            <span className="flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-black px-3 focus-within:border-violet-400">
              <Mail className="size-4 shrink-0 text-zinc-500" aria-hidden="true" />
              <input
                className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </span>
          </label>

          <label className="flex min-w-0 flex-col gap-2 text-sm font-medium">
            Password
            <span className="flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-black px-3 focus-within:border-violet-400">
              <LockKeyhole className="size-4 shrink-0 text-zinc-500" aria-hidden="true" />
              <input
                className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </span>
          </label>

          {error ? (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          <button
            className="flex w-full min-w-0 items-center justify-center gap-2 rounded-xl bg-violet-400 px-4 py-3 text-sm font-black text-black transition hover:bg-violet-300 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={pending}
            type="submit"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Sign in
          </button>
        </form>

        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span className="h-px flex-1 bg-white/10" />
          or
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <button
          className="w-full min-w-0 rounded-xl border border-white/10 px-4 py-3 text-sm font-bold transition hover:bg-white/5 disabled:opacity-60"
          disabled={pending}
          onClick={signInWithGoogle}
          type="button"
        >
          Continue with Google
        </button>
      </div>
    </main>
  );
}
