'use client';

import { useState, useEffect } from 'react';

interface PromotionModalProps {
  open: boolean;
  userEmail: string;
}

export default function PromotionModal({ open, userEmail }: PromotionModalProps) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      // Small delay for dramatic effect after dashboard load
      const timer = setTimeout(() => setShow(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!show) return null;

  async function handleAcknowledge() {
    setLoading(true);
    try {
      // Permanently record that they've seen this modal
      await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'Viewed Promotion Modal', details: { email: userEmail } })
      });
      setShow(false);
      // Redirect to the Admin Panel immediately
      window.location.href = '/admin';
    } catch (err) {
      console.error(err);
      setShow(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 fade-in">
      <div className="absolute inset-0 bg-slate-950/40"></div>
      
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl custom-scrollbar scale-in sm:p-12">
        <div className="absolute inset-x-0 top-0 z-20 h-1 bg-sky-600"></div>

        <div className="relative z-10 text-center">
          <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full border-4 border-sky-100 bg-sky-600 text-5xl sm:h-28 sm:w-28 sm:text-6xl">
            🎓
          </div>
          
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Welcome to the Faculty!
          </h2>
          
          <p className="mb-4 text-base font-medium leading-relaxed text-slate-600 sm:text-lg">
            Congratulations, <span className="text-sky-700">{userEmail}</span>! You have been officially promoted to an <strong className="text-slate-900">Instructor</strong>.
          </p>
          
          <div className="mb-10 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-left">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-600">New capabilities granted:</p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-green-400 text-lg mt-0.5">✓</span>
                <span className="text-sm text-slate-600">Upload videos, PDFs, and learning resources to course modules.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 text-lg mt-0.5">✓</span>
                <span className="text-sm text-slate-600">Create subjects, courses, modules, and lessons.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 text-lg mt-0.5">✓</span>
                <span className="text-sm text-slate-600">Publish announcements to student dashboards.</span>
              </li>
            </ul>
          </div>

          <button
            onClick={handleAcknowledge}
            disabled={loading}
            className="mx-auto flex w-full items-center justify-center gap-3 rounded-xl bg-sky-600 px-10 py-4 font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50 sm:w-auto"
          >
            {loading ? 'Opening dashboard…' : 'Open Admin Dashboard'}
            {!loading && (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
