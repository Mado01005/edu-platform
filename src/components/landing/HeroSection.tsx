import { ArrowUpRight, Check, MessageCircle, Sparkles } from 'lucide-react';
import { ConversionLink, WhatsAppLink } from '@/components/landing/ConversionLink';
import { HeroLearningMockup } from '@/components/landing/HeroLearningMockup';
import { LandingCopy } from '@/components/landing/LandingCopy';
import { landingContent } from '@/lib/landing/content';

export function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden py-20 md:py-28" id="top">
      <div aria-hidden="true" className="oqool-hero-grid absolute inset-0 -z-30" />
      <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_16%_24%,rgba(23,88,63,0.52),transparent_34%),radial-gradient(circle_at_84%_34%,rgba(212,163,69,0.18),transparent_30%)]" />

      <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10 lg:px-8">
        <div className="min-w-0 max-w-2xl text-center lg:text-start">
          <div className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-full border border-brand-rim bg-brand-surface px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-brand-gold sm:text-xs">
            <Sparkles aria-hidden="true" className="size-3.5 shrink-0 text-brand-gold" />
            <LandingCopy>{landingContent.hero.eyebrow}</LandingCopy>
          </div>

          <h1 className="mt-6 text-balance text-[2.55rem] font-black leading-[1.02] tracking-[-0.045em] text-brand-white sm:text-6xl lg:text-[4.25rem]">
            <LandingCopy>{landingContent.hero.title}</LandingCopy>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-8 text-brand-muted/80 sm:text-lg lg:mx-0">
            <LandingCopy>{landingContent.hero.description}</LandingCopy>
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:justify-start">
            <WhatsAppLink className="landing-cta inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-gold px-6 text-sm font-black text-brand-base shadow-lg shadow-black/25 ring-1 ring-brand-gold-hover/40 outline-none transition-all duration-300 hover:-translate-y-1 hover:bg-brand-gold-hover hover:shadow-[0_0_32px_rgba(229,184,92,0.26)] focus-visible:ring-4 focus-visible:ring-brand-gold-hover/35" eventName="hero_diagnostic_click" intent="diagnostic" label="hero_diagnostic">
              {landingContent.hero.primary}
            </WhatsAppLink>
            <WhatsAppLink className="landing-cta inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-brand-border bg-brand-surface px-6 text-sm font-black text-brand-white shadow-md shadow-black/20 ring-1 ring-brand-rim outline-none backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-brand-gold hover:text-brand-gold-hover hover:shadow-xl hover:shadow-black/25 focus-visible:ring-4 focus-visible:ring-brand-gold/25" eventName="hero_free_lesson_click" intent="freeLesson" label="hero_free_lesson">
              {landingContent.hero.secondary}
            </WhatsAppLink>
            <ConversionLink className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-black text-brand-gold underline decoration-brand-gold decoration-2 underline-offset-4 outline-none hover:text-brand-gold-hover focus-visible:ring-4 focus-visible:ring-brand-gold/25" eventName="curriculum_anchor_click" href="#curriculum" label="hero">
              <LandingCopy>{landingContent.hero.tertiary}</LandingCopy>
              <ArrowUpRight aria-hidden="true" className="size-4 rtl:-scale-x-100" />
            </ConversionLink>
          </div>

          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-brand-rim bg-brand-surface p-4 text-start shadow-lg shadow-black/20 backdrop-blur-md">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-gold text-brand-base"><Check aria-hidden="true" className="size-3.5" /></span>
            <LandingCopy className="text-xs font-bold leading-6 text-brand-muted/80 sm:text-sm">{landingContent.hero.qualifier}</LandingCopy>
          </div>
        </div>

        <HeroLearningMockup />
      </div>

      <div className="mx-auto mt-12 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="oqool-feature-ticker overflow-hidden rounded-3xl border border-brand-rim bg-brand-surface p-2 shadow-xl shadow-black/20 backdrop-blur-md sm:p-3 lg:rounded-full" aria-label="Oqool learning services">
          <div className="oqool-feature-ticker-track flex w-max text-[10px] font-black uppercase tracking-[0.1em] text-brand-muted lg:text-[11px]" dir="ltr">
            {[false, true].map((duplicate) => (
              <ul
                aria-hidden={duplicate || undefined}
                className={`oqool-feature-ticker-sequence flex shrink-0 items-center gap-2 pe-2 ${duplicate ? 'oqool-feature-ticker-copy' : ''}`}
                key={duplicate ? 'duplicate' : 'primary'}
                role="list"
              >
                {landingContent.ticker.map((item) => (
                  <li className="flex min-h-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-brand-base px-4 py-2 text-center leading-4" key={item.en}>
                    <MessageCircle aria-hidden="true" className="size-3.5 shrink-0 text-brand-gold" />
                    <LandingCopy>{item}</LandingCopy>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
