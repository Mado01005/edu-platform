'use client';

import { useState } from 'react';

interface ImageGalleryProps {
  images: string[];
  title: string;
}

const BASE_IMAGE_URL = process.env.NEXT_PUBLIC_IMAGE_HOST || process.env.NEXT_PUBLIC_SUPABASE_URL || "REPLACE_ME_WITH_BUCKET_URL";

export default function ImageGallery({ images, title }: ImageGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const getFullUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    
    // Define the specific Supabase storage path if we are using Supabase as the fallback provider
    let base = BASE_IMAGE_URL;
    if (base.includes('supabase.co') && !base.includes('/storage/v1/object/public')) {
      base = base.replace(/\/$/, '') + '/storage/v1/object/public';
    }

    const cleanPath = path.startsWith('/') ? path : '/' + path;
    return base === "REPLACE_ME_WITH_BUCKET_URL" ? cleanPath : base.replace(/\/$/, '') + cleanPath;
  };

  const openLightbox = (i: number) => setLightboxIndex(i);
  const closeLightbox = () => setLightboxIndex(null);
  const prev = () => setLightboxIndex((i) => (i !== null ? (i - 1 + images.length) % images.length : 0));
  const next = () => setLightboxIndex((i) => (i !== null ? (i + 1) % images.length : 0));

  console.log("[GALLERY DEBUG] Raw Image Data:", images);
  console.log("[GALLERY DEBUG] Configured Base URL:", BASE_IMAGE_URL);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((src, i) => (
          <div key={src} className="flex flex-col gap-1">
            <button
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
                onError={(e) => {
                  const target = e.currentTarget;
                  target.src = "https://placehold.co/600x400/1e1e2e/8b5cf6?text=Image+Not+Found";
                  console.warn("[GALLERY] Broken Image Link Detected in Database:", src, "Full attempted URL:", getFullUrl(src));
                }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </div>
            </button>
            {/* Visual URL Debugging */}
            <p className="text-[9px] text-white/30 truncate px-2 font-mono" title={getFullUrl(src)}>
              FULL URL: {getFullUrl(src)}
            </p>
          </div>
        ))}
      </div>

      {/* Lightbox */}
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
          {images.length > 1 && (
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
              src={getFullUrl(images[lightboxIndex])}
              alt={`${title} — image ${lightboxIndex + 1}`}
              className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
              onError={(e) => {
                const target = e.currentTarget;
                target.src = "https://placehold.co/600x400/1e1e2e/8b5cf6?text=Image+Not+Found";
                console.warn("[GALLERY] Broken Lightbox Link Detected:", images[lightboxIndex]);
              }}
            />
          </div>

          {/* Next */}
          {images.length > 1 && (
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
            {lightboxIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
}
