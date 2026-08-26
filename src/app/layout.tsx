import type { Metadata } from 'next';
import { Cairo, Inter } from 'next/font/google';
import Script from 'next/script';
import SessionTracker from '@/components/SessionTracker';
import InteractionTracker from '@/components/InteractionTracker';
import { PWAInstallPrompt, KeyboardShortcuts, StudyTimer, MobileNav, MusicPlayer } from '@/components/LazyWidgets';
import Providers from '@/components/Providers';
import './globals.css';
import 'katex/dist/katex.min.css';
import PrefetchEngine from '@/components/PrefetchEngine';

import { auth } from '@/auth';
import { SpeedInsights } from "@vercel/speed-insights/next";
import FloatingTutor from '@/components/Chat/FloatingTutor';
import { LanguageProvider } from '@/components/i18n/language-provider';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-english' });
const cairo = Cairo({ subsets: ['arabic'], display: 'swap', variable: '--font-arabic' });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://www.edu-platform.me');

export const metadata: Metadata = {
  title: 'Oqool Academy | أكاديمية عقول',
  description: 'Grow Minds. Shape the Future. نُنَمِّي العقول... ونصنع المستقبل',
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
    title: 'Oqool Academy | أكاديمية عقول',
    description: 'Grow Minds. Shape the Future. نُنَمِّي العقول... ونصنع المستقبل',
    url: SITE_URL,
    siteName: 'Oqool Academy',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Oqool Academy Learning Hub',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Oqool Academy | أكاديمية عقول',
    description: 'Grow Minds. Shape the Future.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: '/',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Oqool Academy',
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
      dir="ltr"
      data-locale="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className={`${inter.className} ${inter.variable} ${cairo.variable} overflow-x-hidden bg-surface-canvas text-brand-700 antialiased`}>
        <LanguageProvider>
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
        </LanguageProvider>

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
