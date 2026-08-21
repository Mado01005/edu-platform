'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface StudentWelcomeModalProps {
  open: boolean;
  userEmail: string;
  userName: string;
}

export default function StudentWelcomeModal({ open, userEmail, userName }: StudentWelcomeModalProps) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
        // 1. Instant Client State Update
        localStorage.setItem(`onb_v2_${emailKey}`, 'true');
        document.cookie = `onb_v2_${emailKey}=true; path=/; max-age=31536000`; // 1 year
        setShow(false);
        
        // 2. Silent Server Side Update (Busts Dashboard cache without reload)
        router.refresh();
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to initialize.');
      }
    } catch (err) {
      console.error('Onboarding Error (Silent):', err);
      // Fallback: even if it fails, we want them to get in, so just close
      localStorage.setItem(`onb_v2_${emailKey}`, 'true');
      setShow(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 fade-in">
      {/* Deep Space Blur Backdrop */}
      <div className="absolute inset-0 bg-slate-950/40"></div>
      
      {/* Main Holographic Container */}
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-emerald-950/10 bg-white p-6 shadow-xl custom-scrollbar scale-in sm:p-12">
        <div className="absolute inset-x-0 top-0 z-20 h-1 bg-[#084B2B]"></div>

        <div className="relative z-10">
          <div className="text-center mb-6 sm:mb-10">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-200 bg-[#084B2B] sm:mb-6 sm:h-20 sm:w-20">
              <svg className="w-10 h-10 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            
            <h2 className="mb-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Welcome to Oqool Academy, {userName.split(' ')[0]}!
            </h2>
            <p className="text-lg font-medium text-slate-600">Your account <strong className="text-[#084B2B]">{userEmail}</strong> has been successfully registered.</p>
          </div>
          
          <div className="flex flex-col sm:grid sm:grid-cols-3 gap-3 mb-8">
             {/* Feature 1 */}
             <div className="flex flex-row items-center gap-4 rounded-xl border border-emerald-950/10 bg-[#F8FAF7] p-3 text-left transition-colors hover:border-emerald-200 hover:bg-emerald-50 sm:flex-col sm:gap-2 sm:p-5 sm:text-center">
               <span className="text-2xl sm:text-3xl shrink-0">📚</span>
               <div>
                 <h4 className="text-sm font-semibold text-slate-900 sm:mb-1 sm:text-base">Explore Modules</h4>
                 <p className="text-xs leading-tight text-slate-500">Click any course to instantly access videos and PDFs.</p>
               </div>
             </div>
             
             {/* Feature 2 */}
             <div className="flex flex-row items-center gap-4 rounded-xl border border-emerald-950/10 bg-[#F8FAF7] p-3 text-left transition-colors hover:border-emerald-200 hover:bg-emerald-50 sm:flex-col sm:gap-2 sm:p-5 sm:text-center">
               <span className="text-2xl sm:text-3xl shrink-0">📈</span>
               <div>
                 <h4 className="text-sm font-semibold text-slate-900 sm:mb-1 sm:text-base">Track Progress</h4>
                 <p className="text-xs leading-tight text-slate-500">Mark lessons completed to boost your global bars.</p>
               </div>
             </div>

             {/* Feature 3 */}
             <div className="flex flex-row items-center gap-4 rounded-xl border border-emerald-950/10 bg-[#F8FAF7] p-3 text-left transition-colors hover:border-emerald-200 hover:bg-emerald-50 sm:flex-col sm:gap-2 sm:p-5 sm:text-center">
               <span className="text-2xl sm:text-3xl shrink-0">💬</span>
               <div>
                 <h4 className="text-sm font-semibold text-slate-900 sm:mb-1 sm:text-base">Secure Inbox</h4>
                 <p className="text-xs leading-tight text-slate-500">Send encrypted native messages to your Instructors.</p>
               </div>
             </div>
          </div>

          <div className="flex justify-center mt-4 sm:mt-8">
            <button
              onClick={handleAcknowledge}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#084B2B] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#063B22] disabled:opacity-50 sm:w-auto sm:px-12 sm:py-4 sm:text-base"
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
