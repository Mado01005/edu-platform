'use client';

import { useState, useCallback } from 'react';

interface DocumentViewerProps {
  fileUrl: string;
  title: string;
}

export default function DocumentViewer({ fileUrl, title }: DocumentViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const embedUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;

  const handleLoad = useCallback(() => {
    setLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setLoading(false);
    setError(true);
  }, []);

  return (
    <div className="relative w-full min-h-[70vh] bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl overflow-hidden shadow-[0_15px_40px_-10px_rgba(0,0,0,0.5)] group">
      {/* Loading spinner overlay */}
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-slate-900/90">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-slate-700/50" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-orange-500 animate-spin" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
            Loading Document
          </p>
        </div>
      )}

      {/* Error fallback */}
      {error && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-slate-900/90">
          <span className="text-4xl">⚠️</span>
          <p className="text-sm font-bold text-slate-400">Unable to load document</p>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-black uppercase tracking-widest text-orange-400 hover:text-orange-300 underline underline-offset-4 transition-colors"
          >
            Download Instead →
          </a>
        </div>
      )}

      {/* Office Web Viewer iframe */}
      <iframe
        src={embedUrl}
        className="w-full h-full min-h-[70vh] bg-white rounded-xl"
        title={title}
        onLoad={handleLoad}
        onError={handleError}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        loading="lazy"
      />
    </div>
  );
}
