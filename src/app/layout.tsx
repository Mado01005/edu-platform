import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import SessionTracker from '@/components/SessionTracker';
import InteractionTracker from '@/components/InteractionTracker';
import { PWAInstallPrompt, KeyboardShortcuts, StudyTimer, MobileNav, MusicPlayer } from '@/components/LazyWidgets';
import Providers from '@/components/Providers';
import './globals.css';
import PrefetchEngine from '@/components/PrefetchEngine';

import { auth } from '@/auth';
import { SpeedInsights } from "@vercel/speed-insights/next";
import FloatingTutor from '@/components/Chat/FloatingTutor';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://www.edu-platform.me');

export const metadata: Metadata = {
  title: 'Way Ground LMS — Learn, Build, Progress',
  description: 'A modern education platform for students. Access courses in Dynamics, Physics, Chemistry, Communication Skills, Academic Writing, Calculus, and Programming.',
  metadataBase: new URL(SITE_URL),
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-512x512.png' },
    ],
  },
  openGraph: {
    title: 'Way Ground LMS — Learn, Build, Progress',
    description: 'A modern education platform for students.',
    url: SITE_URL,
    siteName: 'Way Ground LMS',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Way Ground LMS Learning Hub',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Way Ground LMS — Learn, Build, Progress',
    description: 'A modern education platform for students.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: '/',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Way Ground LMS',
  },
};

import { SpotifyProvider } from '@/context/SpotifyContext';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const spotifyToken = session?.user?.spotifyAccessToken;
  const spotifyRefreshToken = session?.user?.spotifyRefreshToken;
  const spotifyTokenExpiresAt = session?.user?.spotifyTokenExpiresAt;

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className={`${inter.className} overflow-x-hidden bg-slate-50 text-slate-900 antialiased`}>
        <Providers>
          <PWAInstallPrompt />
          <KeyboardShortcuts />
          <PrefetchEngine />
          {session ? (
            <>
              <InteractionTracker />
              <SessionTracker />
              <StudyTimer />
              <MobileNav />
            </>
          ) : null}

          <SpotifyProvider accessToken={spotifyToken} refreshToken={spotifyRefreshToken} tokenExpiresAt={spotifyTokenExpiresAt}>
            <div className="flex min-h-screen w-full min-w-0">
              <div className="min-w-0 flex-1">{children}</div>
            </div>
            {session ? <MusicPlayer /> : null}
          </SpotifyProvider>
        </Providers>

        {session ? <FloatingTutor /> : null}
        {process.env.VERCEL === '1' ? <SpeedInsights /> : null}

        {/* PWA Service Worker Registration */}
        <Script id="register-pwa-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(
                  function(registration) { console.log('PWA ServiceWorker setup successful'); },
                  function(err) { console.log('PWA ServiceWorker setup failed: ', err); }
                );
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
