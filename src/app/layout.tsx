import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import SessionTracker from '@/components/SessionTracker';
import InteractionTracker from '@/components/InteractionTracker';
import { PWAInstallPrompt, KeyboardShortcuts, StudyTimer, MobileNav, MusicPlayer } from '@/components/LazyWidgets';
import Providers from '@/components/Providers';
import './globals.css';

import { auth } from '@/auth';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL 
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://eduportal.app');

export const metadata: Metadata = {
  title: 'EduPortal — Your Learning Hub',
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
    title: 'EduPortal — Your Learning Hub',
    description: 'A modern education platform for students.',
    url: SITE_URL,
    siteName: 'EduPortal',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'EduPortal Learning Hub',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EduPortal — Your Learning Hub',
    description: 'A modern education platform for students.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: '/',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'EduPortal',
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
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950 text-gray-100 antialiased`}>
        <InteractionTracker />
        <SessionTracker />
        <PWAInstallPrompt />
        <KeyboardShortcuts />
        <StudyTimer />
        <MobileNav />
        
        <Providers>
        <SpotifyProvider accessToken={spotifyToken} refreshToken={spotifyRefreshToken} tokenExpiresAt={spotifyTokenExpiresAt}>
          {children}
          <MusicPlayer />
        </SpotifyProvider>
        </Providers>

        {/* Tawk.to Live Chat Script */}
        <Script id="tawk-to" strategy="lazyOnload">
          {`
            var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
            (function(){
            var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
            s1.async=true;
            s1.src='https://embed.tawk.to/69beda18efc5d11c3692a4f8/default';
            s1.charset='UTF-8';
            s1.setAttribute('crossorigin','*');
            s0.parentNode.insertBefore(s1,s0);
            })();
          `}
        </Script>

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
