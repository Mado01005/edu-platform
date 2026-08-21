'use client';

import { CheckCircle2, CircleAlert, X } from 'lucide-react';
import type { SettingsNotice } from '@/components/settings/types';

interface SettingsToastProps {
  notice: SettingsNotice | null;
  onDismiss: () => void;
}

export function SettingsToast({
  notice,
  onDismiss,
}: SettingsToastProps) {
  if (!notice) return null;

  const success = notice.type === 'success';

  return (
    <div
      className={`fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-start gap-3 rounded-2xl border p-4 shadow-sm ${
        success
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-red-200 bg-red-50 text-red-800'
      }`}
      role={success ? 'status' : 'alert'}
    >
      {success ? (
        <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      ) : (
        <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      )}
      <p className="min-w-0 flex-1 text-sm font-bold leading-6">
        {notice.message}
      </p>
      <button
        aria-label="Dismiss notification"
        className="rounded-lg p-1 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#084B2B]"
        onClick={onDismiss}
        type="button"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
