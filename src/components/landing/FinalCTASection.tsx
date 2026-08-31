import { CheckCircle2 } from 'lucide-react';
import { WhatsAppLink } from '@/components/landing/ConversionLink';
import { LandingCopy } from '@/components/landing/LandingCopy';
import { landingContent } from '@/lib/landing/content';

export function FinalCTASection() {
  return (
    <section className="relative isolate overflow-hidden px-4 py-20 text-white sm:px-6 md:py-28 lg:px-8">
      <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.20),transparent_38%),radial-gradient(circle_at_82%_22%,rgba(212,175,55,0.16),transparent_26%)]" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center overflow-hidden rounded-3xl border border-emerald-500/15 bg-emerald-950/50 px-5 py-14 text-center shadow-2xl shadow-black/30 backdrop-blur-md sm:px-10 sm:py-20">
        <div aria-hidden="true" className="absolute -left-20 -top-20 size-64 rounded-full border-[52px] border-white/5" />
        <div aria-hidden="true" className="absolute -bottom-24 -right-20 size-72 rounded-full border-[42px] border-[#D4AF37]/10" />
        <CheckCircle2 aria-hidden="true" className="relative size-10 text-[#E7CD78]" />
        <LandingCopy className="relative mt-5 text-xs font-black uppercase tracking-[0.18em] text-[#E7CD78]">{landingContent.finalCta.eyebrow}</LandingCopy>
        <LandingCopy as="h2" className="relative mt-4 max-w-4xl text-balance text-3xl font-black tracking-tight sm:text-5xl">{landingContent.finalCta.title}</LandingCopy>
        <LandingCopy as="p" className="relative mt-5 max-w-2xl text-sm leading-7 text-emerald-100/80 sm:text-base">{landingContent.finalCta.description}</LandingCopy>
        <div className="relative mt-8 flex w-full max-w-xl flex-col justify-center gap-3 sm:flex-row">
          <WhatsAppLink className="landing-cta inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-white px-6 text-sm font-black text-[#084B2B] shadow-xl shadow-black/20 ring-1 ring-white/20 outline-none transition-all duration-300 hover:-translate-y-1 hover:bg-[#FBF6E2] hover:shadow-[0_0_32px_rgba(212,175,55,0.26)] focus-visible:ring-4 focus-visible:ring-[#D4AF37]/45" eventName="final_diagnostic_click" intent="diagnostic" label="final_diagnostic">
            {landingContent.finalCta.primary}
          </WhatsAppLink>
          <WhatsAppLink className="landing-cta inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-white/25 bg-white/5 px-6 text-sm font-black text-white shadow-lg shadow-black/20 ring-1 ring-white/20 outline-none backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-white/10 hover:shadow-[0_0_28px_rgba(255,255,255,0.12)] focus-visible:ring-4 focus-visible:ring-white/25" eventName="hero_free_lesson_click" intent="freeLesson" label="final_free_lesson">
            {landingContent.finalCta.secondary}
          </WhatsAppLink>
        </div>
        <LandingCopy className="relative mt-5 text-xs font-bold text-emerald-100/65">{landingContent.finalCta.note}</LandingCopy>
      </div>
    </section>
  );
}
