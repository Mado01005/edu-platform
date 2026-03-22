'use client';

import { useState, useEffect, useRef } from 'react';

interface PDFViewerProps {
  src: string;
  title: string;
}

export default function PDFViewer({ src, title }: PDFViewerProps) {
  const [fallback, setFallback] = useState(false);
  const activeSeconds = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (document.hasFocus()) {
        activeSeconds.current += 1;
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (activeSeconds.current > 10) {
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
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex-shrink-0 ml-4"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open in new tab
            </a>
          </div>
          <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-inner bg-black/50 h-[600px] md:h-[800px]">
            <iframe
              src={src}
              className="w-full h-full"
              title={title}
              id="lesson-pdf-viewer"
              onError={() => setFallback(true)}
            />
          </div>
        </>
      )}
    </div>
  );
}
