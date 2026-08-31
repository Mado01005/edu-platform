import { ArrowUpRight, Check, MessageCircle, Sparkles } from 'lucide-react';
import { ConversionLink, WhatsAppLink } from '@/components/landing/ConversionLink';
import { HeroLearningMockup } from '@/components/landing/HeroLearningMockup';
import { LandingCopy } from '@/components/landing/LandingCopy';
import { landingContent } from '@/lib/landing/content';

export function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden py-20 md:py-28" id="top">
      <div aria-hidden="true" className="oqool-hero-grid absolute inset-0 -z-30" />
      <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_16%_24%,rgba(16,185,129,0.18),transparent_34%),radial-gradient(circle_at_84%_34%,rgba(212,175,55,0.16),transparent_30%)]" />

      <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10 lg:px-8">
        <div className="min-w-0 max-w-2xl text-center lg:text-start">
          <div className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-full border border-[#D4AF37]/35 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#084B2B] sm:text-xs">
            <Sparkles aria-hidden="true" className="size-3.5 shrink-0 text-[#A67C00]" />
            <LandingCopy>{landingContent.hero.eyebrow}</LandingCopy>
          </div>

          <h1 className="mt-6 text-balance text-[2.55rem] font-black leading-[1.02] tracking-[-0.045em] text-[#084B2B] sm:text-6xl lg:text-[4.25rem]">
            <LandingCopy>{landingContent.hero.title}</LandingCopy>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-8 text-slate-600 sm:text-lg lg:mx-0">
            <LandingCopy>{landingContent.hero.description}</LandingCopy>
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:justify-start">
            <WhatsAppLink className="landing-cta inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#084B2B] px-6 text-sm font-black text-white shadow-lg shadow-emerald-950/15 ring-1 ring-white/20 outline-none transition-all duration-300 hover:-translate-y-1 hover:bg-[#0F6E41] hover:shadow-[0_0_32px_rgba(16,185,129,0.28)] focus-visible:ring-4 focus-visible:ring-emerald-200" eventName="hero_diagnostic_click" intent="diagnostic" label="hero_diagnostic">
              {landingContent.hero.primary}
            </WhatsAppLink>
            <WhatsAppLink className="landing-cta inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-emerald-950/12 bg-white/85 px-6 text-sm font-black text-[#084B2B] shadow-md shadow-emerald-950/5 ring-1 ring-white/70 outline-none backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[#D4AF37]/70 hover:bg-[#FBF6E2] hover:shadow-xl hover:shadow-[#D4AF37]/10 focus-visible:ring-4 focus-visible:ring-emerald-100" eventName="hero_free_lesson_click" intent="freeLesson" label="hero_free_lesson">
              {landingContent.hero.secondary}
            </WhatsAppLink>
            <ConversionLink className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-black text-[#084B2B] underline decoration-[#D4AF37] decoration-2 underline-offset-4 outline-none hover:text-[#0F6E41] focus-visible:ring-4 focus-visible:ring-emerald-100" eventName="curriculum_anchor_click" href="#curriculum" label="hero">
              <LandingCopy>{landingContent.hero.tertiary}</LandingCopy>
              <ArrowUpRight aria-hidden="true" className="size-4 rtl:-scale-x-100" />
            </ConversionLink>
          </div>

          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-emerald-500/15 bg-white/70 p-4 text-start shadow-lg shadow-emerald-950/5 backdrop-blur-md">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[#084B2B]"><Check aria-hidden="true" className="size-3.5" /></span>
            <LandingCopy className="text-xs font-bold leading-6 text-slate-600 sm:text-sm">{landingContent.hero.qualifier}</LandingCopy>
          </div>
        </div>

        <HeroLearningMockup />
      </div>

      <div className="mx-auto mt-12 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="oqool-feature-ticker overflow-hidden rounded-3xl border border-emerald-500/15 bg-white/70 p-2 shadow-xl shadow-emerald-950/5 backdrop-blur-md sm:p-3 lg:rounded-full" aria-label="Oqool learning services">
          <div className="oqool-feature-ticker-track flex w-max text-[10px] font-black uppercase tracking-[0.1em] text-slate-600 lg:text-[11px]" dir="ltr">
            {[false, true].map((duplicate) => (
              <ul
                aria-hidden={duplicate || undefined}
                className={`oqool-feature-ticker-sequence flex shrink-0 items-center gap-2 pe-2 ${duplicate ? 'oqool-feature-ticker-copy' : ''}`}
                key={duplicate ? 'duplicate' : 'primary'}
                role="list"
              >
                {landingContent.ticker.map((item) => (
                  <li className="flex min-h-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#F8FAF8] px-4 py-2 text-center leading-4" key={item.en}>
                    <MessageCircle aria-hidden="true" className="size-3.5 shrink-0 text-[#0F6E41]" />
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
