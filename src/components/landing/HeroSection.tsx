import { Check, Sparkles } from 'lucide-react';
import { BookingCard } from '@/components/landing/BookingCard';
import { DiagnosticAssessmentLink } from '@/components/landing/ConversionLink';
import { LandingCopy } from '@/components/landing/LandingCopy';
import { siteConfig } from '@/lib/siteConfig';
import { landingContent } from '@/lib/landing/content';

export function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-b from-[#E7EFEA] via-[#F0F5F2] to-[#F7FAF8] py-20 text-brand-base md:py-28" id="top">
      <div aria-hidden="true" className="nodrek-hero-grid absolute inset-0 -z-30" />
      <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_16%_24%,rgba(167,194,177,0.12),transparent_34%),radial-gradient(circle_at_84%_34%,rgba(216,166,73,0.16),transparent_30%)]" />

      <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10 lg:px-8">
        <div className="min-w-0 max-w-2xl text-center lg:text-start">
          <div className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-full border border-brand-rim bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-brand-base shadow-sm shadow-brand-base/5 sm:text-xs">
            <Sparkles aria-hidden="true" className="size-3.5 shrink-0 text-brand-gold" />
            <LandingCopy>{landingContent.hero.eyebrow}</LandingCopy>
          </div>

          <LandingCopy as="p" className="mt-5 text-xs font-bold tracking-[0.2em] text-brand-base">{siteConfig.tagline}</LandingCopy>
          <h1 className="mt-4 text-balance text-[2.55rem] font-black leading-[1.02] tracking-[-0.045em] text-brand-base sm:text-5xl lg:text-[3.5rem]">
            <LandingCopy>{landingContent.hero.title}</LandingCopy>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-8 text-brand-surface/80 sm:text-lg lg:mx-0">
            <LandingCopy>{landingContent.hero.description}</LandingCopy>
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:justify-start">
            <DiagnosticAssessmentLink className="landing-cta inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-gold px-6 text-sm font-bold text-brand-base shadow-md shadow-brand-gold/20 outline-none transition-all duration-300 hover:-translate-y-1 hover:bg-brand-gold-hover hover:shadow-[0_0_32px_rgba(232,190,95,0.26)] focus-visible:ring-4 focus-visible:ring-brand-gold-hover/35" eventName="hero_diagnostic_click" label="hero_diagnostic">
              {landingContent.hero.primary}
            </DiagnosticAssessmentLink>
            <a className="landing-cta inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-brand-base bg-white px-6 text-sm font-bold text-brand-base shadow-sm outline-none backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-brand-base/5 hover:shadow-md focus-visible:ring-4 focus-visible:ring-brand-gold/25" href="#how-it-works"><LandingCopy>{landingContent.hero.secondary}</LandingCopy></a>
          </div>

          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-brand-base/10 bg-white/85 p-4 text-start shadow-lg shadow-brand-base/10 backdrop-blur-md">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-gold text-brand-base"><Check aria-hidden="true" className="size-3.5" /></span>
            <LandingCopy className="text-xs font-bold leading-6 text-brand-surface/80 sm:text-sm">{landingContent.hero.qualifier}</LandingCopy>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
          <BookingCard />
        </div>
      </div>
    </section>
  );
}
