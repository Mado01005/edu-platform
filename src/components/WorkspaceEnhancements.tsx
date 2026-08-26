'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import {
  KeyboardShortcuts,
  MobileNav,
  MusicPlayer,
  StudyTimer,
} from '@/components/LazyWidgets';
import { SpotifyProvider } from '@/context/SpotifyContext';

const InteractionTracker = dynamic(
  () => import('@/components/InteractionTracker'),
  { ssr: false },
);
const SessionTracker = dynamic(() => import('@/components/SessionTracker'), {
  ssr: false,
});
const PrefetchEngine = dynamic(() => import('@/components/PrefetchEngine'), {
  ssr: false,
});
const FloatingTutor = dynamic(
  () => import('@/components/Chat/FloatingTutor'),
  { ssr: false },
);

const PUBLIC_PRESENTATION_ROUTES = new Set([
  '/',
  '/catalog',
  '/lms/login',
  '/parent/login',
  '/privacy',
  '/terms',
]);

function isPublicPresentationRoute(pathname: string) {
  return (
    PUBLIC_PRESENTATION_ROUTES.has(pathname) ||
    pathname === '/preview' ||
    pathname.startsWith('/preview/')
  );
}

export function WorkspaceEnhancements({
  accessToken,
  enabled,
  refreshToken,
  tokenExpiresAt,
}: {
  accessToken?: string;
  enabled: boolean;
  refreshToken?: string;
  tokenExpiresAt?: number;
}) {
  const pathname = usePathname();

  if (!enabled || isPublicPresentationRoute(pathname)) return null;

  return (
    <>
      <KeyboardShortcuts />
      <PrefetchEngine />
      <InteractionTracker />
      <SessionTracker />
      <StudyTimer />
      <MobileNav />
      <SpotifyProvider
        accessToken={accessToken}
        refreshToken={refreshToken}
        tokenExpiresAt={tokenExpiresAt}
      >
        <MusicPlayer />
      </SpotifyProvider>
      <FloatingTutor />
    </>
  );
}
