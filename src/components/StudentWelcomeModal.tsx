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
    // Check if we've already acknowledged to break any loops
    const checkOnboarding = () => {
      if (typeof window === 'undefined') return false;
      const ls = localStorage.getItem(`onb_v2_${userEmail.toLowerCase()}`);
      const ck = document.cookie.includes(`onb_v2_${userEmail.toLowerCase()}`);
      return ls || ck;
    };

    if (checkOnboarding()) {
      setShow(false);
      return;
    }

    if (open) {
      // Dramatically fade in after the Dashboard loads behind it
      const timer = setTimeout(() => {
        // Double check again before showing
        if (!checkOnboarding()) setShow(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [open, userEmail]);

  if (!show) return null;

  async function handleAcknowledge() {
    setLoading(true);
    const emailKey = userEmail.toLowerCase();
    try {
      const res = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'Completed Student Onboarding' })
      });

      if (res.ok) {
        localStorage.setItem(`onb_v2_${emailKey}`, 'true');
        document.cookie = `onb_v2_${emailKey}=true; path=/; max-age=31536000`; // 1 year
        setShow(false);
        // Clean URL and bust cache
        window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now();
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to initialize.');
      }
    } catch (err) {
      console.error('Onboarding Error:', err);
      // Fallback: even if it fails, we want them to get in, so maybe just close after alert
      alert('Initialization signal sent. If the dashboard doesn\'t load, please refresh.');
      setShow(false);
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 fade-in">
      {/* Deep Space Blur Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl"></div>
      
      {/* Main Holographic Container */}
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#05050A]/90 backdrop-blur-3xl border border-blue-500/30 rounded-[2rem] p-6 sm:p-12 shadow-[0_0_100px_rgba(59,130,246,0.15)] overflow-y-auto custom-scrollbar scale-in">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 sticky top-0 z-20"></div>
        <div className="absolute -bottom-[200px] -left-[200px] w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="text-center mb-6 sm:mb-10">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.4)] mb-4 sm:mb-6 border border-white/20 animate-pulse">
              <svg className="w-10 h-10 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 tracking-tight mb-3">
              Welcome to EduPortal, {userName.split(' ')[0]}!
            </h2>
            <p className="text-gray-400 text-lg font-medium">Your account <strong className="text-blue-300">{userEmail}</strong> has been successfully registered.</p>
          </div>
          
          <div className="flex flex-col sm:grid sm:grid-cols-3 gap-3 mb-8">
             {/* Feature 1 */}
             <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-5 hover:bg-white/10 transition-colors shadow-inner flex flex-row sm:flex-col items-center sm:text-center text-left gap-4 sm:gap-2">
               <span className="text-2xl sm:text-3xl shrink-0">📚</span>
               <div>
                 <h4 className="text-white font-bold text-sm sm:text-base sm:mb-1">Explore Modules</h4>
                 <p className="text-xs text-gray-400 leading-tight">Click any course to instantly access videos and PDFs.</p>
               </div>
             </div>
             
             {/* Feature 2 */}
             <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-5 hover:bg-white/10 transition-colors shadow-inner flex flex-row sm:flex-col items-center sm:text-center text-left gap-4 sm:gap-2">
               <span className="text-2xl sm:text-3xl shrink-0">📈</span>
               <div>
                 <h4 className="text-white font-bold text-sm sm:text-base sm:mb-1">Track Progress</h4>
                 <p className="text-xs text-gray-400 leading-tight">Mark lessons completed to boost your global bars.</p>
               </div>
             </div>

             {/* Feature 3 */}
             <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-5 hover:bg-white/10 transition-colors shadow-inner flex flex-row sm:flex-col items-center sm:text-center text-left gap-4 sm:gap-2">
               <span className="text-2xl sm:text-3xl shrink-0">💬</span>
               <div>
                 <h4 className="text-white font-bold text-sm sm:text-base sm:mb-1">Secure Inbox</h4>
                 <p className="text-xs text-gray-400 leading-tight">Send encrypted native messages to your Instructors.</p>
               </div>
             </div>
          </div>

          <div className="flex justify-center mt-4 sm:mt-8">
            <button
              onClick={handleAcknowledge}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest px-6 py-3 sm:px-12 sm:py-4 rounded-xl shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all duration-300 hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-3 w-full sm:w-auto text-sm sm:text-base"
            >
              {loading ? 'Initializing...' : 'Initialize Dashboard'}
              {!loading && (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
