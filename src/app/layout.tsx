import type { Metadata } from 'next';
import { Cairo, Inter } from 'next/font/google';
import { cookies } from 'next/headers';
import Script from 'next/script';
import Providers from '@/components/Providers';
import { WorkspaceEnhancements } from '@/components/WorkspaceEnhancements';
import './globals.css';
import 'katex/dist/katex.min.css';

import { auth } from '@/auth';
import { SpeedInsights } from "@vercel/speed-insights/next";
import { LanguageProvider } from '@/components/i18n/language-provider';
import { LANGUAGE_PREFERENCE_KEY, resolveLocale } from '@/lib/i18n';

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
      { url: '/brand/oqool-logo.png', sizes: '1254x1254', type: 'image/png' },
    ],
    shortcut: [
      { url: '/brand/oqool-logo.png', sizes: '1254x1254', type: 'image/png' },
    ],
    apple: [
      { url: '/brand/oqool-logo.png', sizes: '1254x1254', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Oqool Academy | أكاديمية عقول',
    description: 'Grow Minds. Shape the Future. نُنَمِّي العقول... ونصنع المستقبل',
    url: SITE_URL,
    siteName: 'Oqool Academy',
    images: [
      {
        url: '/brand/oqool-banner.png',
        width: 1942,
        height: 809,
        alt: 'Oqool Academy — Grow Minds. Shape the Future.',
      },
    ],
    locale: 'ar_SA',
    alternateLocale: ['en_US'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Oqool Academy | أكاديمية عقول',
    description: 'Grow Minds. Shape the Future.',
    images: ['/brand/oqool-banner.png'],
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const initialLocale = resolveLocale(
    cookieStore.get(LANGUAGE_PREFERENCE_KEY)?.value,
  );
  const spotifyToken = session?.user?.spotifyAccessToken;
  const spotifyRefreshToken = session?.user?.spotifyRefreshToken;
  const spotifyTokenExpiresAt = session?.user?.spotifyTokenExpiresAt;

  return (
    <html
      lang={initialLocale}
      dir={initialLocale === 'ar' ? 'rtl' : 'ltr'}
      data-locale={initialLocale}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className={`${inter.className} ${inter.variable} ${cairo.variable} overflow-x-hidden bg-surface-canvas text-brand-700 antialiased`}>
        <LanguageProvider initialLocale={initialLocale}>
          <Providers session={session}>
            <div className="flex min-h-dvh w-full min-w-0">
              <div className="min-w-0 flex-1">{children}</div>
            </div>
            <WorkspaceEnhancements
              accessToken={spotifyToken}
              enabled={Boolean(session)}
              refreshToken={spotifyRefreshToken}
              tokenExpiresAt={spotifyTokenExpiresAt}
            />
          </Providers>
        </LanguageProvider>
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
