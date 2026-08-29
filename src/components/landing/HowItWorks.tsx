import { ArrowDown, Compass, ScanSearch, TrendingUp } from 'lucide-react';
import { WhatsAppLink } from '@/components/landing/ConversionLink';
import { LandingCopy } from '@/components/landing/LandingCopy';
import { landingContent } from '@/lib/landing/content';

const icons = [ScanSearch, Compass, TrendingUp] as const;

export function HowItWorks() {
  return (
    <section className="bg-[#F1F5EF] py-20 sm:py-28" aria-labelledby="how-title">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <LandingCopy className="text-xs font-black uppercase tracking-[0.18em] text-[#0F6E41]">{landingContent.howItWorks.eyebrow}</LandingCopy>
          <LandingCopy as="h2" className="mt-4 text-balance text-3xl font-black tracking-tight text-[#042D1A] sm:text-5xl">{landingContent.howItWorks.title}</LandingCopy>
        </div>
        <ol className="relative mt-12 grid gap-4 lg:grid-cols-3">
          {landingContent.howItWorks.steps.map((step, index) => {
            const Icon = icons[index];
            return (
              <li className="relative min-w-0 rounded-3xl border border-emerald-950/10 bg-white p-6 sm:p-8" key={step.label.en}>
                <div className="flex items-center justify-between gap-4">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-[#084B2B] text-[#E7CD78]"><Icon aria-hidden="true" className="size-5" /></span>
                  <span className="text-5xl font-black text-emerald-950/5">0{index + 1}</span>
                </div>
                <LandingCopy className="mt-7 block text-[10px] font-black uppercase tracking-[0.16em] text-[#0F6E41]">{step.label}</LandingCopy>
                <LandingCopy as="h3" className="mt-2 text-2xl font-black text-[#042D1A]">{step.title}</LandingCopy>
                <LandingCopy as="p" className="mt-3 text-sm leading-7 text-slate-600">{step.description}</LandingCopy>
                {index < 2 ? <span aria-hidden="true" className="absolute -bottom-3 left-1/2 z-10 flex size-7 -translate-x-1/2 items-center justify-center rounded-full border border-emerald-950/10 bg-[#FBF6E2] text-[#8A6A16] lg:-right-[1.05rem] lg:bottom-auto lg:left-auto lg:top-1/2 lg:translate-x-0 lg:-translate-y-1/2 lg:-rotate-90 rtl:lg:-left-[1.05rem] rtl:lg:right-auto"><ArrowDown className="size-3.5" /></span> : null}
              </li>
            );
          })}
        </ol>
        <div className="mt-9 flex justify-center">
          <WhatsAppLink className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#084B2B] px-7 text-sm font-black text-white outline-none hover:-translate-y-0.5 hover:bg-[#0F6E41] focus-visible:ring-4 focus-visible:ring-emerald-200" eventName="hero_diagnostic_click" intent="diagnostic" label="how_it_works">
            {landingContent.howItWorks.cta}
          </WhatsAppLink>
        </div>
      </div>
    </section>
  );
}
