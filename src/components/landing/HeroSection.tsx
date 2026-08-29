import { ArrowUpRight, Check, MessageCircle, Sparkles } from 'lucide-react';
import { ConversionLink, WhatsAppLink } from '@/components/landing/ConversionLink';
import { HeroLearningMockup } from '@/components/landing/HeroLearningMockup';
import { LandingCopy } from '@/components/landing/LandingCopy';
import { landingContent } from '@/lib/landing/content';

export function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden pb-16 pt-10 sm:pb-24 sm:pt-16" id="top">
      <div aria-hidden="true" className="oqool-hero-grid absolute inset-0 -z-20" />
      <div aria-hidden="true" className="absolute -left-32 top-4 -z-10 size-80 rounded-full bg-emerald-100/70 blur-3xl" />
      <div aria-hidden="true" className="absolute -right-28 bottom-4 -z-10 size-80 rounded-full bg-[#FBF6E2] blur-3xl" />

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
            <WhatsAppLink className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#084B2B] px-6 text-sm font-black text-white outline-none hover:-translate-y-0.5 hover:bg-[#0F6E41] hover:shadow-[0_14px_34px_rgba(8,75,43,0.18)] focus-visible:ring-4 focus-visible:ring-emerald-200" eventName="hero_diagnostic_click" intent="diagnostic" label="hero_diagnostic">
              {landingContent.hero.primary}
            </WhatsAppLink>
            <WhatsAppLink className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-emerald-950/12 bg-white px-6 text-sm font-black text-[#084B2B] outline-none hover:-translate-y-0.5 hover:border-[#D4AF37]/70 hover:bg-[#FBF6E2] focus-visible:ring-4 focus-visible:ring-emerald-100" eventName="hero_free_lesson_click" intent="freeLesson" label="hero_free_lesson">
              {landingContent.hero.secondary}
            </WhatsAppLink>
            <ConversionLink className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-black text-[#084B2B] underline decoration-[#D4AF37] decoration-2 underline-offset-4 outline-none hover:text-[#0F6E41] focus-visible:ring-4 focus-visible:ring-emerald-100" eventName="curriculum_anchor_click" href="#curriculum" label="hero">
              <LandingCopy>{landingContent.hero.tertiary}</LandingCopy>
              <ArrowUpRight aria-hidden="true" className="size-4 rtl:-scale-x-100" />
            </ConversionLink>
          </div>

          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-emerald-950/8 bg-white/70 p-4 text-start">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[#084B2B]"><Check aria-hidden="true" className="size-3.5" /></span>
            <LandingCopy className="text-xs font-bold leading-6 text-slate-600 sm:text-sm">{landingContent.hero.qualifier}</LandingCopy>
          </div>
        </div>

        <HeroLearningMockup />
      </div>

      <div className="mx-auto mt-12 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[1.75rem] border border-emerald-950/8 bg-white p-2 sm:p-3 lg:rounded-full" aria-label="Oqool learning services">
          <ul className="grid grid-cols-2 gap-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-600 md:grid-cols-3 lg:grid-cols-6 lg:text-[11px]" role="list">
            {landingContent.ticker.map((item) => (
              <li className="flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-full bg-[#F8FAF8] px-3 py-2 text-center leading-4" key={item.en}>
                <MessageCircle aria-hidden="true" className="size-3.5 shrink-0 text-[#0F6E41]" />
                <LandingCopy className="min-w-0">{item}</LandingCopy>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
