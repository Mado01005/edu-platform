'use client';

import { useState } from 'react';
import {
  KeyRound,
  Loader2,
  LockKeyhole,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '@/components/UI/badge';
import { Button } from '@/components/UI/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Input } from '@/components/UI/input';
import { errorNotice } from '@/components/settings/settings-client';
import { SettingsToast } from '@/components/settings/SettingsToast';
import type { SettingsNotice } from '@/components/settings/types';

interface SecuritySettingsFormProps {
  email: string;
  providers: string[];
}

function providerLabel(provider: string) {
  if (provider === 'google') return 'Signed in via Google OAuth';
  if (provider === 'email') return 'Email / Password';
  if (provider === 'phone') return 'Phone OTP';
  return `${provider[0]?.toUpperCase() ?? ''}${provider.slice(1)}`;
}

export function SecuritySettingsForm({
  email,
  providers,
}: SecuritySettingsFormProps) {
  const hasPasswordProvider = providers.includes('email');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<SettingsNotice | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    if (newPassword.length < 8) {
      setNotice({
        message: 'The new password must be at least 8 characters.',
        type: 'error',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setNotice({
        message: 'The new passwords do not match.',
        type: 'error',
      });
      return;
    }

    setPending(true);
    try {
      const response = await fetch('/api/settings/password', {
        body: JSON.stringify({
          confirmPassword,
          currentPassword,
          newPassword,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? 'Unable to update the password.');
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNotice({
        message: 'Password updated successfully.',
        type: 'success',
      });
    } catch (error) {
      setNotice(errorNotice(error, 'Unable to update the password.'));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="flex min-w-0 flex-col gap-4">
        <Card>
          <CardHeader>
            <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <CardTitle className="mt-2 text-xl">
              Security &amp; credentials
            </CardTitle>
            <p className="text-sm leading-6 text-zinc-400">
              Review connected sign-in methods and keep credentials current.
            </p>
          </CardHeader>
          <CardContent className="pb-5 pt-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                Active providers
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {providers.length ? (
                  providers.map((provider) => (
                    <Badge key={provider} variant="secondary">
                      {providerLabel(provider)}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline">Provider unavailable</Badge>
                )}
              </div>
              <p className="mt-3 break-all text-xs leading-5 text-zinc-500">
                Signed in as {email}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <span className="flex size-11 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-300">
              <KeyRound className="size-5" aria-hidden="true" />
            </span>
            <CardTitle className="mt-2 text-lg">Update password</CardTitle>
            <p className="text-sm leading-6 text-zinc-400">
              {hasPasswordProvider
                ? 'Confirm your current password before choosing a new one.'
                : 'This account currently signs in through an OAuth provider.'}
            </p>
          </CardHeader>
          <CardContent className="pb-5 pt-6">
            {hasPasswordProvider ? (
              <form
                className="flex min-w-0 flex-col gap-4"
                onSubmit={handleSubmit}
              >
                <label className="min-w-0 text-sm font-bold">
                  Current password
                  <Input
                    autoComplete="current-password"
                    className="mt-2"
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    required
                    type="password"
                    value={currentPassword}
                  />
                </label>
                <label className="min-w-0 text-sm font-bold">
                  New password
                  <Input
                    autoComplete="new-password"
                    className="mt-2"
                    minLength={8}
                    onChange={(event) => setNewPassword(event.target.value)}
                    required
                    type="password"
                    value={newPassword}
                  />
                </label>
                <label className="min-w-0 text-sm font-bold">
                  Confirm new password
                  <Input
                    autoComplete="new-password"
                    className="mt-2"
                    minLength={8}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    type="password"
                    value={confirmPassword}
                  />
                </label>
                <Button
                  className="w-full sm:w-fit"
                  disabled={pending}
                  type="submit"
                >
                  {pending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  {pending ? 'Updating…' : 'Update password'}
                </Button>
              </form>
            ) : (
              <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-4 text-sm text-cyan-100">
                <LockKeyhole className="mt-0.5 size-5 shrink-0" />
                Continue using your connected OAuth provider to manage this
                account securely.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <SettingsToast notice={notice} onDismiss={() => setNotice(null)} />
    </>
  );
}
