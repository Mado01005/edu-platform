import { CheckCircle2 } from 'lucide-react';
import { WhatsAppLink } from '@/components/landing/ConversionLink';
import { LandingCopy } from '@/components/landing/LandingCopy';
import { landingContent } from '@/lib/landing/content';

export function FinalCTASection() {
  return (
    <section className="px-4 pb-20 pt-8 text-white sm:px-6 sm:pb-28 lg:px-8">
      <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center overflow-hidden rounded-[2.25rem] bg-[#084B2B] px-5 py-14 text-center sm:px-10 sm:py-20">
        <div aria-hidden="true" className="absolute -left-20 -top-20 size-64 rounded-full border-[52px] border-white/5" />
        <div aria-hidden="true" className="absolute -bottom-24 -right-20 size-72 rounded-full border-[42px] border-[#D4AF37]/10" />
        <CheckCircle2 aria-hidden="true" className="relative size-10 text-[#E7CD78]" />
        <LandingCopy className="relative mt-5 text-xs font-black uppercase tracking-[0.18em] text-[#E7CD78]">{landingContent.finalCta.eyebrow}</LandingCopy>
        <LandingCopy as="h2" className="relative mt-4 max-w-4xl text-balance text-3xl font-black tracking-tight sm:text-5xl">{landingContent.finalCta.title}</LandingCopy>
        <LandingCopy as="p" className="relative mt-5 max-w-2xl text-sm leading-7 text-emerald-100/80 sm:text-base">{landingContent.finalCta.description}</LandingCopy>
        <div className="relative mt-8 flex w-full max-w-xl flex-col justify-center gap-3 sm:flex-row">
          <WhatsAppLink className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-white px-6 text-sm font-black text-[#084B2B] outline-none hover:-translate-y-0.5 hover:bg-[#FBF6E2] focus-visible:ring-4 focus-visible:ring-[#D4AF37]/45" eventName="final_diagnostic_click" intent="diagnostic" label="final_diagnostic">
            {landingContent.finalCta.primary}
          </WhatsAppLink>
          <WhatsAppLink className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-white/25 bg-white/5 px-6 text-sm font-black text-white outline-none hover:-translate-y-0.5 hover:bg-white/10 focus-visible:ring-4 focus-visible:ring-white/25" eventName="hero_free_lesson_click" intent="freeLesson" label="final_free_lesson">
            {landingContent.finalCta.secondary}
          </WhatsAppLink>
        </div>
        <LandingCopy className="relative mt-5 text-xs font-bold text-emerald-100/65">{landingContent.finalCta.note}</LandingCopy>
      </div>
    </section>
  );
}

