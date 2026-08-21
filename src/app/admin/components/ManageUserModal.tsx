'use client';

import { useState } from 'react';
import { UserRole } from '@/types';

interface ManageUserModalProps {
  user: UserRole;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ManageUserModal({ user, onClose, onUpdate }: ManageUserModalProps) {
  const [streak, setStreak] = useState(user.streak_count.toString());
  const [notes, setNotes] = useState(user.internal_notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleAction = async (action: string, value?: string) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/users/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetEmail: user.email, action, value }),
      });
      if (res.ok) {
        setMessage('Changes saved.');
        onUpdate();
        if (action !== 'UPDATE_NOTES' && action !== 'UPDATE_STREAK') {
           setTimeout(onClose, 1000);
        }
      } else {
        const data = await res.json();
        setMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setMessage('Network error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div
        aria-labelledby="manage-user-title"
        aria-modal="true"
        className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-emerald-950/10 bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex min-w-0 items-center justify-between gap-4 border-b border-emerald-950/10 px-5 py-4 sm:px-7">
          <div className="min-w-0">
            <h3
              className="truncate text-xl font-bold text-slate-900"
              id="manage-user-title"
            >
              Manage User Account
            </h3>
            <p className="mt-1 truncate text-sm text-slate-500">
              {user.email.split('@')[0] || 'User account'}
            </p>
          </div>
          <button
            aria-label="Close user account settings"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-emerald-950/10 text-slate-500 transition hover:bg-[#F8FAF7] hover:text-slate-900"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6 p-5 sm:p-7">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700" htmlFor="activity-streak">
              Activity Streak
            </label>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
              <input
                className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-900 outline-none focus:border-[#084B2B] focus:ring-2 focus:ring-emerald-100"
                id="activity-streak"
                min="0"
                onChange={(event) => setStreak(event.target.value)}
                type="number"
                value={streak}
              />
              <button
                className="rounded-xl bg-[#084B2B] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#063B22] disabled:opacity-50"
                disabled={isSaving}
                onClick={() => handleAction('UPDATE_STREAK', streak)}
                type="button"
              >
                Save Streak
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700" htmlFor="admin-notes">
              Private Admin Notes
            </label>
            <textarea
              className="min-h-32 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#084B2B] focus:ring-2 focus:ring-emerald-100"
              id="admin-notes"
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add notes for other administrators."
              value={notes}
            />
            <button
              className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-[#084B2B] transition hover:bg-emerald-100 disabled:opacity-50"
              disabled={isSaving}
              onClick={() => handleAction('UPDATE_NOTES', notes)}
              type="button"
            >
              Save Notes
            </button>
          </div>

          <div className="space-y-2 rounded-2xl border border-emerald-950/10 bg-[#F8FAF7] p-4">
            <p className="text-sm font-bold text-slate-900">Password Reset</p>
            <button
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-400"
              disabled
              type="button"
            >
              Send Password Reset Email
            </button>
            <p className="text-xs leading-5 text-slate-500">
              Email delivery must be configured before password reset messages
              can be sent.
            </p>
          </div>

          {message ? (
            <p aria-live="polite" className="text-center text-sm font-bold text-[#084B2B]">
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
