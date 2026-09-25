import type { Metadata } from 'next';
import { CurriculumExplorer } from '@/components/landing/CurriculumExplorer';
import { FAQSection } from '@/components/landing/FaqSection';
import { FinalCTASection } from '@/components/landing/FinalCTASection';
import { FloatingNavbar } from '@/components/landing/FloatingNavbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { LandingAnalytics } from '@/components/landing/LandingAnalytics';
import { LearningExperienceBento } from '@/components/landing/LearningExperienceBento';
import { MobileConversionBar } from '@/components/landing/MobileConversionBar';
import { OutcomesSection } from '@/components/landing/OutcomesSection';
import { ProblemSection } from '@/components/landing/ProblemSection';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SolutionFramework } from '@/components/landing/SolutionFramework';
import { TrustBar } from '@/components/landing/TrustBar';
import { siteConfig } from '@/lib/siteConfig';

const description = siteConfig.description;

export const metadata: Metadata = {
  title: siteConfig.title,
  description,
  alternates: { canonical: `${siteConfig.url}/` },
  openGraph: {
    title: siteConfig.title,
    description,
    images: [
      {
        url: `${siteConfig.url}${siteConfig.brand.banner}`,
        width: siteConfig.brand.bannerWidth,
        height: siteConfig.brand.bannerHeight,
        alt: 'Nodrek Learning Hub official banner',
      },
    ],
    locale: 'ar_SA',
    alternateLocale: ['en_US'],
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
  return (
    <div className="min-h-dvh w-full min-w-0 max-w-full overflow-x-clip bg-brand-ivory text-brand-base">
      <a className="sr-only z-[100] rounded-lg bg-brand-gold px-4 py-3 font-bold text-brand-base focus:not-sr-only focus:fixed focus:left-4 focus:top-4" href="#main-content">
        Skip to main content
      </a>
      <LandingAnalytics />
      <FloatingNavbar />
      <main id="main-content">
        <HeroSection />
        <TrustBar />
        <ProblemSection />
        <SolutionFramework />
        <LearningExperienceBento />
        <HowItWorks />
        <CurriculumExplorer />
        <OutcomesSection />
        <FAQSection />
        <FinalCTASection />
      </main>
      <SiteFooter />
      <MobileConversionBar />
    </div>
  );
}
