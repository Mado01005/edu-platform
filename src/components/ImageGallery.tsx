'use client';

import { useState, useEffect } from 'react';

interface ImageGalleryProps {
  images: string[];
  title: string;
}

// Detect RAW/unsupported camera formats that browsers cannot render natively.
// Covers: Adobe DNG, Apple HEIC/HEIF, Canon CR2/CR3, Nikon NEF/NRW, Sony ARW/SRF,
// Olympus ORF, Pentax PEF, Fuji RAF, Panasonic RW2, Phase One IIQ, Hasselblad 3FR, etc.
const isUnsupportedFormat = (src: string): boolean => {
  return /\.(dng|heic|heif|cr2|cr3|nef|nrw|arw|srf|sr2|orf|pef|raf|rw2|iiq|3fr|dcr|kdc|erf|mef|mos|raw|rwl|srw)(\?.*)?$/i.test(src.trim());
};

export default function ImageGallery({ images, title }: ImageGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

  // Separate images into renderable and unsupported
  const renderableImages = images.filter(src => !isUnsupportedFormat(src));
  const unsupportedImages = images.filter(src => isUnsupportedFormat(src));

  // Log diagnostic info on mount (only in dev or for debugging)
  useEffect(() => {
    if (unsupportedImages.length > 0) {
      console.warn(
        `[GALLERY] ${unsupportedImages.length} unsupported format(s) detected — ` +
        `these cannot be displayed in a browser (DNG/HEIC/RAW). ` +
        `Re-upload as JPEG/PNG/WebP for web compatibility.`
      );
    }
    if (renderableImages.length === 0 && images.length > 0) {
      console.warn(
        `[GALLERY] All ${images.length} images are in unsupported RAW formats. ` +
        `No images can be displayed. Please re-upload as JPEG/PNG/WebP.`
      );
    }
  }, [images.length]);

  const getFullUrl = (path: string) => {
    if (!path) return '';
    // Already a full URL (R2, Supabase, etc.) → use as-is
    if (path.startsWith('http')) return path;
    
    // Relative path → construct Supabase Storage public URL
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') || 'https://placeholder.supabase.co';
    const bucketName = 'edu-content';
    
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const isAlreadyEncoded = /%[0-9A-Fa-f]{2}/.test(cleanPath);
    const encodedPath = isAlreadyEncoded ? cleanPath : encodeURI(cleanPath);
    
    return `${baseUrl}/storage/v1/object/public/${bucketName}/${encodedPath}`;
  };

  const openLightbox = (i: number) => setLightboxIndex(i);
  const closeLightbox = () => setLightboxIndex(null);
  const prev = () => setLightboxIndex((i) => (i !== null ? (i - 1 + renderableImages.length) % renderableImages.length : 0));
  const next = () => setLightboxIndex((i) => (i !== null ? (i + 1) % renderableImages.length : 0));

  // Extract filename from a path or URL
  const getFileName = (src: string) => {
    try {
      const parts = src.split('/');
      return decodeURIComponent(parts[parts.length - 1]);
    } catch {
      return src;
    }
  };

  const handleImageError = (src: string, e: React.SyntheticEvent<HTMLImageElement>) => {
    const fullUrl = getFullUrl(src);
    console.warn(`[GALLERY] Broken Image Link Detected in Database:\n  ${src}\n  Full attempted URL: ${fullUrl}`);
    setBrokenImages(prev => new Set(prev).add(src));
    const target = e.currentTarget;
    target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none'%3E%3Crect width='100' height='100' fill='%230a0a1a'/%3E%3Cpath d='M30 65l15-15a5 5 0 017 0l18 18' stroke='%23334155' stroke-width='2' stroke-linecap='round'/%3E%3Cpath d='M55 55l5-5a5 5 0 017 0l8 8' stroke='%23334155' stroke-width='2' stroke-linecap='round'/%3E%3Ccircle cx='40' cy='40' r='5' stroke='%23334155' stroke-width='2'/%3E%3C/svg%3E";
    target.style.objectFit = "cover";
  };

  // Show a summary banner when ALL images are unsupported or broken
  const allBroken = renderableImages.length === 0 && unsupportedImages.length > 0;

  return (
    <>
      {/* Banner when all images are unsupported */}
      {allBroken && (
        <div className="mb-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-amber-400">All {unsupportedImages.length} images are RAW camera files</p>
            <p className="text-xs text-gray-400 mt-1">
              Formats like DNG, HEIC, and other RAW files cannot be displayed in web browsers. 
              Re-upload these as JPEG, PNG, or WebP for web compatibility.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Renderable images */}
        {renderableImages.map((src, i) => (
          <button
            key={src}
            id={`gallery-image-${i}`}
            onClick={() => openLightbox(i)}
            className="relative w-full h-48 rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-indigo-500/50 hover:shadow-[0_10px_30px_rgba(99,102,241,0.2)] hover:-translate-y-1.5 transition-all duration-500 group cursor-pointer"
            aria-label={`View image ${i + 1} of ${title}`}
          >
            <img
              src={getFullUrl(src)}
              alt={`${title} — image ${i + 1}`}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={(e) => handleImageError(src, e)}
            />
            {/* Filename overlay on broken images */}
            {brokenImages.has(src) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-red-400/70 mb-1">Image Not Found</p>
                <p className="text-[8px] font-mono text-gray-500 truncate max-w-full text-center" title={getFileName(src)}>
                  {getFileName(src).length > 30 ? getFileName(src).slice(0, 30) + '…' : getFileName(src)}
                </p>
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </div>
          </button>
        ))}

        {/* Unsupported format tiles */}
        {unsupportedImages.map((src, i) => (
          <div
            key={`unsupported-${i}`}
            className="relative w-full h-48 rounded-2xl overflow-hidden bg-gradient-to-br from-amber-950/30 to-red-950/20 border border-amber-500/20 flex flex-col items-center justify-center gap-2 p-4"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-500/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-[9px] font-black uppercase tracking-widest text-amber-500/70 text-center">
              Unsupported Format
            </p>
            <p className="text-[8px] font-mono text-amber-500/40 truncate max-w-full text-center" title={getFileName(src)}>
              {getFileName(src).length > 25 ? getFileName(src).slice(0, 25) + '…' : getFileName(src)}
            </p>
            <p className="text-[8px] text-gray-600 uppercase tracking-wider">
              Requires Re-upload as JPEG/PNG
            </p>
          </div>
        ))}
      </div>

      {/* Lightbox — only for renderable images */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={closeLightbox}
          id="image-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition z-10"
            onClick={closeLightbox}
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Prev */}
          {renderableImages.length > 1 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-3 rounded-xl hover:bg-white/10 transition z-10"
              onClick={(e) => { e.stopPropagation(); prev(); }}
              aria-label="Previous image"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Image */}
          <div
            className="relative max-w-4xl max-h-[80vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={getFullUrl(renderableImages[lightboxIndex])}
              alt={`${title} — image ${lightboxIndex + 1}`}
              className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
              onError={(e) => {
                const target = e.currentTarget;
                target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none'%3E%3Crect width='100' height='100' fill='%230a0a1a'/%3E%3Cpath d='M30 65l15-15a5 5 0 017 0l18 18' stroke='%23334155' stroke-width='2' stroke-linecap='round'/%3E%3Ccircle cx='40' cy='40' r='5' stroke='%23334155' stroke-width='2'/%3E%3C/svg%3E";
              }}
            />
          </div>

          {/* Next */}
          {renderableImages.length > 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-3 rounded-xl hover:bg-white/10 transition z-10"
              onClick={(e) => { e.stopPropagation(); next(); }}
              aria-label="Next image"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
            {lightboxIndex + 1} / {renderableImages.length}
          </div>
        </div>
      )}
    </>
  );
}
