'use client';

import { useState, useEffect, useRef } from 'react';

interface PDFViewerProps {
  src: string;
  title: string;
}

export default function PDFViewer({ src, title }: PDFViewerProps) {
  const [fallback, setFallback] = useState(false);
  const [darkPdf, setDarkPdf] = useState(false);
  const activeSeconds = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Start active timer
    intervalRef.current = setInterval(() => {
      if (document.hasFocus()) { // Only count if they are actually looking at the tab
        activeSeconds.current += 1;
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (activeSeconds.current > 10) { // Only log if they read for > 10 seconds
        fetch('/api/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'READ_PDF', 
            details: { 
              pdf_title: title, 
              active_seconds: activeSeconds.current,
              active_minutes: (activeSeconds.current / 60).toFixed(1)
            } 
          })
        }).catch(() => {});
      }
    };
  }, [title]);

  return (
    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 md:p-6 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.5)] relative overflow-hidden group">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      {fallback ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-4">
          <svg className="w-16 h-16 text-red-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <p className="text-sm">PDF preview not available in this browser.</p>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 px-5 py-2.5 rounded-xl text-sm font-medium transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Open PDF
          </a>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400 truncate">{title}.pdf</span>
            <div className="flex items-center gap-3 shrink-0 ml-4">
              <button
                onClick={() => setDarkPdf(!darkPdf)}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all duration-300 border ${
                  darkPdf
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.3)]'
                    : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                {darkPdf ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                )}
                {darkPdf ? 'Dark Mode' : 'Light Mode'}
              </button>
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open
              </a>
            </div>
          </div>
          <div className={`relative rounded-2xl overflow-hidden border shadow-inner h-[600px] md:h-[800px] transition-all duration-500 ${darkPdf ? 'border-indigo-500/30 ring-1 ring-indigo-500/20 bg-[#1a1a2e]' : 'border-white/10 bg-black/50'}`}>
            <iframe
              src={src}
              className="w-full h-full"
              title={title}
              id="lesson-pdf-viewer"
              onError={() => setFallback(true)}
              style={darkPdf ? { filter: 'invert(0.88) contrast(0.95) hue-rotate(180deg) saturate(1.5) brightness(1.1)' } : {}}
            />
          </div>
        </>
      )}
    </div>
  );
}
