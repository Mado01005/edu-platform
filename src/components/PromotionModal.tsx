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
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md"></div>
      
      <div className="relative w-full max-w-2xl bg-[#05050A]/90 backdrop-blur-3xl border border-indigo-500/30 rounded-3xl p-8 sm:p-12 shadow-[0_0_100px_rgba(99,102,241,0.2)] overflow-hidden scale-in">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-600 via-purple-500 to-indigo-600"></div>
        <div className="absolute -top-[150px] -right-[150px] w-[300px] h-[300px] bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 text-center">
          <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-5xl sm:text-6xl shadow-[0_0_50px_rgba(99,102,241,0.5)] mb-8 border-4 border-white/10 animate-pulse">
            🎓
          </div>
          
          <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 tracking-tight mb-4">
            Welcome to the Faculty!
          </h2>
          
          <p className="text-gray-300 text-base sm:text-lg leading-relaxed mb-4 font-medium">
            Congratulations, <span className="text-indigo-400">{userEmail}</span>! You have been officially promoted to an <strong className="text-white">Instructor</strong>.
          </p>
          
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left mb-10 shadow-inner">
            <p className="text-sm text-gray-400 mb-3 uppercase tracking-widest font-bold">New Security Clearances Granted:</p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-green-400 text-lg mt-0.5">✓</span>
                <span className="text-gray-300 text-sm">Upload new HD videos, encrypted PDFs, and visual telemetry to any subject module.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 text-lg mt-0.5">✓</span>
                <span className="text-gray-300 text-sm">Create brand new academic Subjects and instantly distribute global tracking links.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 text-lg mt-0.5">✓</span>
                <span className="text-gray-300 text-sm">Broadcast Emergency Override notifications directly to all active student dashboards.</span>
              </li>
            </ul>
          </div>

          <button
            onClick={handleAcknowledge}
            disabled={loading}
            className="w-full sm:w-auto bg-indigo-500 hover:bg-indigo-600 text-white font-black uppercase tracking-widest px-10 py-4 rounded-xl shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all duration-300 hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-3 mx-auto"
          >
            {loading ? 'Authenticating...' : 'Enter Command Center'}
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
