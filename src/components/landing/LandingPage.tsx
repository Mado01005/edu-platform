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
import { landingContent } from '@/lib/landing/content';
import { landingPath } from '@/lib/i18n';
import type { Locale } from '@/lib/landing/types';
import { siteConfig } from '@/lib/siteConfig';

function faqSchema(locale: Locale) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${siteConfig.url}${landingPath(locale)}#faq`,
    inLanguage: locale,
    mainEntity: landingContent.faq.items.map(([question, answer]) => ({
      '@type': 'Question',
      name: question[locale],
      acceptedAnswer: { '@type': 'Answer', text: answer[locale] },
    })),
  };
}

export function LandingPage({ locale }: { locale: Locale }) {
  return (
    <div className="min-h-dvh w-full min-w-0 max-w-full overflow-x-clip bg-brand-ivory text-brand-base">
      <a className="sr-only z-[100] rounded-lg bg-brand-gold px-4 py-3 font-bold text-brand-base focus:not-sr-only focus:fixed focus:left-4 focus:top-4" href="#main-content">
        {locale === 'ar' ? 'انتقل إلى المحتوى الرئيسي' : 'Skip to main content'}
      </a>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(locale)).replace(/</g, '\\u003c') }}
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
