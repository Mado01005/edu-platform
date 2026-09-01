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

const description =
  'Oqool Academy provides structured live online learning for students in Saudi Arabia and the UAE through diagnostic assessment, personalized learning plans, carefully selected teachers, and continuous progress tracking.';

export const metadata: Metadata = {
  title: 'Oqool Academy | Personalized Online Learning for Grades 1–12',
  description,
  alternates: { canonical: `${siteConfig.url}/` },
  openGraph: {
    title: 'Oqool Academy | A Learning Journey Built Around Your Child',
    description,
    images: [
      {
        url: `${siteConfig.url}${siteConfig.brand.banner}`,
        width: 1942,
        height: 809,
        alt: 'Oqool Academy official banner',
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
    title: 'Oqool Academy | Personalized Online Learning for Grades 1–12',
    description,
    images: [`${siteConfig.url}${siteConfig.brand.banner}`],
  },
};

const educationalOrganization = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: siteConfig.name,
  alternateName: siteConfig.arabicName,
  url: siteConfig.url,
  logo: `${siteConfig.url}${siteConfig.brand.logo}`,
  description,
  areaServed: ['Saudi Arabia', 'United Arab Emirates'],
};

export default function RootPage() {
  return (
    <div className="min-h-dvh w-full min-w-0 max-w-full overflow-x-clip bg-brand-ivory text-brand-base">
      <a className="sr-only z-[100] rounded-lg bg-brand-gold px-4 py-3 font-bold text-brand-base focus:not-sr-only focus:fixed focus:left-4 focus:top-4" href="#main-content">
        Skip to main content
      </a>
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(educationalOrganization).replace(/</g, '\\u003c'),
        }}
        type="application/ld+json"
      />
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
