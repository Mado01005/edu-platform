import type { Metadata } from 'next';
import { LandingPage } from '@/components/landing/LandingPage';
import { landingAlternates } from '@/lib/i18n';
import { siteConfig } from '@/lib/siteConfig';

const title = `${siteConfig.arabicName} | ${siteConfig.name}`;
const description = siteConfig.arabicDescription;
const url = `${siteConfig.url}${siteConfig.routes.arabicHome}`;

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: url, languages: landingAlternates },
  openGraph: {
    title,
    description,
    images: [
      {
        url: `${siteConfig.url}${siteConfig.brand.banner}`,
        width: siteConfig.brand.bannerWidth,
        height: siteConfig.brand.bannerHeight,
        alt: `${siteConfig.arabicName} - ${siteConfig.name}`,
      },
    ],
    locale: 'ar_SA',
    alternateLocale: ['en_US'],
    siteName: siteConfig.name,
    type: 'website',
    url,
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: [`${siteConfig.url}${siteConfig.brand.banner}`],
  },
};

export default function ArabicHomePage() {
  return <LandingPage locale="ar" />;
}
