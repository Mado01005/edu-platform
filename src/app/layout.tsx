import type { Metadata, Viewport } from 'next';
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
import { siteConfig } from '@/lib/siteConfig';
import { LANGUAGE_PREFERENCE_KEY, resolveLocale } from '@/lib/i18n';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-english' });
const cairo = Cairo({ subsets: ['arabic'], display: 'swap', variable: '--font-arabic' });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : siteConfig.url);

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
  metadataBase: new URL(SITE_URL),
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: siteConfig.brand.appIcon, sizes: '512x512', type: 'image/png' },
    ],
    shortcut: [
      { url: siteConfig.brand.appIcon, sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: siteConfig.brand.appIcon, sizes: '512x512', type: 'image/png' },
    ],
  },
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    url: SITE_URL,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.brand.banner,
        width: siteConfig.brand.bannerWidth,
        height: siteConfig.brand.bannerHeight,
        alt: 'Nodrek Learning Hub — LEARN • GROW • ACHIEVE',
      },
    ],
    locale: 'ar_SA',
    alternateLocale: ['en_US'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.title,
    description: siteConfig.description,
    images: [siteConfig.brand.banner],
  },
  alternates: {
    canonical: '/',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: siteConfig.name,
  },
};

export const viewport: Viewport = { themeColor: '#052F26' };

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
