'use client';

import { useState, useEffect } from 'react';

interface StudentWelcomeModalProps {
  open: boolean;
  userEmail: string;
  userName: string;
}

export default function StudentWelcomeModal({ open, userEmail, userName }: StudentWelcomeModalProps) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      // Dramatically fade in after the Dashboard loads behind it
      const timer = setTimeout(() => setShow(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!show) return null;

  async function handleAcknowledge() {
    setLoading(true);
    try {
      // Record completion and trigger the Auto-Admin Webhook
      await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'Completed Student Onboarding' })
      });
      setShow(false);
      window.location.reload(); // Refresh the DOM to unlock standard dashboard interactions
    } catch (err) {
      console.error(err);
      setShow(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 fade-in">
      {/* Deep Space Blur Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl"></div>
      
      {/* Main Holographic Container */}
      <div className="relative w-full max-w-3xl bg-[#05050A]/90 backdrop-blur-3xl border border-blue-500/30 rounded-[2rem] p-8 sm:p-12 shadow-[0_0_100px_rgba(59,130,246,0.15)] overflow-hidden scale-in">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600"></div>
        <div className="absolute -bottom-[200px] -left-[200px] w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="text-center mb-10">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.4)] mb-6 border border-white/20 animate-pulse">
              <svg className="w-10 h-10 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 tracking-tight mb-3">
              Welcome to EduPortal, {userName.split(' ')[0]}!
            </h2>
            <p className="text-gray-400 text-lg font-medium">Your account <strong className="text-blue-300">{userEmail}</strong> has been successfully registered.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
             {/* Feature 1 */}
             <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors shadow-inner flex flex-col items-center text-center">
               <span className="text-3xl mb-3">📚</span>
               <h4 className="text-white font-bold mb-2">Explore Modules</h4>
               <p className="text-sm text-gray-400">Click any course on your dashboard to instantly access HD videos and native reading assets.</p>
             </div>
             
             {/* Feature 2 */}
             <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors shadow-inner flex flex-col items-center text-center">
               <span className="text-3xl mb-3">📈</span>
               <h4 className="text-white font-bold mb-2">Track Progress</h4>
               <p className="text-sm text-gray-400">Mark lessons as completed to permanently boost your global completion percentage bars.</p>
             </div>

             {/* Feature 3 */}
             <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors shadow-inner flex flex-col items-center text-center">
               <span className="text-3xl mb-3">💬</span>
               <h4 className="text-white font-bold mb-2">Secure Inbox</h4>
               <p className="text-sm text-gray-400">Use the Support system at the bottom to dispatch encrypted native messages to your Instructors.</p>
             </div>
          </div>

          <div className="flex justify-center mt-8">
            <button
              onClick={handleAcknowledge}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest px-12 py-4 rounded-xl shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all duration-300 hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-3 w-full sm:w-auto"
            >
              {loading ? 'Initializing Core...' : 'Initialize Dashboard'}
              {!loading && (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
