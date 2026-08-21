'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import ChatTutor from './ChatTutor';

export default function FloatingTutor() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  const handleToggle = () => {
    if (!isOpen && !hasOpened) {
      setHasOpened(true); // Mount the component on first open
    }
    setIsOpen(prev => !prev);
  };

  if (pathname === '/lms/login') return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start gap-4">
      {/* The Chat Window — mounted once, hidden via CSS to preserve state */}
      {hasOpened && (
        <div
          className={`transform-gpu w-[350px] sm:w-[400px] transition-all duration-300 ${
            isOpen
              ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 scale-95 translate-y-4 pointer-events-none absolute bottom-16'
          }`}
        >
          <ChatTutor />
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={handleToggle}
        className="w-14 h-14 bg-emerald-600 hover:bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(8,75,43,0.6)] text-white transition-all transform hover:scale-105 active:scale-95"
        aria-label="Toggle AI Tutor"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>
    </div>
  );
}
