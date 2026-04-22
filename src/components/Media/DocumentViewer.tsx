import { useState, useCallback, useEffect, useRef } from 'react';

interface DocumentViewerProps {
  fileUrl: string;
  title: string;
}

export default function DocumentViewer({ fileUrl, title }: DocumentViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const getPublicUrl = (signedUrl: string) => {
    try {
      const url = new URL(signedUrl);
      const publicBase = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'https://pub-7bcb18f4378c4e489916424048e040ec.r2.dev';
      
      const pathKey = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
      const decodedKey = decodeURIComponent(pathKey);
      
     
      const safeFileKey = decodedKey.split('/').map(segment => encodeURIComponent(segment)).join('/');
      
      
      const base = publicBase.endsWith('/') ? publicBase.slice(0, -1) : publicBase;
      return `${base}/${safeFileKey}`;
    } catch (e) {
      return signedUrl; 
    }
  };

  const cleanUrl = getPublicUrl(fileUrl);

  const microsoftViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(cleanUrl)}`;

  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError(true);
        console.warn('Document viewer connection timed out. Falling back to secure download.');
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [loading]);

  const handleLoad = useCallback(() => {
    setLoading(false);
    setError(false); // Reset error if it actually loads later
  }, []);

  const handleError = useCallback(() => {
    setLoading(false);
    setError(true);
  }, []);

  console.log("🔥 [DIAGNOSTIC] Raw R2 Public Link:", cleanUrl);

  return (
    <div className="relative w-full min-h-[75vh] bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_20px_50px_-15px_rgba(0,0,0,1)] group">
      {/* Midnight Glass Decor */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent z-10" />
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/5 blur-[80px] pointer-events-none rounded-full" />
      
      {/* Loading spinner overlay */}
      {loading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-[#05050A]/90 backdrop-blur-md">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-2 border-white/5" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500 animate-[spin_0.8s_linear_infinite]" />
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-2">
              Syncing Presentation Flow
            </p>
            <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest opacity-60">
              Retrieving from R2 Storage Node
            </p>
          </div>
        </div>
      )}

      {/* Error fallback UI (Midnight Glass Style) */}
      {error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 bg-[#05050A]/95 backdrop-blur-2xl">
          <div className="w-20 h-20 rounded-3xl bg-orange-500/5 border border-orange-500/10 flex items-center justify-center mb-8 relative group/err">
             <div className="absolute inset-0 bg-orange-500/10 blur-xl opacity-0 group-hover/err:opacity-100 transition-opacity" />
             <span className="text-3xl relative z-10 opacity-80">🔭</span>
          </div>
          <div className="max-w-md text-center space-y-4 mb-10">
            <h3 className="text-xl font-black text-white tracking-tight uppercase">Viewer Connection Rejection</h3>
            <p className="text-sm font-medium text-gray-400 leading-relaxed">
              Cloudflare R2 security policies prevented the external viewer from accessing this presentation. Please use the secure direct link below.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10 w-full justify-center">
            <a
              href={fileUrl} // Preserved fully secure URL for downloads
              download
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-3 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-xs font-black uppercase tracking-[0.2em] text-indigo-400 transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(99,102,241,0.15)]"
            >
              Download Secure File
            </a>
            <button
              onClick={() => window.location.reload()}
              className="w-full sm:w-auto px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black uppercase tracking-[0.2em] text-gray-400 transition-all"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* Universal Google Viewer iframe */}
      {!error && (
        <iframe
          ref={iframeRef}
          src={microsoftViewerUrl}
          className={`w-full h-full min-h-[75vh] bg-transparent transition-all duration-1000 ${loading ? 'opacity-0 scale-95 blur-xl' : 'opacity-100 scale-100 blur-0'}`}
          title={title}
          onLoad={handleLoad}
          onError={handleError}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          loading="lazy"
        />
      )}
    </div>
  );
}
