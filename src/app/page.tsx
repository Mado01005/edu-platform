import type { Metadata } from 'next';
import { LandingPage } from '@/components/landing/LandingPage';
import { landingAlternates } from '@/lib/i18n';
import { siteConfig } from '@/lib/siteConfig';

const description = siteConfig.description;

export const metadata: Metadata = {
  title: siteConfig.title,
  description,
  alternates: { canonical: `${siteConfig.url}/`, languages: landingAlternates },
  openGraph: {
    title: siteConfig.title,
    description,
    images: [
      {
        url: `${siteConfig.url}${siteConfig.brand.banner}`,
        width: siteConfig.brand.bannerWidth,
        height: siteConfig.brand.bannerHeight,
        alt: 'Nudrek Learning Hub official banner',
      },
    ],
    locale: 'en_US',
    alternateLocale: ['ar_SA'],
    siteName: siteConfig.name,
    type: 'website',
    url: `${siteConfig.url}/`,
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.title,
    description,
    images: [`${siteConfig.url}${siteConfig.brand.banner}`],
  },
};

export default function RootPage() {
  return <LandingPage locale="en" />;
}
