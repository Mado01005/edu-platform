'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * PREFETCH ENGINE (PRO SUITE)
 * Monitors user hover intent and proactively warms up Next.js route caches.
 */
export default function PrefetchEngine() {
  const router = useRouter();

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');

      if (anchor && anchor.href) {
        const url = new URL(anchor.href);
        const currentUrl = new URL(window.location.href);

        // Only prefetch internal routes and avoid external ones
        if (url.origin === currentUrl.origin && !url.pathname.startsWith('/api')) {
           // Proactively prefetch the JSON payload for the next page
           router.prefetch(url.pathname);
        }
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    return () => document.removeEventListener('mouseover', handleMouseOver);
  }, [router]);

  return null; // Invisible engine
}
