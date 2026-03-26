import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import SessionTracker from '@/components/SessionTracker';
import InteractionTracker from '@/components/InteractionTracker';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import StudyTimer from '@/components/StudyTimer';
import MobileNav from '@/components/MobileNav';
import './globals.css';

import { auth } from '@/auth';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'EduPortal — Your Learning Hub',
  description: 'A modern education platform for students. Access courses in Dynamics, Physics, Chemistry, Communication Skills, Academic Writing, Calculus, and Programming.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'EduPortal',
  },
};

import { SpotifyProvider } from '@/context/SpotifyContext';
import MusicPlayer from '@/components/MusicPlayer';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isAdmin = (session?.user as any)?.isAdmin;
  // @ts-expect-error - Accessing custom property
  const spotifyToken = session?.user?.spotifyAccessToken;

  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950 text-gray-100 antialiased`}>
        <InteractionTracker />
        <SessionTracker />
        <PWAInstallPrompt />
        <KeyboardShortcuts />
        <StudyTimer />
        <MobileNav />
        
        <SpotifyProvider accessToken={spotifyToken}>
          {children}
          <MusicPlayer />
        </SpotifyProvider>

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
