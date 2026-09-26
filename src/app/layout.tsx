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
import { SOCIAL_LINKS } from '@/config/socials';
import { siteConfig } from '@/lib/siteConfig';
import { LANGUAGE_PREFERENCE_KEY, resolveLocale } from '@/lib/i18n';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-english' });
const cairo = Cairo({ subsets: ['arabic'], display: 'swap', variable: '--font-arabic' });

const SITE_URL = siteConfig.url;

export const metadata: Metadata = {
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.title}`,
  },
  description: siteConfig.description,
  keywords: ['nodrekhub', 'Nodrek Hub', 'Nodrek Learning Hub', 'نُدرك', 'نُدرك للتعليم المتكامل', 'منصة نُدرك'],
  metadataBase: new URL(SITE_URL),
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: siteConfig.brand.logo, sizes: '512x512', type: 'image/png' },
    ],
    shortcut: [{ url: '/favicon.ico', sizes: 'any' }],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
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
    locale: 'en_US',
    alternateLocale: ['ar_SA'],
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

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  '@id': `${siteConfig.url}/#organization`,
  name: siteConfig.name,
  alternateName: ['nodrekhub', 'nodrekhub.com', 'Nodrek Hub', siteConfig.arabicName, 'نُدرك'],
  url: siteConfig.url,
  logo: `${siteConfig.url}${siteConfig.brand.logo}`,
  description: `Nodrek Learning Hub provides managed online education, diagnostic assessments, and personalized learning journeys for students in grades 1 through 12 across Egypt and the ${siteConfig.serviceRegion.en}.`,
  areaServed: [
    { '@type': 'Country', name: 'Egypt' },
    { '@type': 'AdministrativeArea', name: siteConfig.serviceRegion.en },
  ],
  slogan: `${siteConfig.tagline.en} | ${siteConfig.tagline.ar}`,
  telephone: `+${siteConfig.whatsapp.number}`,
  email: siteConfig.support.email,
  contactPoint: [{
    '@type': 'ContactPoint',
    telephone: '+20-155-422-5979',
    contactType: 'customer service',
    availableLanguage: ['Arabic', 'English'],
    contactOption: 'WhatsApp',
  }],
  sameAs: SOCIAL_LINKS.map(({ url }) => url),
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${siteConfig.url}/#website`,
  name: siteConfig.name,
  alternateName: ['nodrekhub', 'nodrekhub.com', 'Nodrek Hub', siteConfig.arabicName, 'نُدرك'],
  url: siteConfig.url,
  publisher: { '@id': `${siteConfig.url}/#organization` },
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
        <script
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': [organizationSchema, websiteSchema] }).replace(/</g, '\\u003c'),
          }}
          type="application/ld+json"
        />
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
