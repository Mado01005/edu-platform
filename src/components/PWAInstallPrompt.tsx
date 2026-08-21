'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function PWAInstallPrompt() {
  const pathname = usePathname();
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if the app is already installed physically on the phone
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as any).standalone) || document.referrer.includes('android-app://');
    const wasDismissed =
      localStorage.getItem('pwa_prompt_dismissed') === 'true';
    const initialize = window.setTimeout(() => {
      setIsStandalone(isStandaloneMode);
      setDismissed(wasDismissed);
    }, 0);

    // If it's already an app, or user manually dismissed it, hide forever
    if (isStandaloneMode || wasDismissed) {
      return () => window.clearTimeout(initialize);
    }

    // Detect Apple iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const setPlatform = window.setTimeout(() => setIsIOS(isIosDevice), 0);

    if (isIosDevice) {
       // iOS doesn't support automatic prompts, so we just show the HTML guide banner after 3 seconds
       const timer = window.setTimeout(() => setShowPrompt(true), 3000);
       return () => {
         window.clearTimeout(initialize);
         window.clearTimeout(setPlatform);
         window.clearTimeout(timer);
       };
    }

    // Detect Android / Chrome 'beforeinstallprompt' event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.clearTimeout(initialize);
      window.clearTimeout(setPlatform);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  if (
    pathname === '/lms/login' ||
    isStandalone ||
    dismissed ||
    !showPrompt
  ) return null;

  const handleDismiss = () => {
    setDismissed(true);
    setShowPrompt(false);
    localStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the native Android install prompt
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDismissed(true);
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-[100] sm:hidden pb-safe">
      <div className="bg-[#1A1A1E]/95 backdrop-blur-xl border-t border-emerald-500/30 p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] transform translate-y-0 transition-transform flex flex-col gap-3">
        <button aria-label="Dismiss install prompt" onClick={handleDismiss} className="absolute top-2 right-2 text-gray-400 hover:text-white p-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        <div className="flex items-center gap-4 pr-6">
          <div className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-white/20">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <div>
            <h4 className="text-white font-bold text-sm tracking-tight">Install Oqool Academy</h4>
            <p className="text-xs text-gray-400 leading-tight mt-0.5">Get lightning-fast offline loading and full-screen lectures.</p>
          </div>
        </div>

        {isIOS ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-xs text-emerald-200 mt-2 flex items-center gap-3">
             <span className="text-lg">⬇️</span>
             <p>To install, tap the <strong>Share</strong> button at the bottom of Safari, then scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo; <span className="font-sans font-black">+</span> </strong>.</p>
          </div>
        ) : (
          <button 
            onClick={handleInstallClick}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm py-3 rounded-xl shadow-lg mt-2 transition"
          >
            Install Automatically
          </button>
        )}
      </div>
    </div>
  );
}
