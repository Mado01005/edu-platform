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
import SupportChat from '@/components/SupportChat';

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isAdmin = (session?.user as any)?.isAdmin;

  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950 text-gray-100 antialiased`}>
        <InteractionTracker />
        <SessionTracker />
        <PWAInstallPrompt />
        <KeyboardShortcuts />
        <StudyTimer />
        <MobileNav />
        
        {children}

        {/* Global Support Chat - Only hidden on the Admin Command Center to avoid UI clutter */}
        {session?.user?.email && <SupportChat userEmail={session.user.email} />}
        
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
