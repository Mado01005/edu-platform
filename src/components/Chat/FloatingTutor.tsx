'use client';

import { useState } from 'react';
import ChatTutor from './ChatTutor';

export default function FloatingTutor() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start gap-4">
      {/* The Chat Window */}
      {isOpen && (
        <div className="animate-in slide-in-from-bottom-4 duration-300 transform-gpu w-[350px] sm:w-[400px]">
          <ChatTutor />
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-indigo-600 hover:bg-indigo-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.6)] text-white transition-all transform hover:scale-105 active:scale-95"
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
